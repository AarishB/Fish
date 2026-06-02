import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { registerSocketHandlers } from './socketHandler';

const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://www.fishcardgame.com',
  'https://fish-client-couxs76n1-aarishbs-projects.vercel.app',
];

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
});

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Fish server running on port ${PORT}`);
  console.log(`Accepting connections from: ${ALLOWED_ORIGINS.join(', ')}`);
});
