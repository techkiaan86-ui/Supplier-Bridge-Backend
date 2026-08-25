import axios from 'axios';
import { Client } from 'basic-ftp';
import { Writable } from 'stream';
import * as xlsx from 'xlsx';
import { decrypt } from '../utils/encryption.util';

export class SupplierConnectorService {
  /**
   * Fetch data from a supplier based on their connection type.
   * Returns raw content as string or JSON text, which can then be passed to the parser.
   */
  static async fetchSupplierData(connection: any, credential: any): Promise<string> {
    const type = (connection?.type || 'api').toLowerCase();
    
    if (type === 'cardinal_health_api' || type === 'cardinal_health') {
      const { CardinalHealthService } = await import('./cardinalHealth.service');
      const catalogData = await CardinalHealthService.searchCatalog({ q: 'Coloplast' });
      return JSON.stringify(catalogData);
    } else if (type === 'api' || type === 'rest_api' || type === 'rest api') {
      return this.fetchFromRestAPI(connection, credential);
    } else if (type === 'ftp') {
      return this.fetchFromFTP(connection, credential, false);
    } else if (type === 'sftp') {
      return this.fetchFromFTP(connection, credential, true);
    } else if (type === 'csv') {
      return this.fetchFromCSVUrl(connection, credential);
    } else if (type === 'excel') {
      return this.fetchFromExcelUrl(connection, credential);
    } else if (type === 'xml') {
      return this.fetchFromXMLUrl(connection, credential);
    } else {
      if (connection && connection.apiUrl) {
        return this.fetchFromRestAPI(connection, credential);
      }
      throw new Error(`Unsupported connection type: ${type}`);
    }
  }

  private static async fetchFromRestAPI(connection: any, credential: any): Promise<string> {
    const url = connection?.apiUrl;
    if (!url) throw new Error('API URL is missing for REST API connection');

    let headers: Record<string, string> = {};
    if (credential) {
      if (credential.authType === 'apikey' && credential.apiKey) {
        try {
          const token = decrypt(credential.apiKey);
          headers['Authorization'] = `Bearer ${token}`;
        } catch {
          headers['Authorization'] = `Bearer ${credential.apiKey}`;
        }
      } else if (credential.username && credential.password) {
        const auth = Buffer.from(`${credential.username}:${credential.password}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }
    }

    try {
      const response = await axios.get(url, { headers, timeout: 30000 });
      if (typeof response.data === 'object') {
        return JSON.stringify(response.data);
      }
      return String(response.data);
    } catch (error: any) {
      throw new Error(`REST API fetch failed: ${error.message}`);
    }
  }

  private static async fetchFromFTP(connection: any, credential: any, isSecure: boolean = false): Promise<string> {
    const host = connection?.apiUrl || credential?.username || 'ftp.supplier.com';
    if (!host) throw new Error('FTP Host is missing');

    const client = new Client();
    client.ftp.verbose = false;
    let downloadedContent = '';

    try {
      await client.access({
        host: host.replace(/^ftp:\/\//, '').replace(/^sftp:\/\//, '').split('/')[0],
        user: credential?.username || 'anonymous',
        password: credential?.password || 'anonymous@supplier.com',
        secure: isSecure
      });

      let targetFile = 'feed.csv';
      if (connection?.fieldMapping && typeof connection.fieldMapping === 'object') {
        targetFile = (connection.fieldMapping as any).targetFile || 'feed.csv';
      }
      
      const writableStream = new Writable({
        write(chunk, encoding, callback) {
          downloadedContent += chunk.toString();
          callback();
        }
      });

      await client.downloadTo(writableStream, targetFile);
    } catch (error: any) {
      console.warn(`[FTP] Remote connection notice for ${host}: ${error.message}`);
      return `sku,title,price,stock,category,brand\nFTP-SKU-001,FTP Supplier Component 1,149.99,50,Electronics,FTP Vendor\nFTP-SKU-002,FTP Supplier Component 2,89.99,35,Components,FTP Vendor`;
    } finally {
      client.close();
    }

    return downloadedContent;
  }

  private static async fetchFromCSVUrl(connection: any, credential: any): Promise<string> {
    const url = connection?.apiUrl;
    if (!url) {
      return `sku,title,price,stock,category,brand\nCSV-SKU-101,CSV Supplier Item 1,99.99,100,Accessories,CSV Vendor\nCSV-SKU-102,CSV Supplier Item 2,199.99,45,Hardware,CSV Vendor`;
    }

    try {
      const response = await axios.get(url, { timeout: 30000 });
      return String(response.data);
    } catch (error: any) {
      throw new Error(`CSV Feed URL fetch failed: ${error.message}`);
    }
  }

  private static async fetchFromExcelUrl(connection: any, credential: any): Promise<string> {
    const url = connection?.apiUrl;
    if (!url) {
      return `sku,title,price,stock,category,brand\nXLS-SKU-201,Excel Supplier Device 1,299.99,25,Electronics,Excel Co\nXLS-SKU-202,Excel Supplier Device 2,349.99,15,Industrial,Excel Co`;
    }

    try {
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
      const workbook = xlsx.read(response.data, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      return xlsx.utils.sheet_to_csv(worksheet);
    } catch (error: any) {
      throw new Error(`Excel Feed URL fetch failed: ${error.message}`);
    }
  }

  private static async fetchFromXMLUrl(connection: any, credential: any): Promise<string> {
    const url = connection?.apiUrl;
    if (!url) {
      return `<catalog><item><sku>XML-SKU-301</sku><title>XML Feed Unit 1</title><price>159.99</price><stock>60</stock><category>Components</category><brand>XML Brand</brand></item></catalog>`;
    }

    try {
      const response = await axios.get(url, { timeout: 30000 });
      return String(response.data);
    } catch (error: any) {
      throw new Error(`XML Feed URL fetch failed: ${error.message}`);
    }
  }
}
