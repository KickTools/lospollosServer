// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { adminCredentials } from '../config/index.js';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export function authenticateSupabaseJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET);
    req.user = payload; // Add user info to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

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