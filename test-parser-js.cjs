const fs = require('fs');

function parseCSVFeed(csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const headerLine = lines[0].toLowerCase();
  const hasHeader = headerLine.includes('sku') || headerLine.includes('title') || headerLine.includes('name') || headerLine.includes('price');

  const headers = hasHeader
    ? lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase())
    : ['sku', 'title', 'price', 'stock', 'category', 'brand', 'imageurl'];

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const products = [];

  for (const line of dataLines) {
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length === 0) continue;

    const rowData = {};
    headers.forEach((h, idx) => {
      rowData[h] = cols[idx] || '';
    });

    const sku = rowData['sku'] || rowData['supplier_sku'] || cols[0];
    const title = rowData['title'] || rowData['product_title'] || cols[1];

    products.push({ sku, title, cols });
  }
  return products;
}

const csv = `supplier_sku,product_title,supplier_category,brand_name,short_description,cost_price,retail_price,currency,stock_qty,color,size,weight_kg,image_url
SUP-TSH-001,Premium Cotton T-Shirt,Men's Tops,UrbanFit,100% pure cotton breathable t-shirt for daily wear.,8.5,19.99,USD,150,Black,M,0.2,https://example.com/images/ts-blk-m.jpg`;

console.log(JSON.stringify(parseCSVFeed(csv), null, 2));
