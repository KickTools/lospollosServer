// src/api/v1/app/newlywed/controllers/contestantController.js
import scoreboardModel from '../../../../../models/scoreboard.js';
import socketService from '../../../../../services/socketService.js';

// Contestant controller for managing contestant-related functions
class ContestantController {
  /**
   * Gets all contestants
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllContestants(req, res) {
    try {
      const contestants = scoreboardModel.getContestants();
      res.json(contestants);
    } catch (error) {
      console.error('Error getting contestants:', error);
      res.status(500).json({ error: 'Failed to get contestants' });
    }
  }

  /**
   * Gets contestant by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getContestant(req, res) {
    try {
      const id = parseInt(req.params.id);
      const contestants = await scoreboardModel.getData().contestants;

      if (id >= 0 && id < contestants.length) {
        res.json(contestants[id]);
      } else {
        res.status(404).json({ error: 'Contestant not found' });
      }
    } catch (error) {
      console.error('Error getting contestant:', error);
      res.status(500).json({ error: 'Failed to get contestant' });
    }
  }

  /**
   * Creates a new contestant
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createContestant(req, res) {
    try {
      const { name } = req.body;
      const contestant = await scoreboardModel.createContestant(name);

      if (contestant) {
        res.status(201).json(contestant);
      } else {
        res.status(500).json({ error: 'Failed to create contestant' });
      }
    } catch (error) {
      console.error('Error creating contestant:', error);
      res.status(500).json({ error: 'Failed to create contestant' });
    }
  }

  /**
   * Deletes a contestant
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteContestant(req, res) {
    try {
      const id = parseInt(req.params.id);
      const contestants = await scoreboardModel.deleteContestant(id);
      res.json(contestants);
    } catch (error) {
      console.error('Error deleting contestant:', error);
      res.status(500).json({ error: 'Failed to delete contestant' });
    }
  }

  // Sends team score update to connected clients
  async sendTeamScoreUpdate(req, res) {
    try {
      const { score, teams } = req.body;
      const id = parseInt(req.params.id);
      
      // Emit individual score update for single team widgets
      socketService.io.emit('contestant:update', { id, score });
      
      // If we have the full teams array, send all teams data
      // This ensures all widgets get the latest data
      if (teams && Array.isArray(teams)) {
        // Get the current game settings
        const gameData = await scoreboardModel.getData();
        const mode = gameData.mode || teams.length;
        
        // Emit to all connected clients with all teams data
        socketService.io.emit('scoreboard:data', { 
          teams: teams,
          mode: mode
        });
      }

      // Respond to frontend
      res.json({ success: true, id, score });
    } catch (error) {
      console.error('Error emitting contestant update:', error);
      res.status(500).json({ error: 'Failed to emit contestant update' });
    }
  }
}

export default new ContestantController();