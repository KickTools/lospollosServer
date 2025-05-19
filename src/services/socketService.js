// src/services/socketService.js
import scoreboardModel from '../models/scoreboard.js';
// Import admin credentials
import config from '../config/index.js';

class SocketService {
  static io = null;

  constructor(io) {
    SocketService.io = io;
    this.io = io;
    this.setupListeners();
    console.log('Socket.io service initialized');
  }

  setupListeners() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Send initial data
      socket.on('getScoreboard', async () => {
        try {
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

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
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
}

export default SocketService;