// src/api/v1/app/newlywed/index.js
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
    app.use(`${basePath}/app/newlywed`, routes);
  }
}

export default new ScoreboardApp();