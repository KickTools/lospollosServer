// src/middleware/authMiddleware.js
import { adminCredentials } from '../config';

// Middleware to authenticate admin API requests
const authenticateAdmin = (req, res, next) => {
  const { username, passcode } = req.body;
  
  if (username === adminCredentials.username &&
      passcode === adminCredentials.passcode) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

export default {
  authenticateAdmin
};