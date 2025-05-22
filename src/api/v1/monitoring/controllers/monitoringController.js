import SocketService from "../../../../services/socketService.js";
import { supabase } from "../../../../models/supabase.js";
import { logger } from "../../../../utils/logger.js";
import os from "os";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// Table name for logs in Supabase
const LOGS_TABLE = 'api_logs';

// Logs directory
const logsDir = path.join(dirname(__dirname), "../../../../logs");


/**
 * Get basic health status (public endpoint)
 */
export const getBasicHealth = async (req, res) => {
  try {
    // Simple status check
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString()
    };

    return res.json(health);
  } catch (error) {
    logger.error("Error in basic health check", { error: error.message });
    return res.status(500).json({
      status: "error",
      message: "Error retrieving health status"
    });
  }
};

/**
 * Get detailed health status (protected endpoint)
 */
export const getDetailedHealth = async (req, res) => {
  try {
    // Get system information
    const systemInfo = {
      uptime: Math.floor(process.uptime()), // Server uptime in seconds
      memory: {
        total: Math.round(os.totalmem() / (1024 * 1024)), // Total memory in MB
        free: Math.round(os.freemem() / (1024 * 1024)),   // Free memory in MB
        usage: Math.round((1 - os.freemem() / os.totalmem()) * 100) // Memory usage percentage
      },
      cpu: {
        model: os.cpus()[0].model,
        cores: os.cpus().length,
        loadAvg: os.loadavg()
      },
      hostname: os.hostname(),
      platform: os.platform(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };

    // Check Supabase connectivity
    let dbStatus = "healthy";
    try {
      const { error } = await supabase.from(LOGS_TABLE).select('id').limit(1);
      if (error) {
        dbStatus = "unhealthy";
        logger.error("Supabase connectivity issue", { error: error.message });
      }
    } catch (error) {
      dbStatus = "unhealthy";
      logger.error("Supabase connectivity issue", { error: error.message });
    }

    // Get disk space info for logs directory
    let diskSpace = {};
    try {
      // This is a simplified check - for Windows you might need a different approach
      const stats = await stat(logsDir);
      diskSpace = {
        logsDir,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      logger.warn("Could not get log directory stats", { error: error.message });
      diskSpace = { error: "Could not retrieve disk space information" };
    }

    // Count log files
    let logFiles = [];
    try {
      const files = await readdir(logsDir);
      const logFileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(logsDir, file);
          const fileStat = await stat(filePath);
          return {
            name: file,
            size: fileStat.size,
            created: fileStat.birthtime,
            modified: fileStat.mtime
          };
        })
      );
      logFiles = logFileStats;
    } catch (error) {
      logger.warn("Could not read log files", { error: error.message });
      logFiles = [{ error: "Could not retrieve log files" }];
    }

    // Get socket information
    const socketStats = SocketService.getSocketStats();

    // Then update the health object to include socket information:
    const health = {
      status: dbStatus === "healthy" ? "healthy" : "degraded",
      services: {
        database: dbStatus,
        api: "healthy",
        sockets: {
          status: "healthy",
          connections: socketStats.totalConnections
        }
      },
      system: systemInfo,
      storage: {
        diskSpace,
        logFiles: logFiles.length,
        logFilesDetails: logFiles.slice(0, 10) // Show only first 10 files
      }
    };

    return res.json(health);
  } catch (error) {
    logger.error("Error in detailed health check", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      status: "error",
      message: "Error retrieving detailed health status",
      error: error.message
    });
  }
};

/**
 * Get activity logs from Supabase database
 */
export const getLogs = async (req, res) => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const level = req.query.level || null;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const search = req.query.search || null;

    // Build query
    let query = supabase.from(LOGS_TABLE).select('*', { count: 'exact' });

    // Apply filters
    if (level) {
      query = query.eq('level', level);
    }

    if (startDate) {
      query = query.gte('timestamp', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('timestamp', endDate.toISOString());
    }

    if (search) {
      query = query.ilike('message', `%${search}%`);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      logger.error("Error retrieving logs from database", { error: error.message });
      return res.status(500).json({
        success: false,
        message: "Error retrieving logs",
        error: error.message
      });
    }

    // Calculate pagination
    const totalPages = Math.ceil(count / limit);

    return res.json({
      success: true,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages
      },
      logs: data
    });
  } catch (error) {
    logger.error("Error retrieving logs", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Error retrieving logs",
      error: error.message
    });
  }
};

/**
 * Get log file content
 */
export const getLogFile = async (req, res) => {
  try {
    const { filename } = req.params;

    // Security check to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(logsDir, sanitizedFilename);

    // Check if file exists
    try {
      await stat(filePath);
    } catch (error) {
      logger.warn("Log file not found", { filename: sanitizedFilename });
      return res.status(404).json({
        success: false,
        message: "Log file not found"
      });
    }

    // Read file content
    const content = await readFile(filePath, 'utf8');

    // Parse log entries if it's a JSON log
    let logs = [];
    if (sanitizedFilename.endsWith('.log')) {
      try {
        // For JSON logs with one log per line
        logs = content.split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch (e) {
              return { raw: line };
            }
          });
      } catch (error) {
        // If parsing fails, return raw content
        return res.json({
          success: true,
          filename: sanitizedFilename,
          raw: content
        });
      }
    } else {
      // For non-log files, return raw content
      return res.json({
        success: true,
        filename: sanitizedFilename,
        raw: content
      });
    }

    return res.json({
      success: true,
      filename: sanitizedFilename,
      logs
    });
  } catch (error) {
    logger.error("Error retrieving log file", {
      error: error.message,
      stack: error.stack,
      filename: req.params.filename
    });
    return res.status(500).json({
      success: false,
      message: "Error retrieving log file",
      error: error.message
    });
  }
};

// Get ssocket connections statistics
export const getSocketStats = async (req, res) => {
  try {
    const stats = SocketService.getSocketStats();

    return res.json({
      success: true,
      connections: stats
    });
  } catch (error) {
    logger.error("Error retrieving socket statistics", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Error retrieving socket statistics",
      error: error.message
    });
  }
};