const fetch = require('node-fetch');

async function test() {
  const roleId = '4538deaf-5682-44b6-bbc9-665c076f5a3f'; // administrator
  
  console.log('Sending PUT request...');
  const putRes = await fetch(`http://localhost:5000/api/roles/${roleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'administrator', permissions: ['dashboard', 'suppliers'] })
  });
  const putData = await putRes.json();
  console.log('PUT response:', putData.data.role.permissions);
  
  console.log('Sending GET request...');
  const getRes = await fetch('http://localhost:5000/api/roles');
  const getData = await getRes.json();
  const adminRole = getData.data.roles.find(r => r.name === 'administrator');
  console.log('GET response for administrator permissions:', adminRole.permissions);
}
test().catch(console.error);
