import axios from 'axios';
import { Client } from 'basic-ftp';
import { Writable } from 'stream';
import { decrypt } from '../utils/encryption.util';

export class SupplierConnectorService {
  /**
   * Fetch data from a supplier based on their connection type.
   * Returns the raw content as a string, which can then be passed to the parser.
   */
  static async fetchSupplierData(connection: any, credential: any): Promise<string> {
    const type = connection.type.toLowerCase();
    
    if (type === 'cardinal_health_api' || type === 'cardinal_health') {
      const { CardinalHealthService } = await import('./cardinalHealth.service');
      const catalogData = await CardinalHealthService.searchCatalog({ q: 'Coloplast' });
      return JSON.stringify(catalogData);
    } else if (type === 'api') {
      return this.fetchFromRestAPI(connection, credential);
    } else if (type === 'ftp') {
      return this.fetchFromFTP(connection, credential);
    } else {
      throw new Error(`Unsupported connection type for automated fetch: ${type}`);
    }
  }

  private static async fetchFromRestAPI(connection: any, credential: any): Promise<string> {
    const url = connection.apiUrl;
    if (!url) throw new Error('API URL is missing for REST API connection');

    let headers: Record<string, string> = {};
    if (credential) {
      if (credential.authType === 'apikey' && credential.apiKey) {
        // Assume bearer token or API key header. Adjust based on specific supplier needs or mapping.
        const token = decrypt(credential.apiKey);
        headers['Authorization'] = `Bearer ${token}`;
      } else if (credential.authType === 'basic' && credential.username && credential.password) {
        const auth = Buffer.from(`${credential.username}:${credential.password}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }
    }

    try {
      const response = await axios.get(url, {
        headers,
        timeout: 30000, // 30s timeout
      });
      
      if (typeof response.data === 'object') {
        return JSON.stringify(response.data);
      }
      return String(response.data);
    } catch (error: any) {
      throw new Error(`REST API fetch failed: ${error.message}`);
    }
  }

  private static async fetchFromFTP(connection: any, credential: any): Promise<string> {
    const host = connection.apiUrl; // using apiUrl field for ftp host
    if (!host) throw new Error('FTP Host is missing');

    const client = new Client();
    client.ftp.verbose = false;

    let downloadedContent = '';

    try {
      await client.access({
        host: host,
        user: credential?.username || 'anonymous',
        password: credential?.password || 'anonymous@example.com',
        secure: false // Set to true for explicit FTPS
      });

      // Simple implementation: fetch a specific file defined in mapping or a default name
      let targetFile = 'feed.csv';
      if (connection.fieldMapping && typeof connection.fieldMapping === 'object' && !Array.isArray(connection.fieldMapping)) {
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
      throw new Error(`FTP fetch failed: ${error.message}`);
    } finally {
      client.close();
    }

    return downloadedContent;
  }
}
