// src/services/socketService.js
import scoreboardModel from '../models/scoreboard.js';
// Import admin credentials
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

class SocketService {
  static io = null;
  static connectedClients = new Map(); // Track connected clients

  constructor(io) {
    SocketService.io = io;
    this.io = io;
    this.setupListeners();
    console.log('Socket.io service initialized');
  }

  setupListeners() {
    this.io.on('connection', (socket) => {
      // Add to connected clients tracking
      SocketService.connectedClients.set(socket.id, {
        id: socket.id,
        connected: new Date(),
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'],
        type: 'unknown', // Will be updated if client identifies
        lastActivity: new Date()
      });
      
      console.log(`Client connected: ${socket.id}`);

      // Send initial data
      socket.on('getScoreboard', async () => {
        try {
          // Update last activity timestamp
          const client = SocketService.connectedClients.get(socket.id);
          if (client) {
            client.lastActivity = new Date();
            client.type = 'scoreboard-viewer';
            SocketService.connectedClients.set(socket.id, client);
          }
          
          // Get latest data from database
          await scoreboardModel.initialize();
          const data = await scoreboardModel.getData();

          // Send to the requesting client
          socket.emit('scoreboard:data', {
            teams: data.teams || [],
            round: data.round,
            mode: data.mode
          });

        } catch (error) {
          console.error('Error sending scoreboard data:', error);
        }
      });

      // Client identification
      socket.on('identify', (clientInfo) => {
        const client = SocketService.connectedClients.get(socket.id);
        if (client) {
          client.type = clientInfo.type || 'unknown';
          client.name = clientInfo.name || 'anonymous';
          client.lastActivity = new Date();
          SocketService.connectedClients.set(socket.id, client);
          console.log(`Client identified: ${socket.id} as ${client.type}`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        // Remove from tracking
        SocketService.connectedClients.delete(socket.id);
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
    
    // Set up periodic cleanup of stale connections
    setInterval(() => this.cleanupStaleConnections(), 5 * 60 * 1000); // Every 5 minutes
  }

  // Remove connections that haven't been active for a while
  cleanupStaleConnections() {
    const now = new Date();
    let removed = 0;
    
    for (const [id, client] of SocketService.connectedClients.entries()) {
      // If inactive for more than 30 minutes, remove
      if ((now - client.lastActivity) > 30 * 60 * 1000) {
        SocketService.connectedClients.delete(id);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`Removed ${removed} stale socket connections`);
    }
  }

  async handleScoreboardUpdate(data) {
    try {
      const result = await scoreboardModel.updateScoreboard(data);
      this.io.emit('scoreboardData', result);
    } catch (error) {
      console.error('Error updating scoreboard:', error);
    }
  }

  async handleQuestionUpdate(question) {
    try {
      const updatedQuestion = await scoreboardModel.updateQuestion(question);
      this.io.emit('question:update', { question: updatedQuestion });
    } catch (error) {
      console.error('Error updating question:', error);
    }
  }
  
  // Static method to get socket statistics
  static getSocketStats() {
    // Count clients by type
    const clientTypes = {};
    SocketService.connectedClients.forEach(client => {
      const type = client.type || 'unknown';
      clientTypes[type] = (clientTypes[type] || 0) + 1;
    });
    
    // Get list of clients with basic info
    const clients = Array.from(SocketService.connectedClients.values()).map(client => ({
      id: client.id.substring(0, 8) + '...', // Truncate for privacy
      type: client.type || 'unknown',
      connected: client.connected,
      lastActivity: client.lastActivity,
      ip: client.ip.replace(/::ffff:/, ''), // Clean IPv6-mapped IPv4 addresses
      inactive: Math.round((new Date() - client.lastActivity) / 1000) // seconds
    }));
    
    return {
      totalConnections: SocketService.connectedClients.size,
      byType: clientTypes,
      clients: clients
    };
  }
}

export default SocketService;