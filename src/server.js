// src/server.js
import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import morgan from 'morgan';
import createApp from './app/newlywed/scoreboardApp.js';
import config from './config/index.js';
import SocketService from './services/socketService.js';
import scoreboardModel from './models/scoreboard.js';
import { logger, logStream } from './utils/logger.js';
import LogCleanupService from './services/logCleanupService.js';

async function startServer() {
  try {
    // Initialize the scoreboard model
    await scoreboardModel.initialize();
    logger.info('Scoreboard data initialized successfully');

    // Create Express app
    const app = createApp();

    // Add HTTP request logging middleware
    app.use(morgan('combined', { stream: logStream }));

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.io
    const io = new SocketIOServer(server);

    // Initialize Socket service
    new SocketService(io);

    // Start log cleanup service
    const logCleanupService = new LogCleanupService();
    logCleanupService.start();

    // Start server
    const PORT = config.port;
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => handleShutdown(server, logCleanupService));
    process.on('SIGINT', () => handleShutdown(server, logCleanupService));
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

function handleShutdown(server, logCleanupService) {
  logger.info('Shutting down server gracefully');
  
  // Stop log cleanup service
  logCleanupService.stop();
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds if hanging
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

startServer();