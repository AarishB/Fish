import express from 'express';
import cors from 'cors';
import path from 'node:path';

export const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://www.fishcardgame.com',
  'https://fish-client-couxs76n1-aarishbs-projects.vercel.app',
];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Serve built client in production
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});
