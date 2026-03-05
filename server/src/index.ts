import express from 'express';
import cors from 'cors';
import path from 'path';
import { runMigrations } from './db/migrations';
import authRoutes from './routes/auth';
import blindStructureRoutes from './routes/blindStructures';
import tournamentRoutes from './routes/tournaments';
import playerRoutes from './routes/players';
import entryRoutes from './routes/entries';
import tableRoutes from './routes/tables';
import payoutRoutes from './routes/payouts';
import ticketRoutes from './routes/tickets';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Run migrations
runMigrations();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/blind-structures', blindStructureRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/tournaments', entryRoutes);
app.use('/api/tournaments', tableRoutes);
app.use('/api/tournaments', payoutRoutes);
app.use('/api/tournaments', ticketRoutes);

// Health check (no auth)
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Serve frontend in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const HOST = process.env.HOST || '0.0.0.0';
app.listen(Number(PORT), HOST, () => {
  console.log(`Poker Tournament Manager server running on http://${HOST}:${PORT}`);
});
