// src/scoreboard/js/questions.js
class GameShowDisplay {
    constructor() {
        this.socket = io();
        this.setupSocketListeners();
        this.initializeElements();
        this.currentState = null;
        this.currentData = null;
    }

    initializeElements() {
        // Main containers
        this.overlayContainer = document.getElementById('overlay-container');
        this.questionContainer = document.getElementById('question-container');
        this.factContainer = document.getElementById('fact-container');

        // Question elements
        this.questionText = document.getElementById('question-text');
        this.answersContainer = document.getElementById('answers-container');
        this.answerBoxes = {
            a: document.getElementById('answer-a'),
            b: document.getElementById('answer-b'),
            c: document.getElementById('answer-c'),
            d: document.getElementById('answer-d')
        };

        // Free response elements
        this.freeResponseAnswer = document.getElementById('free-response-answer');
        this.freeResponseAnswerText = document.getElementById('free-response-answer-text');
        this.freeResponseTeam = document.getElementById('free-response-team');

        // Fact elements
        this.factText = document.getElementById('fact-text');
        this.factAnswerContainer = document.getElementById('fact-answer-container'); // New container reference
        this.factTeam = document.getElementById('fact-team');
        this.factAnswer = document.getElementById('fact-answer');

        console.log('Game display elements initialized');
    }

    setupSocketListeners() {
        // Question events
        this.socket.on('question:display', (data) => {
            console.log('Received question:display event', data);
            this.handleQuestionDisplay(data);
        });

        this.socket.on('question:change', (data) => {
            console.log('Received question:change event', data);
            this.handleQuestionChange(data);
        });

        this.socket.on('question:show', (data) => {
            console.log('Received question:show event', data);
            this.questionContainer.classList.remove('hidden');
        });

        this.socket.on('question:hide', (data) => {
            console.log('Received question:hide event', data);
            this.questionContainer.classList.add('hidden');
        });

        this.socket.on('choices:reveal', (data) => {
            console.log('Received choices:reveal event', data);
            this.handleChoicesReveal(data);
        });

        this.socket.on('answer:reveal', (data) => {
            console.log('Received answer:reveal event', data);
            this.handleAnswerReveal(data);
        });

        this.socket.on('answer:highlight', (data) => {
            console.log('Received answer:highlight event', data);
            this.handleAnswerHighlight(data);
        });

        this.socket.on('answer:reset', (data) => {
            console.log('Received answer:reset event');
            this.handleAnswerReset();
        });

        // Free response specific event
        this.socket.on('question:free_response', (data) => {
            console.log('Received question:free_response event', data);
            this.handleFreeResponseQuestion(data);
        });

        // Fact events
        this.socket.on('fact:display', (data) => {
            console.log('Received fact:display event', data);
            this.handleFactDisplay(data);
        });

        this.socket.on('fact:change', (data) => {
            console.log('Received fact:change event', data);
            this.handleFactChange(data);
        });

        this.socket.on('fact:reveal', (data) => {
            console.log('Received fact:reveal event', data);
            this.handleFactReveal(data);
        });

        // Debug events
        this.socket.on('connect', () => {
            console.log('Connected to server:', this.socket.id);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }

    // Question Handlers
    handleQuestionDisplay(data) {
        this.currentState = 'question';
        this.currentData = data;

        // Remove free response styling if it was applied
        this.questionContainer.classList.remove('free-response-mode');

        this.factContainer.classList.add('hidden');
        this.questionContainer.classList.remove('hidden');

        // Get question box and add animation
        const questionBox = document.querySelector('.question-box');
        const questionMark = document.querySelector('.question-mark');

        // Reset and apply animations
        questionBox.classList.remove('animate-in');
        void questionBox.offsetWidth; // Force reflow
        questionBox.classList.add('animate-in');

        // Animate question mark
        questionMark.classList.add('animated');

        // Show only question text initially
        this.questionText.textContent = data.question || 'Question text missing';
        this.answersContainer.classList.add('hidden');
        this.resetHighlights();

        // If this is a free response question (Round 2), handle it specially
        if (data.roundId === 2 || data.isFreeResponse) {
            // Mark as free response
            this.currentState = 'free_response';
            // Add special styling
            this.questionContainer.classList.add('free-response-mode');
            // Don't wait for choices:reveal event to show anything else
            console.log('Free response question detected');
        }

        this.animateTransition();
    }

    // Dedicated handler for free response questions
    handleFreeResponseQuestion(data) {
        // Mark that this is a free response question
        this.currentState = 'free_response';
        this.currentData = data;

        // Show question container but hide answers
        this.factContainer.classList.add('hidden');
        this.questionContainer.classList.remove('hidden');

        // Get question box and add animation
        const questionBox = document.querySelector('.question-box');
        const questionMark = document.querySelector('.question-mark');

        // Reset and apply animations
        questionBox.classList.remove('animate-in');
        void questionBox.offsetWidth; // Force reflow
        questionBox.classList.add('animate-in');

        // Animate question mark
        questionMark.classList.add('animated');

        // Set the question text
        this.questionText.textContent = data.question || 'Question text missing';

        // Hide the multiple choice answers section
        this.answersContainer.classList.add('hidden');
        this.resetHighlights();

        // Add a special class for free response styling
        this.questionContainer.classList.add('free-response-mode');

        this.animateTransition();
    }

    handleQuestionChange(data) {
        this.currentData = data;
        this.animateTransition(() => {
            this.questionText.textContent = data.question || 'Question text missing';
        });
    }

    handleChoicesReveal(data) {
        // If this is a free response question, ignore choices
        if (this.currentState === 'free_response') {
            console.log('Ignoring choices for free response question');
            return;
        }

        if (!data || !data.choices) {
            console.log('Invalid choices data received:', data);
            return;
        }

        this.answersContainer.classList.remove('hidden');

        // Reset all answer boxes first
        Object.values(this.answerBoxes).forEach(box => {
            box.classList.add('hidden');
            box.classList.remove('reveal-a', 'reveal-b', 'reveal-c', 'reveal-d', 'animated');
        });

        // Store the answer IDs for later use when revealing answers
        this.choiceIds = {};

        // Handle choices passed as an array of answer objects
        if (Array.isArray(data.choices)) {
            data.choices.forEach((answer, index) => {
                if (index < 4) { // Only handle up to 4 answers (a, b, c, d)
                    const key = String.fromCharCode(97 + index); // a, b, c, d
                    const answerBox = this.answerBoxes[key];
                    if (answerBox) {
                        answerBox.querySelector('.answer-text').textContent = answer.answer_text || '';
                        
                        // Add specific animation class based on position
                        setTimeout(() => {
                            answerBox.classList.add('animated', `reveal-${key}`);
                            answerBox.classList.remove('hidden');
                        }, 50); // Small delay to ensure CSS transition works

                        // Store the ID if available for later matching
                        if (answer.id !== undefined) {
                            this.choiceIds[answer.id] = key;
                        }
                    }
                }
            });
        }
        // Handle choices passed as an object with letter keys
        else {
            let index = 0;
            Object.entries(data.choices).forEach(([key, value]) => {
                const letterKey = String.fromCharCode(97 + index); // a, b, c, d
                const answerBox = this.answerBoxes[letterKey];
                if (answerBox) {
                    answerBox.querySelector('.answer-text').textContent = typeof value === 'object' ? value.answer_text || '' : value;
                    
                    // Add specific animation class with delay
                    setTimeout(() => {
                        answerBox.classList.add('animated', `reveal-${letterKey}`);
                        answerBox.classList.remove('hidden');
                    }, 50);

                    // If there's an ID in the data structure, store the mapping
                    if (typeof value === 'object' && value.id !== undefined) {
                        this.choiceIds[value.id] = letterKey;
                    } else {
                        // Store position-based fallback
                        this.choiceIds[index] = letterKey;
                    }
                }
                index++;
            });
        }

        console.log('Stored choice IDs mapping:', this.choiceIds);
    }

handleAnswerReveal(data) {
    if (!data || !data.answerId) {
        console.error('Invalid answer data received:', data);
        return;
    }

    console.log('Revealing answer with ID:', data.answerId);

    // Check if we're in free response mode
    if (this.currentState === 'free_response') {
        // Handle free response answer reveal
        console.log('Revealing free response answer:', data.answerText);

        // Make sure the free response answer container is ready
        if (!this.freeResponseAnswer) {
            console.error('Free response answer container not found');
            return;
        }

        // Display the answer text
        this.freeResponseAnswerText.textContent = data.answerText || 'No answer text provided';

        // Show the team name if available
        if (data.team || data.teamId) {
            const teamId = data.team || data.teamId;
            this.freeResponseTeam.textContent = `Team ${Number(teamId)}`;
            this.freeResponseTeam.classList.remove('hidden');
        } else {
            this.freeResponseTeam.classList.add('hidden');
        }

        // Show the free response answer container with animation
        this.freeResponseAnswer.classList.remove('hidden');
        
        // Apply animation with slight delay for dramatic effect
        setTimeout(() => {
            this.freeResponseAnswer.classList.add('revealed');
        }, 200);

        return; // Return early for free response questions
    }

    // --- MULTIPLE CHOICE / A/B ANSWER REVEAL LOGIC --- //
    console.log('Available mappings:', this.choiceIds);

    // IMPORTANT: Hide all answers except the one being revealed
    Object.entries(this.answerBoxes).forEach(([key, box]) => {
        box.classList.add('hidden');
        box.classList.remove('revealed');
    });

    // Try to find the correct answer using the ID mapping
    let answerKey = null;

    // Check if we have stored IDs from choices:reveal
    if (this.choiceIds && this.choiceIds[data.answerId] !== undefined) {
        answerKey = this.choiceIds[data.answerId];
        console.log('Found answer key from stored mappings:', answerKey);
    }
    // If not found in mappings, handle as before with positioning logic
    else {
        // Handle answer ID as a letter (a, b, c, d)
        if (typeof data.answerId === 'string' && data.answerId.length === 1) {
            answerKey = data.answerId.toLowerCase();
        }
        // Handle numeric answer ID with position-based logic
        else if (typeof data.answerId === 'number') {
            // Position-based index (0-3) for a, b, c, d
            const position = (data.answerId - 1) % 4;
            answerKey = String.fromCharCode(97 + position); // Convert to a, b, c, d
            console.log('Using position-based fallback:', position, '->', answerKey);
        }
    }

    // Update the answer text if provided
    if (data.answerText && answerKey) {
        const answerBox = this.answerBoxes[answerKey];
        if (answerBox) {
            answerBox.querySelector('.answer-text').textContent = data.answerText;
        }
    }

    // Show ONLY the appropriate answer
    if (answerKey) {
        const answerBox = this.answerBoxes[answerKey];
        if (answerBox) {
            console.log('Showing answer box:', answerKey);
            answerBox.classList.remove('hidden');
            
            // Add a dramatic pause before the revealed effect
            setTimeout(() => {
                answerBox.classList.add('revealed');
                // Add a dramatic shake effect
                this.applyShakeEffect(answerBox);
            }, 300);
        } else {
            console.error('Answer box not found for key:', answerKey);
        }
    } else {
        // Fallback: just show the answer as text in the first visible box
        const firstBox = this.answerBoxes.a;
        if (firstBox) {
            console.log('Using fallback box for answer text');
            firstBox.querySelector('.answer-text').textContent = data.answerText || 'Answer ' + data.answerId;
            firstBox.classList.remove('hidden');
            
            // Add a dramatic pause before the revealed effect
            setTimeout(() => {
                firstBox.classList.add('revealed');
                // Add a dramatic shake effect
                this.applyShakeEffect(firstBox);
            }, 300);
        } else {
            console.error('No fallback box available for answer display');
        }
    }
}

    handleAnswerHighlight(data) {
        if (!data || !data.answerId) {
            console.error('Invalid highlight data received:', data);
            return;
        }

        let correctAnswerKey = null;

        // Try to find the correct answer using the ID mapping
        if (this.choiceIds && this.choiceIds[data.answerId] !== undefined) {
            correctAnswerKey = this.choiceIds[data.answerId];
        } else {
            // Handle answer ID as a letter (a, b, c, d)
            if (typeof data.answerId === 'string' && data.answerId.length === 1) {
                correctAnswerKey = data.answerId.toLowerCase();
            }
            // Handle numeric answer ID with better position logic
            else if (typeof data.answerId === 'number') {
                const position = (data.answerId - 1) % 4;
                correctAnswerKey = String.fromCharCode(97 + position); // Convert to a, b, c, d
            }
        }

        if (correctAnswerKey) {
            const correctAnswer = this.answerBoxes[correctAnswerKey];
            if (correctAnswer) {
                // First show the element before adding effects
                correctAnswer.classList.remove('hidden');
                
                // Apply the correct answer styling with a slight delay
                setTimeout(() => {
                    correctAnswer.classList.add('correct-answer');
                    this.applyPulseEffect(correctAnswer);
                    
                    // If we should show wrong answers too
                    if (data.showWrong) {
                        // Show wrong answers with staggered animation
                        Object.entries(this.answerBoxes).forEach(([key, box], index) => {
                            if (key !== correctAnswerKey) {
                                // Delay increases for each wrong answer
                                setTimeout(() => {
                                    box.classList.remove('hidden');
                                    box.classList.add('wrong-answer');
                                    // Optionally add a subtle shake to wrong answers
                                    this.applyShakeEffect(box, 'subtle');
                                }, 200 + (index * 100));
                            }
                        });
                    }
                }, 300);
            }
        }
    }

    // Fact Handlers
    handleFactDisplay(data) {
        this.currentState = 'fact';
        this.currentData = data;

        this.questionContainer.classList.add('hidden');
        
        // Ensure fact elements are reset before showing
        const factIcon = document.querySelector('.fact-icon');
        
        // Apply animations to fact container and elements
        this.factContainer.classList.remove('hidden');
        
        // Reset animation on fact icon for re-triggering
        if (factIcon) {
            factIcon.style.animation = 'none';
            void factIcon.offsetWidth; // Force reflow
            factIcon.style.animation = '';
        }

        // Hide the answer container until reveal is triggered
        if (this.factAnswerContainer) {
            this.factAnswerContainer.classList.add('hidden');
        }

        this.factText.textContent = data.fact || 'Fact text missing';
        this.animateTransition();
    }

    handleFactChange(data) {
        this.currentData = data;
        this.animateTransition(() => {
            this.factText.textContent = data.fact || 'Fact text missing';
        });
    }

    handleFactReveal(data) {
        // Make sure the container is available
        if (!this.factAnswerContainer) {
            console.error('Fact answer container not found');
            return;
        }

        // Set the answer text
        this.factAnswer.textContent = data.answer || '';

        // Set the team information if available
        if (data.team !== undefined || data.teamId !== undefined || data.teamName !== undefined) {
            const teamName = data.teamName !== undefined ? data.teamName :
                data.teamId !== undefined ? data.teamId : data.team;
            this.factTeam.textContent = `Team ${Number(teamName)}`;
            this.factTeam.classList.remove('hidden');
        } else {
            this.factTeam.classList.add('hidden');
        }

        // Show the entire container with animation
        this.factAnswerContainer.classList.remove('hidden');
        
        // Apply the revealed animation with a slight delay for dramatic effect
        setTimeout(() => {
            this.factAnswerContainer.classList.add('revealed');
            // Add an additional effect to draw attention
            this.applyPulseEffect(this.factAnswerContainer);
        }, 200);
    }

    // Utility Methods
    handleAnswerReset() {
        this.resetHighlights();
        this.answersContainer.classList.add('hidden');
        this.questionContainer.classList.remove('free-response-mode');
        // Reset the choice IDs mapping
        this.choiceIds = {};
        
        // Reset any animated elements
        const questionMark = document.querySelector('.question-mark');
        if (questionMark) {
            questionMark.classList.remove('animated');
        }
        
        const questionBox = document.querySelector('.question-box');
        if (questionBox) {
            questionBox.classList.remove('animate-in');
        }
    }

    resetHighlights() {
        // Reset multiple choice boxes
        Object.values(this.answerBoxes).forEach(box => {
            box.classList.remove('correct-answer', 'wrong-answer', 'revealed', 'reveal', 
                              'reveal-a', 'reveal-b', 'reveal-c', 'reveal-d', 'animated');
            box.classList.add('hidden');
            const answerText = box.querySelector('.answer-text');
            if (answerText) {
                answerText.textContent = '';
            }
        });

        // Reset free response answer
        if (this.freeResponseAnswer) {
            this.freeResponseAnswer.classList.add('hidden');
            this.freeResponseAnswer.classList.remove('revealed');
            if (this.freeResponseAnswerText) {
                this.freeResponseAnswerText.textContent = '';
            }
            if (this.freeResponseTeam) {
                this.freeResponseTeam.classList.add('hidden');
            }
        }
    }

    animateTransition(callback) {
        this.overlayContainer.classList.add('transitioning');
        setTimeout(() => {
            if (callback) callback();
            this.overlayContainer.classList.remove('transitioning');
        }, 500);
    }
    
    // New utility methods for animations
    
    applyShakeEffect(element, type = 'normal') {
        // Define animation based on type
        const shakeAmount = type === 'subtle' ? 3 : 5;
        
        element.animate([
            { transform: 'translateX(0)' },
            { transform: `translateX(-${shakeAmount}px)` },
            { transform: `translateX(${shakeAmount}px)` },
            { transform: `translateX(-${shakeAmount}px)` },
            { transform: 'translateX(0)' }
        ], {
            duration: 500,
            iterations: 1
        });
    }
    
    applyPulseEffect(element) {
        element.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.05)' },
            { transform: 'scale(1)' }
        ], {
            duration: 700,
            iterations: 1,
            easing: 'ease-in-out'
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.gameShow = new GameShowDisplay();
});