import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer, Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';

// Import rate limiters
import { generalLimiter, authLimiter } from './middlewares/rate-limiters';

// Import routes
import authRoutes from './routes/auth.routes';
import problemRoutes from './routes/problem.routes';
import competitionRoutes from './routes/competition.routes';
import teacherApplicationRoutes from './routes/teacher-application.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';

export function createApp(): { app: Application; httpServer: HTTPServer; io: SocketIOServer } {
  const app = express();
  const httpServer = createServer(app);

  // Socket.IO setup
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply general rate limiting to all requests
  app.use(generalLimiter);

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes with rate limiting
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/problems', problemRoutes);
  app.use('/api/competitions', competitionRoutes);
  app.use('/api/teacher-applications', teacherApplicationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      error: config.nodeEnv === 'development' ? err.message : 'Internal Server Error',
    });
  });

  return { app, httpServer, io };
}
