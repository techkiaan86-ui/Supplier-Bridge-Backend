const fetch = require('node-fetch');
const start = Date.now();
fetch('http://localhost:5000/api/roles')
  .then(() => console.log('GET /api/roles took', Date.now() - start, 'ms'))
  .catch(console.error);
