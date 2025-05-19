// src/api/v1/app/newlywed/routes.js
import express from 'express';
import adminController from './controllers/adminController.js';
import contestantController from './controllers/contestantController.js';
import questionController from './controllers/questionController.js';
import gameController from './controllers/gameController.js';
const router = express.Router();

// Admin routes
router.post('/admin/login', adminController.login);
router.get('/admin/scoreboard', adminController.getScoreboard);
router.post('/admin/scoreboard', adminController.updateScoreboard);
router.post('/admin/score', adminController.updateScore);

// Game Settings routes
router.post('/round/update', gameController.sendRoundUpdate);

// Contestants routes
router.post('/contestants/:id/score', contestantController.sendTeamScoreUpdate);

// Questions routes - these routes
router.post('/questions/display', questionController.displayQuestion);
router.post('/questions/hide', questionController.hideQuestion);
router.post('/questions/show', questionController.showQuestion);
router.post('/questions/change', questionController.changeQuestion);
router.post('/questions/format', questionController.formatQuestion);
router.post('/questions/choices/reveal', questionController.revealChoices);
router.post('/questions/answer/reveal', questionController.revealAnswer);
router.post('/questions/answer/highlight', questionController.highlightAnswer);
router.post('/questions/answer/reset', questionController.resetAnswer);
router.post('/facts/display', questionController.displayFact);
router.post('/facts/change', questionController.changeFact);
router.post('/facts/reveal', questionController.revealFact);

export default router;