import { ingestSupplierFeed } from './src/services/feedParser.service';

const csvData = `sku,title,price,stock,colour,material_type,weight
TESTSKU004,Test Product 4,120,30,Red,Cotton,10`;

ingestSupplierFeed('56c8056b-8a80-4820-910e-47554075d3a3', 'csv', 'test4.csv', csvData)
  .then(async (res) => {
    console.log('Result:', res);
    
    // Query variant to verify dynamicOptions
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const variant = await prisma.variant.findFirst({
        where: { sku: { contains: 'TESTSKU004' } }
    });
    console.log('Upserted Variant:', variant);
    
    const attrMappings = await prisma.attributeMapping.findMany({
        where: { supplierValue: { in: ['colour', 'material_type'] } }
    });
    console.log('Attribute Mappings:', attrMappings);

    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
