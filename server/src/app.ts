import express from 'express';
import cors from 'cors';
import path from 'node:path';

export const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://www.fishcardgame.com',
  'https://fish-client-couxs76n1-aarishbs-projects.vercel.app',
  'https://fish-client-swart.vercel.app'
];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ── Stripe ────────────────────────────────────────────────────────────────────
// TODO: replace stub with real Stripe Checkout session creation once
// STRIPE_SECRET_KEY and price IDs are configured in the environment.
app.post('/api/create-checkout-session', (_req, res) => {
  res.status(503).json({ error: 'Payments not yet configured.' });
});

// TODO: Stripe webhook handler goes here — verify signature, set isPlus = true in Firestore
app.post('/api/stripe-webhook', (_req, res) => {
  res.status(503).json({ error: 'Webhook not yet configured.' });
});

// Serve built client in production
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});
