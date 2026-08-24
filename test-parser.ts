const { parseCSVFeed } = require('./src/services/feedParser.service.ts');
// Wait, we need ts-node to require ts file. Let's write a simple ts script.
import { parseCSVFeed } from './src/services/feedParser.service';
const csv = `supplier_sku,product_title,supplier_category,brand_name,short_description,cost_price,retail_price,currency,stock_qty,color,size,weight_kg,image_url
SUP-TSH-001,Premium Cotton T-Shirt,Men's Tops,UrbanFit,100% pure cotton breathable t-shirt for daily wear.,8.5,19.99,USD,150,Black,M,0.2,https://example.com/images/ts-blk-m.jpg`;
console.log(parseCSVFeed(csv));
