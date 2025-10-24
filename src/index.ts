import app from './app';
import { config } from './config/env';
import { db } from './database/postgres';

const startServer = async () => {
  try {
    await db.query('SELECT NOW()');
    console.log('Database connected successfully');

    const server = app.listen(config.PORT, () => {
      console.log(`Server is running on port ${config.PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
    });

    const gracefulShutdown = async () => {
      console.log('Shutting down gracefully...');
      server.close(async () => {
        await db.close();
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

