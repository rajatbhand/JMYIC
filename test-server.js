// Test script to verify server can start
console.log('Testing server startup...');

try {
  const server = require('./backend/server.js');
  console.log('✅ Server loaded successfully');
} catch (error) {
  console.error('❌ Server failed to load:', error.message);
  process.exit(1);
} 