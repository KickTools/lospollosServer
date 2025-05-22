// src/api/v1/app/scoreboard/controllers/questionController.js
import scoreboardModel from '../../../../../models/scoreboard.js';
import socketService from '../../../../../services/socketService.js';

class QuestionController {

  // Hide display (for both questions and facts)
  async hideDisplay(req, res) {
    try {
      const { contentId } = req.body; // Can be questionId or factId
      if (socketService.io) {
        socketService.io.emit('display:hide', { contentId });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error hiding display:', error);
      res.status(500).json({ error: 'Failed to hide display' });
    }
  }

  // Show display (for both questions and facts)
  async showDisplay(req, res) {
    try {
      const { contentId, contentType, isFreeResponse } = req.body; // contentType: 'question' or 'fact'
      if (socketService.io) {
        socketService.io.emit('display:show', {
          contentId,
          contentType: contentType || 'question', // Default to question if not specified
          isFreeResponse: isFreeResponse || false
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error showing display:', error);
      res.status(500).json({ error: 'Failed to show display' });
    }
  }

  // Hide question display
  async hideQuestion(req, res) {
    try {
      const { questionId } = req.body;
      // Notify connected clients via socket if needed
      if (socketService.io) {
        socketService.io.emit('question:hide', { questionId });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error hiding question:', error);
      res.status(500).json({ error: 'Failed to hide question' });
    }
  }

  // Show question display
  async showQuestion(req, res) {
    try {
      const { questionId } = req.body;
      // Notify connected clients via socket if needed
      if (socketService.io) {
        socketService.io.emit('question:show', { questionId });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error showing question:', error);
      res.status(500).json({ error: 'Failed to show question' });
    }
  }

  // Display question
  async displayQuestion(req, res) {
    try {
      const { question, questionId, roundId, teamId, type, isFreeResponse } = req.body;

      // Format the data correctly for the client
      const questionData = {
        questionId,
        question: question,
        roundId,
        team: teamId,
        type,
        isFreeResponse: isFreeResponse || roundId === 2 // Explicitly mark Free Response questions
      };

      // Notify connected clients via socket
      if (socketService.io) {
        socketService.io.emit('question:display', questionData);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error displaying question:', error);
      res.status(500).json({ error: 'Failed to display question' });
    }
  }

  // Changes question
  async changeQuestion(req, res) {
    try {
      const { questionId } = req.body;

      // Additional info may be needed to fetch the full question data
      // This is just a placeholder - you should fetch the actual question data
      const questionData = {
        questionId,
        question: "Question text would be fetched here",
        team: undefined // Default to undefined if teamId is not provided
      };

      // Notify connected clients via socket
      if (socketService.io) {
        socketService.io.emit('question:change', questionData);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error changing question:', error);
      res.status(500).json({ error: 'Failed to change question' });
    }
  }

  async formatQuestion(req, res) {
    try {
      const { roundType, isFreeResponse } = req.body;

      // Format data based on question type
      const formatData = {
        questionId: req.body.questionId,
        roundType: roundType || 1,
        isFreeResponse: isFreeResponse || false
      };

      // If free response, emit specific event
      if (isFreeResponse) {
        if (socketService.io) {
          socketService.io.emit('question:free_response', formatData);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error formatting question:', error);
      res.status(500).json({ error: 'Failed to format question' });
    }
  }

  // Reveals choices
  async revealChoices(req, res) {
    try {
      const { choices, roundType, isABChoice } = req.body;

      // Format data for the client based on round type
      const choicesData = {
        questionId: req.body.questionId,
        choices: choices || {},
        roundType: roundType || 1,
        isABChoice: isABChoice || false
      };

      // Notify connected clients via socket
      if (socketService.io) {
        socketService.io.emit('choices:reveal', choicesData);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error revealing choices:', error);
      res.status(500).json({ error: 'Failed to reveal choices' });
    }
  }

  // Reveals answer
  async revealAnswer(req, res) {
    try {
      const { answerId, answerText, isCorrect, teamId } = req.body;

      const teamName = await scoreboardModel.getTeamName(teamId);
      if (!teamName) {
        console.error('Team not found for ID:', teamId);
        return res.status(404).json({ error: 'Team not found' });
      }

      // Create the data format expected by the client
      const answerData = {
        questionId: req.body.questionId, // Include if available
        answerId: answerId,  // Used for highlighting the correct answer
        answerText,  // The text of the answer
        isCorrect,   // Whether this is the correct answer
        teamId,      // Which team this answer belongs to
        team: teamId, // Alternative format for team ID expected by some handlers
        teamName: teamName || teamId
      };

      // Notify connected clients via socket
      if (socketService.io) {
        socketService.io.emit('answer:reveal', answerData);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error revealing answer:', error);
      res.status(500).json({ error: 'Failed to reveal answer' });
    }
  }

  // Highlights an answer
  async highlightAnswer(req, res) {
    try {
      const { answerId } = req.body;

      // Format data for the client
      const highlightData = {
        questionId: req.body.questionId, // Include if available
        answerId: answerId,   // The answer to highlight
        showWrong: true      // Option to show wrong answers as well
      };

      // Notify connected clients via socket
      if (socketService.io) {
        socketService.io.emit('answer:highlight', highlightData);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error highlighting answer:', error);
      res.status(500).json({ error: 'Failed to highlight answer' });
    }
  }

  // Resets answer for a question
  async resetAnswer(req, res) {
    try {
      const { questionId } = req.body;

      // The client doesn't need much data for reset, but include questionId if available
      const resetData = {
        questionId
      };

      // Notify connected clients via socket
      if (socketService.io) {
        socketService.io.emit('answer:reset', resetData);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting answer:', error);
      res.status(500).json({ error: 'Failed to reset answer' });
    }
  }

  // Displays a fact
  async displayFact(req, res) {
    try {
      const { factId, factText, teamId, teamName } = req.body;

      // Format data as expected by the client
      const factData = {
        factId,
        fact: factText,     // Client expects 'fact' property for the text
        team: teamId,       // Client expects 'team' property (numeric ID)
        teamName: teamName  // Adding team name for display purposes
      };

      // Notify connected clients via socket
      if (socketService.io) {
        socketService.io.emit('fact:display', factData);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error displaying fact:', error);
      res.status(500).json({ error: 'Failed to display fact' });
    }
  }

  // Changes a fact
  async changeFact(req, res) {
    try {
      const { factId } = req.body;

      // Additional info may be needed to fetch the full fact data
      // This is just a placeholder - you should fetch the actual fact data
      const factData = {
        factId,
        fact: "Fact would be fetched here" // Client expects 'fact' property
      };

      // Notify connected clients via socket
      if (socketService.io) {
        socketService.io.emit('fact:change', factData);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error changing fact:', error);
      res.status(500).json({ error: 'Failed to change fact' });
    }
  }

  // Reveals a fact
  async revealFact(req, res) {
    try {
      const { factId, factText, teamId, factAnswer } = req.body;

      // Fetch the team name if needed
      const teamName = await scoreboardModel.getTeamName(teamId);
      if (!teamName) {
        console.error('Team not found for ID:', teamId);
        return res.status(404).json({ error: 'Team not found' });
      }

      // Format data as expected by the client
      const factData = {
        factId,
        fact: factText,
        team: teamId,
        answer: factAnswer, 
        teamName: teamName || teamId // 
      };

      // Notify connected clients via socket
      if (socketService.io) {
        socketService.io.emit('fact:reveal', factData);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error revealing fact:', error);
      res.status(500).json({ error: 'Failed to reveal fact' });
    }
  }
}

export default new QuestionController();