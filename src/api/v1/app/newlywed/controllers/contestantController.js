// src/api/v1/app/newlywed/controllers/contestantController.js
import scoreboardModel from '../../../../../models/scoreboard.js';
import socketService from '../../../../../services/socketService.js';

// Contestant controller for managing contestant-related functions
class ContestantController {

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