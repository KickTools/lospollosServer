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
        this.overlayContainer = document.getElementById('overlay-container');
        this.questionContainer = document.getElementById('question-container');
        this.factContainer = document.getElementById('fact-container');
        this.questionText = document.getElementById('question-text');
        this.answersContainer = document.getElementById('answers-container');
        this.answerBoxes = {
            a: document.getElementById('answer-a'),
            b: document.getElementById('answer-b'),
            c: document.getElementById('answer-c'),
            d: document.getElementById('answer-d')
        };
        this.freeResponseAnswer = document.getElementById('free-response-answer');
        this.freeResponseAnswerText = document.getElementById('free-response-answer-text');
        this.freeResponseTeam = document.getElementById('free-response-team');
        this.factText = document.getElementById('fact-text');
        this.factAnswerContainer = document.getElementById('fact-answer-container');
        this.factTeam = document.getElementById('fact-team');
        this.factAnswer = document.getElementById('fact-answer');
        console.log('Game display elements initialized');
    }

    setupSocketListeners() {
        // Display show/hide events
        this.socket.on('display:show', (data) => {
            console.log('Received display:show event', data);
            const contentType = data.contentType || 'question';
            if (contentType === 'question') {
                this.currentState = data.isFreeResponse ? 'free_response' : 'question';
                this.factContainer.classList.add('hidden');
                this.factContainer.classList.remove('animate-in');
                this.questionContainer.classList.remove('hidden');
                const questionBox = document.querySelector('.question-box');
                questionBox.classList.remove('animate-in');
                void questionBox.offsetWidth; // Force reflow
                questionBox.classList.add('animate-in');
            } else if (contentType === 'fact') {
                this.currentState = 'fact';
                this.questionContainer.classList.add('hidden');
                this.questionContainer.classList.remove('animate-in');
                this.factContainer.classList.remove('hidden');
                const factBox = document.querySelector('.fact-box');
                factBox.classList.remove('animate-in');
                void factBox.offsetWidth; // Force reflow
                factBox.classList.add('animate-in');
            }
        });

        this.socket.on('display:hide', (data) => {
            console.log('Received display:hide event', data);
            this.questionContainer.classList.add('hidden');
            this.questionContainer.classList.remove('animate-in');
            this.factContainer.classList.add('hidden');
            this.factContainer.classList.remove('animate-in');
            this.resetHighlights();
            this.currentState = null;
        });

        // Question events
        this.socket.on('question:display', (data) => {
            console.log('Received question:display event', data);
            this.handleQuestionDisplay(data);
        });

        this.socket.on('question:change', (data) => {
            console.log('Received question:change event', data);
            this.handleQuestionChange(data);
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
        this.currentState = data.isFreeResponse || data.roundId === 2 ? 'free_response' : 'question';
        this.currentData = data;

        this.questionContainer.classList.remove('free-response-mode');
        this.factContainer.classList.add('hidden');
        this.factContainer.classList.remove('animate-in');
        this.questionContainer.classList.remove('hidden');

        const questionBox = document.querySelector('.question-box');
        const questionMark = document.querySelector('.question-mark');
        questionBox.classList.remove('animate-in');
        void questionBox.offsetWidth;
        questionBox.classList.add('animate-in');
        questionMark.classList.add('animated');

        this.questionText.textContent = data.question || 'Question text missing';
        this.answersContainer.classList.add('hidden');
        this.resetHighlights();

        if (data.roundId === 2 || data.isFreeResponse) {
            this.questionContainer.classList.add('free-response-mode');
            console.log('Free response question detected');
        }

        this.animateTransition();
    }

    handleFreeResponseQuestion(data) {
        this.currentState = 'free_response';
        this.currentData = data;

        this.factContainer.classList.add('hidden');
        this.factContainer.classList.remove('animate-in');
        this.questionContainer.classList.remove('hidden');

        const questionBox = document.querySelector('.question-box');
        const questionMark = document.querySelector('.question-mark');
        questionBox.classList.remove('animate-in');
        void questionBox.offsetWidth;
        questionBox.classList.add('animate-in');
        questionMark.classList.add('animated');

        this.questionText.textContent = data.question || 'Question text missing';
        this.answersContainer.classList.add('hidden');
        this.resetHighlights();
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
        if (this.currentState === 'free_response') {
            console.log('Ignoring choices for free response question');
            return;
        }

        if (!data || !data.choices) {
            console.log('Invalid choices data received:', data);
            return;
        }

        this.answersContainer.classList.remove('hidden');
        Object.values(this.answerBoxes).forEach(box => {
            box.classList.add('hidden');
            box.classList.remove('reveal-a', 'reveal-b', 'reveal-c', 'reveal-d', 'animated');
        });

        this.choiceIds = {};

        if (Array.isArray(data.choices)) {
            data.choices.forEach((answer, index) => {
                if (index < 4) {
                    const key = String.fromCharCode(97 + index);
                    const answerBox = this.answerBoxes[key];
                    if (answerBox) {
                        answerBox.querySelector('.answer-text').textContent = answer.answer_text || '';
                        setTimeout(() => {
                            answerBox.classList.add('animated', `reveal-${key}`);
                            answerBox.classList.remove('hidden');
                        }, 50);
                        if (answer.id !== undefined) {
                            this.choiceIds[answer.id] = key;
                        }
                    }
                }
            });
        } else {
            let index = 0;
            Object.entries(data.choices).forEach(([key, value]) => {
                const letterKey = String.fromCharCode(97 + index);
                const answerBox = this.answerBoxes[letterKey];
                if (answerBox) {
                    answerBox.querySelector('.answer-text').textContent = typeof value === 'object' ? value.answer_text || '' : value;
                    setTimeout(() => {
                        answerBox.classList.add('animated', `reveal-${letterKey}`);
                        answerBox.classList.remove('hidden');
                    }, 50);
                    if (typeof value === 'object' && value.id !== undefined) {
                        this.choiceIds[value.id] = letterKey;
                    } else {
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

        if (this.currentState === 'free_response') {
            console.log('Revealing free response answer:', data.answerText);
            if (!this.freeResponseAnswer) {
                console.error('Free response answer container not found');
                return;
            }

            this.freeResponseAnswerText.textContent = data.answerText || 'No answer text provided';
            if (data.team || data.teamId) {
                const teamId = data.team || data.teamId;
                this.freeResponseTeam.textContent = data.teamName;
                this.freeResponseTeam.classList.remove('hidden');
            } else {
                this.freeResponseTeam.classList.add('hidden');
            }

            this.freeResponseAnswer.classList.remove('hidden');
            setTimeout(() => {
                this.freeResponseAnswer.classList.add('revealed');
            }, 200);
            return;
        }

        console.log('Available mappings:', this.choiceIds);
        Object.entries(this.answerBoxes).forEach(([key, box]) => {
            box.classList.add('hidden');
            box.classList.remove('revealed');
        });

        let answerKey = null;
        if (this.choiceIds && this.choiceIds[data.answerId] !== undefined) {
            answerKey = this.choiceIds[data.answerId];
            console.log('Found answer key from stored mappings:', answerKey);
        } else {
            if (typeof data.answerId === 'string' && data.answerId.length === 1) {
                answerKey = data.answerId.toLowerCase();
            } else if (typeof data.answerId === 'number') {
                const position = (data.answerId - 1) % 4;
                answerKey = String.fromCharCode(97 + position);
                console.log('Using position-based fallback:', position, '->', answerKey);
            }
        }

        if (data.answerText && answerKey) {
            const answerBox = this.answerBoxes[answerKey];
            if (answerBox) {
                answerBox.querySelector('.answer-text').textContent = data.answerText;
            }
        }

        if (answerKey) {
            const answerBox = this.answerBoxes[answerKey];
            if (answerBox) {
                console.log('Showing answer box:', answerKey);
                answerBox.classList.remove('hidden');
                setTimeout(() => {
                    answerBox.classList.add('revealed');
                    this.applyShakeEffect(answerBox);
                }, 300);
            } else {
                console.error('Answer box not found for key:', answerKey);
            }
        } else {
            const firstBox = this.answerBoxes.a;
            if (firstBox) {
                console.log('Using fallback box for answer text');
                firstBox.querySelector('.answer-text').textContent = data.answerText || 'Answer ' + data.answerId;
                firstBox.classList.remove('hidden');
                setTimeout(() => {
                    firstBox.classList.add('revealed');
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
        if (this.choiceIds && this.choiceIds[data.answerId] !== undefined) {
            correctAnswerKey = this.choiceIds[data.answerId];
        } else {
            if (typeof data.answerId === 'string' && data.answerId.length === 1) {
                correctAnswerKey = data.answerId.toLowerCase();
            } else if (typeof data.answerId === 'number') {
                const position = (data.answerId - 1) % 4;
                correctAnswerKey = String.fromCharCode(97 + position);
            }
        }

        if (correctAnswerKey) {
            const correctAnswer = this.answerBoxes[correctAnswerKey];
            if (correctAnswer) {
                correctAnswer.classList.remove('hidden');
                setTimeout(() => {
                    correctAnswer.classList.add('correct-answer');
                    this.applyPulseEffect(correctAnswer);
                    if (data.showWrong) {
                        Object.entries(this.answerBoxes).forEach(([key, box], index) => {
                            if (key !== correctAnswerKey) {
                                setTimeout(() => {
                                    box.classList.remove('hidden');
                                    box.classList.add('wrong-answer');
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
        this.questionContainer.classList.remove('animate-in');
        this.factContainer.classList.remove('hidden');

        const factIcon = document.querySelector('.fact-icon');
        const factBox = document.querySelector('.fact-box');
        factBox.classList.remove('animate-in');
        void factBox.offsetWidth;
        factBox.classList.add('animate-in');

        if (factIcon) {
            factIcon.style.animation = 'none';
            void factIcon.offsetWidth;
            factIcon.style.animation = '';
        }

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
        if (!this.factAnswerContainer) {
            console.error('Fact answer container not found');
            return;
        }

        this.factAnswer.textContent = data.answer || '';
        if (data.team !== undefined || data.teamId !== undefined || data.teamName !== undefined) {
            const teamName = data.teamName !== undefined ? data.teamName :
                data.teamId !== undefined ? data.teamId : data.team;
            this.factTeam.textContent = data.teamName || 'Team name missing';
            this.factTeam.classList.remove('hidden');
        } else {
            this.factTeam.classList.add('hidden');
        }

        this.factAnswerContainer.classList.remove('hidden');
        setTimeout(() => {
            this.factAnswerContainer.classList.add('revealed');
            this.applyPulseEffect(this.factAnswerContainer);
        }, 200);
    }

    // Utility Methods
    handleAnswerReset() {
        this.resetHighlights();
        this.answersContainer.classList.add('hidden');
        this.questionContainer.classList.remove('free-response-mode');
        this.choiceIds = {};

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
        Object.values(this.answerBoxes).forEach(box => {
            box.classList.remove('correct-answer', 'wrong-answer', 'revealed', 'reveal',
                'reveal-a', 'reveal-b', 'reveal-c', 'reveal-d', 'animated');
            box.classList.add('hidden');
            const answerText = box.querySelector('.answer-text');
            if (answerText) {
                answerText.textContent = '';
            }
        });

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

    applyShakeEffect(element, type = 'normal') {
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

document.addEventListener('DOMContentLoaded', () => {
    window.gameShow = new GameShowDisplay();
});