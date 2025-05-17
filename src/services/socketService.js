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

      // Handle contestant events
      socket.on('score:update', this.handleContestantUpdate.bind(this));
      socket.on('scoreboard:update', this.handleScoreboardUpdate.bind(this));

      // Handle question events
      socket.on('question:display', this.handleQuestionUpdate.bind(this));
      socket.on('question:change', this.handleQuestionUpdate.bind(this));
      socket.on('choices:reveal', this.handleQuestionUpdate.bind(this));
      socket.on('answer:reveal', this.handleQuestionUpdate.bind(this));
      socket.on('answer:highlight', this.handleQuestionUpdate.bind(this));
      socket.on('answer:reset', this.handleQuestionUpdate.bind(this));
      socket.on('fact:display', this.handleQuestionUpdate.bind(this));
      socket.on('fact:change', this.handleQuestionUpdate.bind(this));
      socket.on('fact:reveal', this.handleQuestionUpdate.bind(this));

      socket.on('updateQuestion', this.handleQuestionUpdate.bind(this));
      socket.on('highlightAnswer', this.handleHighlightAnswer.bind(this));
      socket.on('resetHighlights', this.handleResetHighlights.bind(this));

      // Handle new question queue events
      socket.on('saveQueuedQuestion', this.handleSaveQueuedQuestion.bind(this));
      socket.on('getQueuedQuestions', this.handleGetQueuedQuestions.bind(this));
      socket.on('deleteQueuedQuestion', this.handleDeleteQueuedQuestion.bind(this));
      socket.on('clearQueuedQuestions', this.handleClearQueuedQuestions.bind(this));
      socket.on('markQuestionAsUsed', this.handleMarkQuestionAsUsed.bind(this));

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

  async handleSaveQueuedQuestion(questionData, callback) {
    try {
      const result = await scoreboardModel.saveQueuedQuestion(questionData);
      if (callback) callback(result);
    } catch (error) {
      console.error('Error saving queued question:', error);
      if (callback) callback({ error: 'Failed to save question' });
    }
  }

  async handleGetQueuedQuestions(data, callback) {
    try {
      const questions = await scoreboardModel.getQueuedQuestions();
      if (callback) callback({ questions });
    } catch (error) {
      console.error('Error getting queued questions:', error);
      if (callback) callback({ error: 'Failed to get questions' });
    }
  }

  async handleDeleteQueuedQuestion(data, callback) {
    try {
      await scoreboardModel.deleteQueuedQuestion(data.id);
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('Error deleting queued question:', error);
      if (callback) callback({ error: 'Failed to delete question' });
    }
  }

  async handleClearQueuedQuestions(data, callback) {
    try {
      await scoreboardModel.clearQueuedQuestions();
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('Error clearing queued questions:', error);
      if (callback) callback({ error: 'Failed to clear questions' });
    }
  }

  async handleMarkQuestionAsUsed(data, callback) {
    try {
      await scoreboardModel.markQuestionAsUsed(data.id);
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('Error marking question as used:', error);
      if (callback) callback({ error: 'Failed to mark question as used' });
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