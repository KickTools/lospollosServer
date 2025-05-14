document.addEventListener('DOMContentLoaded', () => {
    // Connect to WebSocket server
    const socket = io();

    // Get DOM elements
    const questionContainer = document.getElementById('question-container');
    const questionText = document.getElementById('question-text');
    const answerBoxes = {
        a: document.getElementById('answer-a'),
        b: document.getElementById('answer-b'),
        c: document.getElementById('answer-c'),
        d: document.getElementById('answer-d')
    };

    // Listen for question updates
    socket.on('updateQuestion', (data) => {
        // Apply exit animation
        questionContainer.classList.add('question-change');

        // After exit animation completes, update content and fade back in
        setTimeout(() => {
            updateQuestionDisplay(data);
            questionContainer.classList.remove('question-change');

            // Reset any previous correct/wrong answer highlights
            Object.values(answerBoxes).forEach(box => {
                box.classList.remove('correct-answer', 'wrong-answer');
            });
        }, 500);
    });

    function updateQuestionDisplay(data) {
        // Update question text
        questionText.textContent = data.question;

        // Add team indicator if question is for a specific team
        if (data.team !== null) {
            const teamNumber = data.team + 1;
            questionText.innerHTML = `<span class="team-indicator">Team ${teamNumber}</span> ${data.question}`;
        } else {
            questionText.textContent = data.question;
        }

        // Update answer texts
        answerBoxes.a.querySelector('.answer-text').textContent = data.answers.a;
        answerBoxes.b.querySelector('.answer-text').textContent = data.answers.b;
        answerBoxes.c.querySelector('.answer-text').textContent = data.answers.c;
        answerBoxes.d.querySelector('.answer-text').textContent = data.answers.d;

        // Trigger animations by briefly removing and re-adding elements from the DOM
        Object.values(answerBoxes).forEach(box => {
            box.style.animation = 'none';
            box.offsetHeight; // Force reflow
            box.style.animation = '';
        });
    }

    // Listen for correct answer highlight
    socket.on('highlightAnswer', (data) => {
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
    });

    // Listen for reset highlights
    socket.on('resetHighlights', () => {
        Object.values(answerBoxes).forEach(box => {
            box.classList.remove('correct-answer', 'wrong-answer');
        });
    });
});