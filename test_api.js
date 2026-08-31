const fetch = require('node-fetch');
fetch('http://localhost:5000/api/roles')
  .then(r => r.json())
  .then(d => {
    const role = d.data.roles[0];
    console.log('Testing PUT for role:', role.id);
    return fetch('http://localhost:5000/api/roles/' + role.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: role.name, permissions: ['dashboard'] })
    })
    .then(r => r.json())
    .then(console.log);
  })
  .catch(console.error);
