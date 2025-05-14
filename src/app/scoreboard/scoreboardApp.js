// src/app/scoreboard/scoreboardApp.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from '../../config/index.js';

// Import app modules
import scoreboardApp from '../../api/v1/app/scoreboard/index.js';

// Get current file directory with ES modules (replacement for __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Creates and configures the Express application
 * @returns {Object} - Configured Express app
 */
function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files
  app.use(express.static(join(__dirname, '..', '..', '..', 'public')));

  // Register API routes
  scoreboardApp.init(app);

  // Page routes
  app.get('/app/scoreboard/scoreboard', (req, res) => {
    res.sendFile(join(__dirname, '..', '..', '..', 'public/scoreboard', 'scoreboard.html'));
  });

  app.get('/app/scoreboard/contestant', (req, res) => {
    res.sendFile(join(__dirname, '..', '..', '..', 'public/scoreboard', 'contestant.html'));
  });

  app.get('/admin', (req, res) => {
    res.sendFile(join(__dirname, '..', '..', '..', 'public/scoreboard', 'admin.html'));
  });

  app.get('/app/scoreboard/questions', (req, res) => {
    res.sendFile(join(__dirname, '..', '..', '..', 'public/scoreboard', 'questions.html'));
  });


  // 404 handler
  app.use((req, res) => {
    res.status(404).send('Not Found');
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Server Error');
  });

  return app;
}

export default createApp;