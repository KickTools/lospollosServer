// src/api/v1/monitoring/index.js
import express from 'express';
import * as monitoringController from './controllers/monitoringController.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/health', (req, res) => monitoringController.getBasicHealth(req, res));

// Protected endpoints (requires authentication)
router.get('/health/detailed', (req, res) => monitoringController.getDetailedHealth(req, res));
router.get('/logs', (req, res) => monitoringController.getLogs(req, res));
router.get('/logs/file/:filename', (req, res) => monitoringController.getLogFile(req, res));

// Add new socket statistics endpoint
router.get('/sockets', (req, res) => monitoringController.getSocketStats(req, res));

export default router;