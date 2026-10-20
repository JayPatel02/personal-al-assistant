import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config.js';
import apiRoutes from './routes/index.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
app.use('/uploads', express.static(CONFIG.UPLOADS_DIR));

// Mount API routes
app.use('/api', apiRoutes);

// If production build exists in dist, serve it
const distPath = path.join(CONFIG.ROOT_DIR, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start listening
app.listen(CONFIG.PORT, () => {
  console.log(`[API Server] Running on http://localhost:${CONFIG.PORT}`);
});
