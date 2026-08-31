const fetch = require('node-fetch');
fetch('http://localhost:5000/api/roles/12d44937-a825-46ec-b595-921279f8a9ce', { method: 'OPTIONS' })
  .then(r => console.log('Status:', r.status, 'Methods:', r.headers.get('access-control-allow-methods')))
  .catch(console.error);
