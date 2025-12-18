import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config';
import authRoutes from './routes/auth';
import repositoryRoutes from './routes/repositories';
import activityRoutes from './routes/activities';
import ingestionRoutes from './routes/ingestion';
import summaryRoutes from './routes/summaries';

const app = express();

// CORS configuration
app.use(
  cors({
    origin: config.nodeEnv === 'production' ? false : 'http://localhost:5173',
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.nodeEnv === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// API Routes
app.use('/auth', authRoutes);
app.use('/repositories', repositoryRoutes);
app.use('/activities', activityRoutes);
app.use('/ingestion', ingestionRoutes);
app.use('/summaries', summaryRoutes);

// Serve static files from public directory (built frontend)
app.use(express.static('public'));

// Serve index.html for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Start server
app.listen(config.port, () => {
  console.log(`DevPulse server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

// Extend Express session types
declare module 'express-session' {
  interface SessionData {
    userId: number;
    githubUsername: string;
  }
}
