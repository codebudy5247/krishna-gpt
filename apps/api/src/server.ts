import app from './app';
import logger from './utils/logger';
import config from './config/env';

const { port, appName, nodeEnv } = config.get();

async function startServer() {
  try {
    // Start server
    app.listen(port, () => {
      logger.info(`${appName} is running`, {
        port,
        environment: nodeEnv
      });
      logger.info(`Health check: http://localhost:${port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

startServer();