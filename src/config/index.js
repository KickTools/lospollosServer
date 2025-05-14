// src/config/index.js
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Named exports for config values
export const port = process.env.PORT || 3000;
export const nodeEnv = process.env.NODE_ENV || 'development';
export const adminCredentials = {
  username: process.env.ADMIN_USERNAME || 'admin',
  passcode: process.env.ADMIN_PASSCODE || 'gameshow123'
};

// You can also add a default export with all config values
const config = {
  port,
  nodeEnv,
  adminCredentials
};

export default config;