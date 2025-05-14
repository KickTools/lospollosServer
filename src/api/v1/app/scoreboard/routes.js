// src/api/v1/app/scoreboard/routes.js
import express from 'express';
import adminController from './controllers/adminController.js';
import contestantController from './controllers/contestantController.js';
import questionController from './controllers/questionController.js';

const router = express.Router();

// Admin routes
router.post('/admin/login', adminController.login);
router.get('/admin/scoreboard', adminController.getScoreboard);
router.post('/admin/scoreboard', adminController.updateScoreboard);
router.post('/admin/score', adminController.updateScore);

// Contestant routes
router.get('/contestants', contestantController.getAllContestants);
router.get('/contestants/:id', contestantController.getContestant);
router.post('/contestants', contestantController.createContestant);
router.delete('/contestants/:id', contestantController.deleteContestant);

// Question routes
router.get('/questions/current', questionController.getCurrentQuestion);
router.post('/questions', questionController.updateQuestion);
router.post('/questions/highlight', questionController.highlightAnswer);
router.post('/questions/reset-highlights', questionController.resetHighlights);

export default router;