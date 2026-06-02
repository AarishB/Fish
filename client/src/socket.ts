import { io } from 'socket.io-client';

// Singleton socket instance used throughout the app
export const socket = io(
  import.meta.env.VITE_SERVER_URL ?? 'https://fish-d9st.onrender.com',
  {
    autoConnect: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  }
);
