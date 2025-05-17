// src/app/newlywed/scoreboardApp.js
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
    allowedOrigins = ['http://localhost:3000'];
  }

  // CORS middleware
  app.use(cors({
    origin: function (origin, callback) {
      // For tools like Postman or server-to-server calls, origin may be undefined
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  app.use(express.urlencoded({ extended: true }));

  // Serve static files
  app.use(express.static(join(__dirname, '..', '..', '..', 'public')));

  // Register API routes
  scoreboardApp.init(app);

  // Page routes
  app.get('/app/newlywed/scoreboard', (req, res) => {
    res.sendFile(join(__dirname, '..', '..', '..', 'public/scoreboard', 'scoreboard.html'));
  });

  app.get('/app/newlywed/contestant', (req, res) => {
    res.sendFile(join(__dirname, '..', '..', '..', 'public/scoreboard', 'contestant.html'));
  });

  app.get('/admin', (req, res) => {
    res.sendFile(join(__dirname, '..', '..', '..', 'public/scoreboard', 'admin.html'));
  });

  app.get('/app/newlywed/questions', (req, res) => {
    res.sendFile(join(__dirname, '..', '..', '..', 'public/scoreboard', 'questions.html'));
  });

  app.get('api',)


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