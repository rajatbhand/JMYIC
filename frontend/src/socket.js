import { io } from 'socket.io-client';

// Use environment variable for backend URL, fallback to deployed backend
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://jmyic.onrender.com';

const socket = io(BACKEND_URL, {
  autoConnect: true,
});

export default socket; 