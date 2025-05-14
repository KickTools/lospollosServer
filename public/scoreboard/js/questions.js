document.addEventListener('DOMContentLoaded', () => {
    // Connect to WebSocket server
    const socket = io();
    
    // Debug connection
    socket.on('connect', () => {
        console.log('Connected to server with socket ID:', socket.id);
    });
    
    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    // Get DOM elements
    const questionContainer = document.getElementById('question-container');
    const questionText = document.getElementById('question-text');
    const answerBoxes = {
        a: document.getElementById('answer-a'),
        b: document.getElementById('answer-b'),
        c: document.getElementById('answer-c'),
        d: document.getElementById('answer-d')
    };

    // Listen for ALL possible question update event names
    // This ensures we catch the event regardless of which name the server uses
    socket.on('updateQuestion', handleQuestionUpdate);
    socket.on('question:update', (data) => {
        // New event name format
        if (data && data.question) {
            handleQuestionUpdate(data.question);
        } else {
            handleQuestionUpdate(data);
        }
    });

    function handleQuestionUpdate(data) {
        // Apply exit animation
        questionContainer.classList.add('question-change');
        
        console.log('Received question update:', data);

        // After exit animation completes, update content and fade back in
        setTimeout(() => {
            updateQuestionDisplay(data);
            questionContainer.classList.remove('question-change');

            // Reset any previous correct/wrong answer highlights
            Object.values(answerBoxes).forEach(box => {
                box.classList.remove('correct-answer', 'wrong-answer');
            });
        }, 500);
    }

    function updateQuestionDisplay(data) {
        // Handle different data structures
        const question = data.question || data;
        
        // Update question text
        if (typeof question === 'string') {
            questionText.textContent = question;
        } else {
            // Update question text
            questionText.textContent = question.question || '';

            // Add team indicator if question is for a specific team
            if (question.team !== null && question.team !== undefined) {
                const teamNumber = question.team + 1;
                questionText.innerHTML = `<span class="team-indicator">Team ${teamNumber}</span> ${question.question}`;
            } else {
                questionText.textContent = question.question || '';
            }
            
            // Update answer texts if they exist
            if (question.answers) {
                answerBoxes.a.querySelector('.answer-text').textContent = question.answers.a || '';
                answerBoxes.b.querySelector('.answer-text').textContent = question.answers.b || '';
                answerBoxes.c.querySelector('.answer-text').textContent = question.answers.c || '';
                answerBoxes.d.querySelector('.answer-text').textContent = question.answers.d || '';
            }
        }

        // Trigger animations by briefly removing and re-adding elements from the DOM
        Object.values(answerBoxes).forEach(box => {
            box.style.animation = 'none';
            box.offsetHeight; // Force reflow
            box.style.animation = '';
        });
    }

    // Listen for ALL possible highlight answer event names
    socket.on('highlightAnswer', handleHighlightAnswer);
    socket.on('question:highlight', handleHighlightAnswer);

    function handleHighlightAnswer(data) {
        console.log('Received highlight answer:', data);
        
        // Important fix: ensure we're not removing any content
        const correctAnswerKey = data.correctAnswer;

        // Highlight the correct answer (if it exists)
        if (correctAnswerKey && answerBoxes[correctAnswerKey]) {
            // Apply the correct-answer class without changing content
            answerBoxes[correctAnswerKey].classList.add('correct-answer');

            // Only mark other answers as wrong if specified
            if (data.showWrong) {
                Object.keys(answerBoxes).forEach(key => {
                    if (key !== correctAnswerKey) {
                        // Apply wrong-answer class without changing content
                        answerBoxes[key].classList.add('wrong-answer');
                    }
                });
            }
        }
    }

    // Listen for ALL possible reset highlight event names
    socket.on('resetHighlights', resetAllHighlights);
    socket.on('question:reset-highlights', resetAllHighlights);

    function resetAllHighlights() {
        console.log('Received reset highlights');
        Object.values(answerBoxes).forEach(box => {
            box.classList.remove('correct-answer', 'wrong-answer');
        });
    }
    
    // Listen for scoreboard data updates
    socket.on('scoreboardData', (data) => {
        console.log('Received scoreboard data:', data);
        // Handle scoreboard data if needed
    });
    
    // Listen for contestant updates
    socket.on('contestant:update', (data) => {
        console.log('Received contestant update:', data);
        // Handle contestant updates if needed
    });
});