import { createApp } from './app';
import { connectDatabase } from './config/database';
import { redis } from './config/redis';
import { config } from './config';
import { setupCompetitionSocket } from './socket/competition.socket';

async function bootstrap(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Test Redis connection
    await redis.ping();
    console.log('Redis ping successful');

    // Create Express app with Socket.IO
    const { httpServer, io } = createApp();

    // Setup Socket.IO handlers
    setupCompetitionSocket(io);

    // Start server
    httpServer.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Frontend URL: ${config.frontendUrl}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      await redis.quit();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
