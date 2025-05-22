// src/app/newlywed/scoreboardApp.js
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from '../../utils/logger.js';

// Import app modules
import scoreboardApp from '../../api/v1/app/newlywed/index.js';

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

  // Set allowed origins based on environment
  let allowedOrigins;
  if (process.env.NODE_ENV === 'production') {
    allowedOrigins = [
      'https://www.lospollostv.app',
      'https://lospollostv.app'
    ];
  } else {
    allowedOrigins = ['http://localhost:3000', 'http://localhost:4000'];
  }

  // Serve static files
  app.use(express.static(join(__dirname, '..', '..', '..', 'public')));

  // CORS middleware
  app.use(cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        logger.warn('CORS blocked request', { origin });
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  app.use(express.urlencoded({ extended: true }));

  // Register API routes
  scoreboardApp.init(app);

  // Page routes
  app.get('/app/newlywed/scoreboard', (req, res) => {
    logger.debug('Scoreboard page requested', { ip: req.ip });
    res.sendFile(join(__dirname, '..', '..', '..', 'public/scoreboard', 'scoreboard.html'));
  });

  app.get('/app/newlywed/contestant', (req, res) => {
    logger.debug('Contestant page requested', { ip: req.ip });
    res.sendFile(join(__dirname, '..', '..', '..', 'public/scoreboard', 'contestant.html'));
  });

  app.get('/admin', (req, res) => {
    logger.debug('Admin page requested', { ip: req.ip });
    res.sendFile(join(__dirname, '..', '..', '..', 'public/scoreboard', 'admin.html'));
  });

  app.get('/app/newlywed/questions', (req, res) => {
    logger.debug('Questions page requested', { ip: req.ip, url: req.url });
    res.sendFile(join(__dirname, '..', '..', '..', 'public/scoreboard', 'questions.html'));
  });

  // 404 handler
  app.use((req, res) => {
    logger.warn('404 Not Found', { url: req.url, method: req.method, ip: req.ip });
    res.status(404).send('Not Found');
  });

  // Error handler
  app.use((err, req, res, next) => {
    logger.error('Server Error', { 
      error: err.message, 
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    res.status(500).send('Server Error');
  });

  return app;
}

export default createApp;