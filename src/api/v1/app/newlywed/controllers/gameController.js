// src/api/v1/app/newlywed/controllers/gameController.js
import scoreboardModel from '../../../../../models/scoreboard.js';
import socketService from '../../../../../services/socketService.js';

class GameController {
    /**
     * Updates the current round and game mode
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async sendRoundUpdate(req, res) {
        try {
            const { round, mode, teams } = req.body;

            // Validate required data
            if (round === undefined) {
                return res.status(400).json({ error: 'Round number is required' });
            }

            // Update the scoreboard model with the new round and mode if provided
            if (mode !== undefined) {
                await scoreboardModel.updateGameSettings({ round, mode });
            } else {
                await scoreboardModel.updateGameSettings({ round });
            }

            // Emit the updated round info to all connected clients
            socketService.io.emit('round:updated', { 
                round, 
                mode: mode || (await scoreboardModel.getData()).mode,
                teams: teams || (await scoreboardModel.getData()).contestants 
            });

            res.status(200).json({ message: 'Round updated successfully' });
        } catch (error) {
            console.error('Error updating round:', error);
            res.status(500).json({ error: 'Failed to update round' });
        }
    }
}

export default new GameController();