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
    
    // Current state
    let currentContestants = [];
    let currentMode = 2;
    
    // Login form submit
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const passcode = document.getElementById('passcode').value;
        
        // Send login request
        socket.emit('adminLogin', { username, passcode }, (response) => {
            if (response.success) {
                loginContainer.style.display = 'none';
                adminPanel.style.display = 'block';
                
                // Get initial scoreboard data
                socket.emit('getScoreboard');
            } else {
                alert('Invalid username or passcode');
            }
        });
    });
    
    // Logout button
    logoutBtn.addEventListener('click', () => {
        adminPanel.style.display = 'none';
        loginContainer.style.display = 'block';
        document.getElementById('username').value = '';
        document.getElementById('passcode').value = '';
    });
    
    // Listen for scoreboard data
    socket.on('scoreboardData', (data) => {
        currentContestants = data.contestants;
        currentMode = data.mode;
        roundInput.value = data.round;
        
        // Update mode toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.mode) === currentMode);
        });
        
        renderContestantControls();
        
        // Update team buttons for question management
        updateTeamButtons();
    });
    
    // Mode toggle
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const newMode = parseInt(btn.dataset.mode);
            
            if (newMode !== currentMode) {
                currentMode = newMode;
                
                // Update active button
                document.querySelectorAll('.toggle-btn').forEach(b => {
                    b.classList.toggle('active', parseInt(b.dataset.mode) === currentMode);
                });
                
                // Adjust contestants array length if needed
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
                
                // Update UI and send to server
                renderContestantControls();
                updateScoreboard();
                
                // Update team buttons for question management
                updateTeamButtons();
            }
        });
    });
    
    // Round controls
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
    
    // Reset buttons
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
            
            // Update team buttons for question management
            updateTeamButtons();
        }
    });
    
    function renderContestantControls() {
        contestantsAdmin.innerHTML = '';
        
        currentContestants.forEach((contestant, index) => {
            const contestantDiv = document.createElement('div');
            contestantDiv.className = 'contestant-control';
            
            contestantDiv.innerHTML = `
                <div class="contestant-header">
                    <div class="contestant-name-input">
                        <label for="contestant-${index}-name">Contestant ${index + 1} Name:</label>
                        <input type="text" id="contestant-${index}-name" value="${contestant.name}">
                    </div>
                </div>
                <div class="score-controls">
                    <label>Score:</label>
                    <button class="btn" data-id="${index}" data-action="subtract">-</button>
                    <div class="score-value" id="score-display-${index}">${contestant.score}</div>
                    <button class="btn" data-id="${index}" data-action="add">+</button>
                </div>
            `;
            
            contestantsAdmin.appendChild(contestantDiv);
            
            // Add name change event listener
            document.getElementById(`contestant-${index}-name`).addEventListener('input', (e) => {
                currentContestants[index].name = e.target.value;
                updateScoreboard();
                
                // Update team buttons text if contestant name changes
                updateTeamButtons();
            });
        });
        
        // Add score button event listeners
        document.querySelectorAll('.score-controls .btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const action = btn.dataset.action;
                
                if (action === 'add') {
                    currentContestants[id].score++;
                } else if (action === 'subtract' && currentContestants[id].score > 0) {
                    currentContestants[id].score--;
                }
                
                // Update score display
                document.getElementById(`score-display-${id}`).textContent = currentContestants[id].score;
                
                // Send score update
                socket.emit('updateScore', { 
                    id: id, 
                    score: currentContestants[id].score 
                });
            });
        });
    }
    
    function updateScoreboard() {
        socket.emit('updateScoreboard', {
            contestants: currentContestants,
            round: parseInt(roundInput.value),
            mode: currentMode
        });
    }

    // Question Management with Team Selection
    let currentQuestionData = null;
    let selectedCorrectAnswer = null;
    let selectedTeam = null;
    const questionQueue = [];

    // Get DOM elements for question management
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

    // Function to update team buttons based on current contestants
    function updateTeamButtons() {
        if (!teamButtonsContainer) return;
        
        // Clear existing buttons
        teamButtonsContainer.innerHTML = '';
        
        // Create "No Team" option
        const noTeamBtn = document.createElement('button');
        noTeamBtn.className = 'team-btn' + (selectedTeam === null ? ' selected' : '');
        noTeamBtn.textContent = 'No Team';
        noTeamBtn.dataset.team = 'null';
        teamButtonsContainer.appendChild(noTeamBtn);
        
        // Create a button for each contestant
        currentContestants.forEach((contestant, index) => {
            const teamBtn = document.createElement('button');
            teamBtn.className = 'team-btn' + (selectedTeam === index ? ' selected' : '');
            teamBtn.textContent = contestant.name || `Team ${index + 1}`;
            teamBtn.dataset.team = index.toString();
            teamButtonsContainer.appendChild(teamBtn);
        });
        
        // Add event listeners to team buttons
        document.querySelectorAll('.team-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Update selected state
                document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                
                // Update selected team
                selectedTeam = btn.dataset.team === 'null' ? null : parseInt(btn.dataset.team);
            });
        });
    }

    // Set up correct answer selection
    correctButtons.forEach(button => {
        button.addEventListener('click', () => {
            correctButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedCorrectAnswer = button.dataset.answer;
        });
    });

    // Add to Queue button
    addToQueueBtn.addEventListener('click', () => {
        if (validateQuestionForm()) {
            // Create question data object
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
            
            // Add to queue
            addToQuestionQueue(questionData);
            
            // Enable Next Question button if this is the first item
            if (questionQueue.length === 1) {
                nextQuestionBtn.disabled = false;
            }
            
            // Clear the form for the next question
            clearQuestionForm();
        } else {
            alert('Please fill in all fields and select the correct answer.');
        }
    });

    // Send Question button (bypasses queue)
    sendQuestionBtn.addEventListener('click', () => {
        if (validateQuestionForm()) {
            // Create question data object
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
            
            // Send to all clients
            socket.emit('updateQuestion', currentQuestionData);
            
            // Update active question display
            let teamText = currentQuestionData.team !== null ? 
                ` (Team ${currentQuestionData.team + 1})` : '';
            activeQuestionTitle.textContent = truncateText(currentQuestionData.question, 40) + teamText;
            
            // Enable control buttons
            showAnswerBtn.disabled = false;
            resetHighlightsBtn.disabled = false;
            
            // Clear the form for the next question
            clearQuestionForm();
        } else {
            alert('Please fill in all fields and select the correct answer.');
        }
    });

    // Next Question button (from queue)
    nextQuestionBtn.addEventListener('click', () => {
        if (questionQueue.length > 0) {
            // Get the first question from the queue
            currentQuestionData = questionQueue.shift();
            
            // Send to all clients
            socket.emit('updateQuestion', currentQuestionData);
            
            // Update active question display
            let teamText = currentQuestionData.team !== null ? 
                ` (Team ${currentQuestionData.team + 1})` : '';
            activeQuestionTitle.textContent = truncateText(currentQuestionData.question, 40) + teamText;
            
            // Enable control buttons
            showAnswerBtn.disabled = false;
            resetHighlightsBtn.disabled = false;
            
            // Update the queue display
            renderQuestionQueue();
            
            // Disable Next Question button if queue is empty
            if (questionQueue.length === 0) {
                nextQuestionBtn.disabled = true;
            }
        }
    });

    // Show answer button
    showAnswerBtn.addEventListener('click', () => {
        if (currentQuestionData && currentQuestionData.correctAnswer) {
            socket.emit('highlightAnswer', {
                correctAnswer: currentQuestionData.correctAnswer,
                showWrong: true
            });
        }
    });

    // Reset highlights button
    resetHighlightsBtn.addEventListener('click', () => {
        socket.emit('resetHighlights');
    });

    // Clear question form
    clearQuestionBtn.addEventListener('click', () => {
        clearQuestionForm();
    });

    // Clear queue button
    clearQueueBtn.addEventListener('click', () => {
        if (questionQueue.length > 0 && confirm('Are you sure you want to clear all questions from the queue?')) {
            questionQueue.length = 0;
            renderQuestionQueue();
            nextQuestionBtn.disabled = true;
        }
    });

    function validateQuestionForm() {
        if (!questionInput.value) return false;
        if (!answerInputs.a.value || !answerInputs.b.value || 
            !answerInputs.c.value || !answerInputs.d.value) return false;
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
        
        // Reset team selection to "No Team"
        selectedTeam = null;
        document.querySelectorAll('.team-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.team === 'null');
        });
    }

    function addToQuestionQueue(questionData) {
        // Add to our local array
        questionQueue.push(questionData);
        
        // Update the UI
        renderQuestionQueue();
    }

    function removeFromQuestionQueue(index) {
        if (index >= 0 && index < questionQueue.length) {
            questionQueue.splice(index, 1);
            renderQuestionQueue();
            
            // Disable Next Question button if queue is now empty
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
            
            // Add team indicator if question is assigned to a team
            const teamLabel = q.team !== null ? 
                `<span class="queue-team-indicator">Team ${q.team + 1}</span>` : '';
            
            item.innerHTML = `
                <div class="queue-item-text">
                    <span class="queue-position">${index + 1}</span>
                    ${truncateText(q.question, 50)}
                    ${teamLabel}
                </div>
                <div class="queue-item-actions">
                    <button class="queue-item-btn" data-action="edit" data-index="${index}" title="Edit">✏️</button>
                    <button class="queue-item-btn" data-action="delete" data-index="${index}" title="Delete">🗑️</button>
                </div>
            `;
            
            questionList.appendChild(item);
        });
        
        // Add click events
        document.querySelectorAll('.queue-item').forEach(item => {
            // Edit on click of the item (but not the buttons)
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.queue-item-actions')) {
                    const index = parseInt(item.dataset.index);
                    loadQuestionFromQueue(index);
                }
            });
        });
        
        // Add button events
        document.querySelectorAll('.queue-item-btn[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                loadQuestionFromQueue(index);
                removeFromQuestionQueue(index); // Remove from queue when editing
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
            
            // Fill form with question data
            questionInput.value = q.question;
            answerInputs.a.value = q.answers.a;
            answerInputs.b.value = q.answers.b;
            answerInputs.c.value = q.answers.c;
            answerInputs.d.value = q.answers.d;
            
            // Select correct answer button
            correctButtons.forEach(btn => {
                if (btn.dataset.answer === q.correctAnswer) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
            
            selectedCorrectAnswer = q.correctAnswer;
            
            // Set team selection
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
    
    // Initial setup
    updateTeamButtons();
});