import { io } from 'socket.io-client';

// Use environment variable for backend URL, fallback to deployed backend
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://jmyic.onrender.com';

console.log('Connecting to backend at:', BACKEND_URL);

const socket = io(BACKEND_URL, {
  autoConnect: true,
  timeout: 10000,
  transports: ['websocket', 'polling']
});

// Add connection event listeners for debugging
socket.on('connect', () => {
  console.log('✅ Connected to backend');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

export default socket; 