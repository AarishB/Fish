import { io } from 'socket.io-client';

// Connects to the production server; falls back to hardcoded URL if env var is missing
export const socket = io(
  import.meta.env.VITE_SERVER_URL ?? 'https://fish-d9st.onrender.com',
  {
    autoConnect: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  }
);
