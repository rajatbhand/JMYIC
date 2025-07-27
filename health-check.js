// Simple health check script
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 4000,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log('Response:', chunk.toString());
  });
});

req.on('error', (e) => {
  console.error(`Health check failed: ${e.message}`);
});

req.end(); 