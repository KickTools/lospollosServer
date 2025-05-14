// src/api/v1/app/scoreboard/controllers/adminController.js
import scoreboardModel from '../../../../../models/scoreboard.js';

// Admin controller for managing admin-related functions
class AdminController {
  /**
   * Authenticates an admin user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  login(req, res) {
    // Authentication is handled by middleware
    res.json({ success: true });
  }

  /**
   * Gets the current scoreboard data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getScoreboard(req, res) {
    try {
      const data = await scoreboardModel.getData();
      res.json(data);
    } catch (error) {
      console.error('Error getting scoreboard:', error);
      res.status(500).json({ error: 'Failed to get scoreboard data' });
    }
  }

  /**
   * Updates the entire scoreboard
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateScoreboard(req, res) {
    try {
      const data = req.body;
      const result = await scoreboardModel.updateScoreboard(data);
      res.json(result);
    } catch (error) {
      console.error('Error updating scoreboard:', error);
      res.status(500).json({ error: 'Failed to update scoreboard' });
    }
  }

  /**
   * Updates a contestant's score
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateScore(req, res) {
    try {
      const { id, score } = req.body;
      const result = await scoreboardModel.updateScore(id, score);
      
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: 'Contestant not found' });
      }
    } catch (error) {
      console.error('Error updating score:', error);
      res.status(500).json({ error: 'Failed to update score' });
    }
  }
}

export default new AdminController();