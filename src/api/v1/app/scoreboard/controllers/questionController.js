// src/api/v1/app/scoreboard/controllers/questionController.js
import scoreboardModel from '../../../../../models/scoreboard.js';

// Question controller for managing game questions
class QuestionController {
  /**
   * Gets the current question
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCurrentQuestion(req, res) {
    try {
      const question = await scoreboardModel.getCurrentQuestion();
      res.json({ question });
    } catch (error) {
      console.error('Error getting question:', error);
      res.status(500).json({ error: 'Failed to get current question' });
    }
  }

  /**
   * Updates the current question
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateQuestion(req, res) {
    try {
      const question = req.body;
      const result = await scoreboardModel.updateQuestion(question);
      res.json({ question: result });
    } catch (error) {
      console.error('Error updating question:', error);
      res.status(500).json({ error: 'Failed to update question' });
    }
  }

  /**
   * Highlights an answer 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  highlightAnswer(req, res) {
    const { answerIndex } = req.body;
    // This is handled via sockets but we also offer a REST endpoint
    res.json({ success: true, highlighted: answerIndex });
  }

  /**
   * Resets all highlighted answers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  resetHighlights(req, res) {
    // This is handled via sockets but we also offer a REST endpoint
    res.json({ success: true });
  }
}

export default new QuestionController();