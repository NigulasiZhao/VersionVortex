import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db/index';
import publicRoutes from './routes/public';
import adminRoutes from './routes/admin';
import jenkinsRoutes from './routes/jenkins';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// API routes (after DB is initialized)
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', jenkinsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  try {
    await initDb();
    console.log('Database initialized');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Admin credentials: admin / admin123`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
