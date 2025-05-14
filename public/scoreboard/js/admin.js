// public/scoreboard/js/admin.js
document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const loginContainer = document.getElementById('login-container');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('login-form');
    const contestantsAdmin = document.getElementById('contestants-admin');
    const logoutBtn = document.getElementById('logout-btn');
    const resetScoresBtn = document.getElementById('reset-scores');
    const resetAllBtn = document.getElementById('reset-all');
    const incrementRoundBtn = document.getElementById('increment-round');
    const decrementRoundBtn = document.getElementById('decrement-round');
    const roundInput = document.getElementById('round');

    let currentContestants = [];
    let currentMode = 2;
    let nameUpdateTimeouts = {};
    let isReceivingScoreboardUpdate = false;
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const passcode = document.getElementById('passcode').value;
        socket.emit('adminLogin', { username, passcode }, (response) => {
            if (response.success) {
                loginContainer.style.display = 'none';
                adminPanel.style.display = 'block';
                socket.emit('getScoreboard');
            } else {
                alert('Invalid username or passcode');
            }
        });
    });

    logoutBtn.addEventListener('click', () => {
        adminPanel.style.display = 'none';
        loginContainer.style.display = 'block';
        document.getElementById('username').value = '';
        document.getElementById('passcode').value = '';
    });

    socket.on('scoreboardData', (data) => {
        // Set flag to indicate we're handling a scoreboard update
        isReceivingScoreboardUpdate = true;

        currentContestants = data.contestants;
        currentMode = data.mode;
        roundInput.value = data.round;
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.mode) === currentMode);
        });

        renderContestantControls();
        updateTeamButtons();

        // Clear flag after rendering is complete
        isReceivingScoreboardUpdate = false;
    });

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const newMode = parseInt(btn.dataset.mode);
            if (newMode !== currentMode) {
                currentMode = newMode;
                document.querySelectorAll('.toggle-btn').forEach(b => {
                    b.classList.toggle('active', parseInt(b.dataset.mode) === currentMode);
                });
                if (currentMode === 2 && currentContestants.length > 2) {
                    currentContestants = currentContestants.slice(0, 2);
                } else if (currentMode === 3 && currentContestants.length < 3) {
                    while (currentContestants.length < 3) {
                        currentContestants.push({
                            id: currentContestants.length,
                            name: `Contestant ${currentContestants.length + 1}`,
                            score: 0
                        });
                    }
                }
                renderContestantControls();
                updateScoreboard();
                updateTeamButtons();
            }
        });
    });

    incrementRoundBtn.addEventListener('click', () => {
        roundInput.value = parseInt(roundInput.value) + 1;
        updateScoreboard();
    });

    decrementRoundBtn.addEventListener('click', () => {
        if (parseInt(roundInput.value) > 1) {
            roundInput.value = parseInt(roundInput.value) - 1;
            updateScoreboard();
        }
    });

    roundInput.addEventListener('change', () => {
        if (parseInt(roundInput.value) < 1) {
            roundInput.value = 1;
        }
        updateScoreboard();
    });

    resetScoresBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all scores to zero?')) {
            currentContestants.forEach(contestant => {
                contestant.score = 0;
            });
            renderContestantControls();
            updateScoreboard();
        }
    });

    resetAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset everything? This will reset scores, names and round.')) {
            currentContestants = Array.from({ length: currentMode }, (_, i) => ({
                id: i,
                name: `Contestant ${i + 1}`,
                score: 0
            }));
            roundInput.value = 1;
            renderContestantControls();
            updateScoreboard();
            updateTeamButtons();
        }
    });

    function renderContestantControls() {
        const activeElement = document.activeElement;
        const focusedElementId = activeElement ? activeElement.id : null;
        const selectionStart = activeElement && activeElement.tagName === 'INPUT' ? activeElement.selectionStart : null;
        const selectionEnd = activeElement && activeElement.tagName === 'INPUT' ? activeElement.selectionEnd : null;


        contestantsAdmin.innerHTML = '';
        currentContestants.forEach((contestant, index) => {
            const contestantDiv = document.createElement('div');
            contestantDiv.className = 'contestant-control';
            contestantDiv.innerHTML = `
                <div class="contestant-header">
                    <input type="text" id="contestant-${index}-name" value="${contestant.name}">
                    <div class="score-controls">
                        <button class="btn" data-id="${index}" data-action="subtract">-</button>
                        <input type="number" id="score-input-${index}" value="${contestant.score}" min="0" class="score-input">
                        <button class="btn" data-id="${index}" data-action="add">+</button>
                    </div>
                </div>
            `;
            contestantsAdmin.appendChild(contestantDiv);

            // Name change event listener
            document.getElementById(`contestant-${index}-name`).addEventListener('input', (e) => {
                currentContestants[index].name = e.target.value;

                // Update team buttons directly without rebuilding them
                const teamButtons = document.querySelectorAll('.team-btn');
                teamButtons.forEach(btn => {
                    if (btn.dataset.team === index.toString()) {
                        btn.textContent = e.target.value || `Team ${index + 1}`;
                    }
                });

                // Debounce the scoreboard update
                clearTimeout(nameUpdateTimeouts[index]);
                nameUpdateTimeouts[index] = setTimeout(() => {
                    console.log(`Saving name update for contestant ${index}: ${e.target.value}`);
                    updateScoreboard(); // This sends the full scoreboard data to server
                }, 1000); // 1 second delay
            });

            // Score input event listener
            document.getElementById(`score-input-${index}`).addEventListener('change', (e) => {
                const newScore = parseInt(e.target.value);
                if (isNaN(newScore) || newScore < 0) {
                    e.target.value = currentContestants[index].score; // Revert to current score
                    alert('Please enter a non-negative number.');
                    return;
                }
                currentContestants[index].score = newScore;
                socket.emit('updateScore', { id: index, score: newScore });
            });
        });

        // Score button event listeners
        document.querySelectorAll('.score-controls .btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const action = btn.dataset.action;
                if (action === 'add') {
                    currentContestants[id].score++;
                } else if (action === 'subtract' && currentContestants[id].score > 0) {
                    currentContestants[id].score--;
                }
                // Update score input field
                document.getElementById(`score-input-${id}`).value = currentContestants[id].score;
                socket.emit('updateScore', { id: id, score: currentContestants[id].score });
            });
        });

        // Restore focus if needed
        if (focusedElementId) {
            const elementToFocus = document.getElementById(focusedElementId);
            if (elementToFocus) {
                elementToFocus.focus();
                if (selectionStart !== null && selectionEnd !== null) {
                    elementToFocus.setSelectionRange(selectionStart, selectionEnd);
                }
            }
        }
    }

    function updateScoreboard() {
        // Don't emit updates while we're processing an incoming update
        if (isReceivingScoreboardUpdate) return;

        socket.emit('updateScoreboard', {
            contestants: currentContestants,
            round: parseInt(roundInput.value),
            mode: currentMode
        });
    }


    let currentQuestionData = null;
    let selectedCorrectAnswer = null;
    let selectedTeam = null;
    const questionQueue = [];

    const questionInput = document.getElementById('question-input');
    const answerInputs = {
        a: document.getElementById('answer-a-input'),
        b: document.getElementById('answer-b-input'),
        c: document.getElementById('answer-c-input'),
        d: document.getElementById('answer-d-input')
    };
    const correctButtons = document.querySelectorAll('.correct-btn');
    const addToQueueBtn = document.getElementById('add-to-queue-btn');
    const sendQuestionBtn = document.getElementById('send-question-btn');
    const clearQuestionBtn = document.getElementById('clear-question-btn');
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const resetHighlightsBtn = document.getElementById('reset-highlights-btn');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const clearQueueBtn = document.getElementById('clear-queue-btn');
    const questionList = document.getElementById('question-list');
    const activeQuestionTitle = document.getElementById('active-question-title');
    const teamButtonsContainer = document.getElementById('team-buttons');

    function updateTeamButtons() {
        if (!teamButtonsContainer) return;
        teamButtonsContainer.innerHTML = '';
        const noTeamBtn = document.createElement('button');
        noTeamBtn.className = 'team-btn' + (selectedTeam === null ? ' selected' : '');
        noTeamBtn.textContent = 'No Team';
        noTeamBtn.dataset.team = 'null';
        teamButtonsContainer.appendChild(noTeamBtn);
        currentContestants.forEach((contestant, index) => {
            const teamBtn = document.createElement('button');
            teamBtn.className = 'team-btn' + (selectedTeam === index ? ' selected' : '');
            teamBtn.textContent = contestant.name || `Team ${index + 1}`;
            teamBtn.dataset.team = index.toString();
            teamButtonsContainer.appendChild(teamBtn);
        });
        document.querySelectorAll('.team-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedTeam = btn.dataset.team === 'null' ? null : parseInt(btn.dataset.team);
            });
        });
    }

    correctButtons.forEach(button => {
        button.addEventListener('click', () => {
            correctButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedCorrectAnswer = button.dataset.answer;
        });
    });

    addToQueueBtn.addEventListener('click', () => {
        if (validateQuestionForm()) {
            const questionData = {
                question: questionInput.value,
                answers: {
                    a: answerInputs.a.value,
                    b: answerInputs.b.value,
                    c: answerInputs.c.value,
                    d: answerInputs.d.value
                },
                correctAnswer: selectedCorrectAnswer,
                team: selectedTeam
            };
            addToQuestionQueue(questionData);
            if (questionQueue.length === 1) {
                nextQuestionBtn.disabled = false;
            }
            clearQuestionForm();
        } else {
            alert('Please fill in all fields and select the correct answer.');
        }
    });

    sendQuestionBtn.addEventListener('click', () => {
        if (validateQuestionForm()) {
            currentQuestionData = {
                question: questionInput.value,
                answers: {
                    a: answerInputs.a.value,
                    b: answerInputs.b.value,
                    c: answerInputs.c.value,
                    d: answerInputs.d.value
                },
                correctAnswer: selectedCorrectAnswer,
                team: selectedTeam
            };
            socket.emit('updateQuestion', currentQuestionData);
            let teamText = currentQuestionData.team !== null ? ` (Team ${currentQuestionData.team + 1})` : '';
            activeQuestionTitle.textContent = truncateText(currentQuestionData.question, 40) + teamText;
            showAnswerBtn.disabled = false;
            resetHighlightsBtn.disabled = false;
            clearQuestionForm();
        } else {
            alert('Please fill in all fields and select the correct answer.');
        }
    });

    nextQuestionBtn.addEventListener('click', () => {
        if (questionQueue.length > 0) {
            currentQuestionData = questionQueue.shift();
            socket.emit('updateQuestion', currentQuestionData);
            let teamText = currentQuestionData.team !== null ? ` (Team ${currentQuestionData.team + 1})` : '';
            activeQuestionTitle.textContent = truncateText(currentQuestionData.question, 40) + teamText;
            showAnswerBtn.disabled = false;
            resetHighlightsBtn.disabled = false;
            renderQuestionQueue();
            if (questionQueue.length === 0) {
                nextQuestionBtn.disabled = true;
            }
        }
    });

    showAnswerBtn.addEventListener('click', () => {
        if (currentQuestionData && currentQuestionData.correctAnswer) {
            socket.emit('highlightAnswer', {
                correctAnswer: currentQuestionData.correctAnswer,
                showWrong: true
            });
        }
    });

    resetHighlightsBtn.addEventListener('click', () => {
        socket.emit('resetHighlights');
    });

    clearQuestionBtn.addEventListener('click', () => {
        clearQuestionForm();
    });

    clearQueueBtn.addEventListener('click', () => {
        if (questionQueue.length > 0 && confirm('Are you sure you want to clear all questions from the queue?')) {
            questionQueue.length = 0;
            renderQuestionQueue();
            nextQuestionBtn.disabled = true;
        }
    });

    function validateQuestionForm() {
        if (!questionInput.value) return false;
        if (!answerInputs.a.value || !answerInputs.b.value || !answerInputs.c.value || !answerInputs.d.value) return false;
        if (!selectedCorrectAnswer) return false;
        return true;
    }

    function clearQuestionForm() {
        questionInput.value = '';
        answerInputs.a.value = '';
        answerInputs.b.value = '';
        answerInputs.c.value = '';
        answerInputs.d.value = '';
        correctButtons.forEach(btn => btn.classList.remove('selected'));
        selectedCorrectAnswer = null;
        selectedTeam = null;
        document.querySelectorAll('.team-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.team === 'null');
        });
    }

    function addToQuestionQueue(questionData) {
        questionQueue.push(questionData);
        renderQuestionQueue();
    }

    function removeFromQuestionQueue(index) {
        if (index >= 0 && index < questionQueue.length) {
            questionQueue.splice(index, 1);
            renderQuestionQueue();
            if (questionQueue.length === 0) {
                nextQuestionBtn.disabled = true;
            }
        }
    }

    function renderQuestionQueue() {
        if (questionQueue.length === 0) {
            questionList.innerHTML = '<div class="no-questions">No questions in queue</div>';
            return;
        }
        questionList.innerHTML = '';
        questionQueue.forEach((q, index) => {
            const item = document.createElement('div');
            item.className = 'queue-item';
            item.dataset.index = index;
            const teamLabel = q.team !== null ? `<span class="queue-team-indicator team-${q.team}"></span>` : '';
            item.innerHTML = `
                <div class="queue-item-text">
                    ${teamLabel}
                    <span class="queue-position">${index + 1}. </span>
                    ${truncateText(q.question, 50)}
                </div>
                <div class="queue-item-actions">
                    <button class="queue-item-btn" data-action="edit" data-index="${index}" title="Edit">✏️</button>
                    <button class="queue-item-btn" data-action="delete" data-index="${index}" title="Delete">🗑️</button>
                </div>
            `;
            questionList.appendChild(item);
        });
        document.querySelectorAll('.queue-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.queue-item-actions')) {
                    const index = parseInt(item.dataset.index);
                    loadQuestionFromQueue(index);
                }
            });
        });
        document.querySelectorAll('.queue-item-btn[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                loadQuestionFromQueue(index);
                removeFromQuestionQueue(index);
            });
        });
        document.querySelectorAll('.queue-item-btn[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                removeFromQuestionQueue(index);
            });
        });
    }

    function loadQuestionFromQueue(index) {
        if (index >= 0 && index < questionQueue.length) {
            const q = questionQueue[index];
            questionInput.value = q.question;
            answerInputs.a.value = q.answers.a;
            answerInputs.b.value = q.answers.b;
            answerInputs.c.value = q.answers.c;
            answerInputs.d.value = q.answers.d;
            correctButtons.forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.answer === q.correctAnswer);
            });
            selectedCorrectAnswer = q.correctAnswer;
            selectedTeam = q.team;
            document.querySelectorAll('.team-btn').forEach(btn => {
                const btnTeam = btn.dataset.team === 'null' ? null : parseInt(btn.dataset.team);
                btn.classList.toggle('selected', btnTeam === selectedTeam);
            });
        }
    }

    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    }

    updateTeamButtons();
});