import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import groupsRouter from './routes/groups.js';
import scoresRouter from './routes/scores.js';
import configRouter from './routes/config.js';
import authRouter from './routes/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use(express.json({ limit: '50mb' }));

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.use(express.static(join(__dirname, '..', 'public')));

app.use('/api/auth', authRouter);
app.use('/api/config', configRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/scores', scoresRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'admin.html'));
});

// Painel DNA CF — ranking com identidade CF Contabilidade
app.get(['/dna-cf', '/dna', '/dnacf'], (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'dna-cf.html'));
});

app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

// Export para Vercel serverless — @vercel/node usa o app como handler
export default app;

// Escuta apenas fora do ambiente Vercel (desenvolvimento local)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🏆 Ranking Empresa Inquebrável rodando em http://localhost:${PORT}`);
    console.log(`📊 Ranking público: http://localhost:${PORT}`);
    console.log(`⚙️  Painel admin:   http://localhost:${PORT}/admin\n`);
  });
}
