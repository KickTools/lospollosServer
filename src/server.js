// src/server.js
import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import createApp from './app/newlywed/scoreboardApp.js';
import config from './config/index.js';
import SocketService from './services/socketService.js';
import scoreboardModel from './models/scoreboard.js';


async function startServer() {
  try {
    // Initialize the scoreboard model
    await scoreboardModel.initialize();
    console.log('Scoreboard data initialized successfully');

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.io
    const io = new SocketIOServer(server);

    // Initialize Socket service
    new SocketService(io);

    // Start server
    const PORT = config.port;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();