import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { supabase } from "../models/supabase.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";  // Added this import
import fs from "fs";

// Get current file directory with ES modules (replacement for __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, "..", "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, json } = winston.format;

// Table name for logs in Supabase
const LOGS_TABLE = 'api_logs';

// Custom format for readable logs
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0 && metadata.constructor === Object) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create a custom transport for Supabase
class SupabaseTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
    this.name = 'supabase';
    this.level = opts.level || 'info';
  }

  async log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    try {
      // Prepare metadata (strip circular references)
      const metadataObj = {};
      Object.keys(info).forEach(key => {
        if (key !== 'level' && key !== 'message' && key !== 'timestamp' && typeof info[key] !== 'function') {
          metadataObj[key] = info[key];
        }
      });

      // Format data for Supabase
      const logEntry = {
        timestamp: new Date(),
        level: info.level,
        message: info.message,
        metadata: metadataObj,
        expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      // Insert log into Supabase
      const { error } = await supabase
        .from(LOGS_TABLE)
        .insert([logEntry]);

      if (error) {
        console.error('Error writing log to Supabase:', error);
      }
    } catch (error) {
      console.error('Error in Supabase transport:', error);
    }

    if (callback) {
      callback();
    }
  }
}

// Daily Rotate File helper
const dailyRotateTransport = (filename, level) =>
  new DailyRotateFile({
    filename: path.join(logsDir, `${filename}-%DATE%.log`),
    datePattern: "YYYY-MM-DD",
    level,
    zippedArchive: false,
    maxSize: "20m",
    maxFiles: "7d" // Only keep 7 days of logs
  });

// Create logger
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), 
    json()
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), logFormat)
    }),
    // File transports with rotation
    dailyRotateTransport("error", "error"),
    dailyRotateTransport("warn", "warn"),
    dailyRotateTransport("info", "info"),
    dailyRotateTransport("http", "http"),
    dailyRotateTransport("debug", "debug"),
    // Supabase transport
    new SupabaseTransport({
      level: 'info' // Only send info and above to Supabase
    })
  ]
});

// For express/morgan HTTP logs
export const logStream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Add scheduled job to clean up old Supabase logs
export const cleanupOldLogs = async () => {
  try {
    const { error } = await supabase
      .from(LOGS_TABLE)
      .delete()
      .lt('expiration_date', new Date());
    
    if (error) {
      logger.error('Error cleaning up old logs', { error });
    } else {
      logger.info('Successfully cleaned up old logs');
    }
  } catch (error) {
    logger.error('Error in log cleanup routine', { error });
  }
};

// Convenience logger functions
export default {
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  http: (message, meta = {}) => logger.http(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta)
};