// src/services/socketService.js
import scoreboardModel from '../models/scoreboard.js';
// Import admin credentials
import config from '../config/index.js';

class SocketService {
  constructor(io) {
    this.io = io;
    this.setupListeners();
    
    console.log('Socket.io service initialized');
  }
  
  setupListeners() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Add admin login handler
      socket.on('adminLogin', (credentials, callback) => {
        // Check credentials against config
        const validLogin = credentials.username === config.adminCredentials.username && 
                          credentials.passcode === config.adminCredentials.passcode;
        
        console.log(`Login attempt: ${validLogin ? 'Success' : 'Failed'}`); // Add logging
                          
        if (validLogin) {
          // Successful login
          callback({ success: true });
        } else {
          // Failed login
          callback({ success: false });
        }
      });
      
      // Send initial data
      socket.on('getScoreboard', async () => {
        const data = await scoreboardModel.getData();
        socket.emit('scoreboardData', {
          contestants: data.contestants,
          round: data.round,
          mode: data.mode
        });
      });
      
      // Handle contestant events
      socket.on('updateScore', this.handleContestantUpdate.bind(this));
      socket.on('updateScoreboard', this.handleScoreboardUpdate.bind(this));
      
      // Handle question events
      socket.on('updateQuestion', this.handleQuestionUpdate.bind(this));
      socket.on('highlightAnswer', this.handleHighlightAnswer.bind(this));
      socket.on('resetHighlights', this.handleResetHighlights.bind(this));
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
  
  async handleContestantUpdate(data) {
    try {
      await scoreboardModel.updateScore(data.id, data.score);
      this.io.emit('contestant:update', {
        id: data.id,
        score: data.score
      });
    } catch (error) {
      console.error('Error updating contestant:', error);
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
  
  handleHighlightAnswer(data) {
    this.io.emit('question:highlight', data);
  }
  
  handleResetHighlights() {
    this.io.emit('question:reset-highlights');
  }
}

export default SocketService;