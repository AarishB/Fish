import { io } from 'socket.io-client';

// Singleton socket instance used throughout the app
export const socket = io(
  import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
  {
    autoConnect: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  }
);
