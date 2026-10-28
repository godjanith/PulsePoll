import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/db.js';
import { isMongoConnected, isMongoStorageEnabled } from './repositories/pollRepository.js';
import pollRoutes from './routes/pollRoutes.js';
import { registerPollSocketHandlers } from './sockets/pollSocket.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 5000;
const configuredOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000')
  .split(',').map((value) => value.trim()).filter(Boolean);
const clientOrigins = [...new Set([...configuredOrigins, `http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`])];
const io = new SocketIOServer(server, {
  cors: { origin: clientOrigins, methods: ['GET', 'POST'], credentials: true },
  pingInterval: 25000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1e6,
});
app.set('io', io);

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || clientOrigins.includes(origin)) return callback(null, true);
    const error = new Error('Origin is not allowed by the CORS policy.');
    error.status = 403;
    return callback(error);
  },
  credentials: true,
}));
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'PulsePoll API',
    storage: isMongoStorageEnabled() ? (isMongoConnected() ? 'mongodb' : 'mongodb-disconnected') : 'json-file',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
app.use('/api/polls', pollRoutes);
registerPollSocketHandlers(io);

// Serve the optimized React build when present; in development Vite serves the UI.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist, { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  await connectDB();
  server.listen(PORT, '0.0.0.0', () => {
    console.log('--------------------------------------------------');
    console.log(`PulsePoll API ready at http://localhost:${PORT}`);
    console.log(`Storage mode: ${isMongoStorageEnabled() ? 'MongoDB' : 'Local JSON file'}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log('--------------------------------------------------');
  });
};

const shutdown = async (signal) => {
  console.log(`[Server] ${signal} received. Shutting down...`);
  io.close();
  server.close(async () => {
    try {
      if (isMongoConnected()) {
        const mongoose = await import('mongoose');
        await mongoose.default.disconnect();
      }
    } catch (error) {
      console.error('[Server] Error while closing database:', error.message);
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  console.error('[Server] Could not start:', error);
  process.exit(1);
});

export { app, server, io };
