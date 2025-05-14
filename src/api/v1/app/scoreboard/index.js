// src/api/v1/app/scoreboard/index.js
import routes from './routes.js';

/**
 * Scoreboard App Module
 */
class ScoreboardApp {
  /**
   * Initialize the scoreboard app
   * @param {Object} app - Express app instance
   * @param {String} basePath - Base API path
   */
  init(app, basePath = '/api/v1') {
    // Register scoreboard routes
    app.use(`${basePath}/app/scoreboard`, routes);
    
    console.log(`Scoreboard app initialized at ${basePath}/app/scoreboard`);
  }
}

export default new ScoreboardApp();