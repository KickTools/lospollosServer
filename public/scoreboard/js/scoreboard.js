document.addEventListener('DOMContentLoaded', () => {
    // Connect to WebSocket server
    const socket = io();

    // Track state to avoid duplicate updates
    let currentRound = 1;
    let currentMode = 2;
    let previousMode = null;

    // Get DOM elements
    const contestantsContainer = document.getElementById('contestants-container');
    const roundNumberElement = document.getElementById('round-number');

    socket.on('connect', () => {
        console.log('Widget connected to server with ID:', socket.id);
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    // Reconnection handling
    socket.on('reconnect', () => {
        console.log('Reconnected to server, requesting latest data');
        socket.emit('getScoreboard');
    });

    // Handle round updates
    socket.on('round:updated', (data) => {

        // Update round number
        if (data.round) {
            currentRound = data.round;
            roundNumberElement.textContent = data.round;
        }

        // Update mode if provided
        if (data.mode) {
            currentMode = data.mode;
        }

        // Update teams if provided
        if (data.teams && Array.isArray(data.teams)) {
            updateContestantElements(data.teams, currentMode);
        }
    });

    // Handle individual score updates
    socket.on('contestant:update', (data) => {
        const scoreEl = document.getElementById(`score-${data.id}`);
        const contestantEl = document.getElementById(`contestant-${data.id}`);

        if (scoreEl) {
            // Add animation classes
            scoreEl.classList.add('score-change');
            contestantEl.classList.add('highlight');

            // Update the score
            scoreEl.textContent = data.score;

            // Remove animation classes after animation completes
            setTimeout(() => {
                scoreEl.classList.remove('score-change');
                contestantEl.classList.remove('highlight');
            }, 700);
        }
    });

    // Handle complete scoreboard updates
    socket.on('scoreboard:data', (data) => {

        // Update mode if it changed
        if (data.mode) {
            currentMode = data.mode;
        }

        // Check if mode has changed from previous state
        const modeChanged = previousMode !== null && previousMode !== currentMode;

        // If mode changed, add animation class
        if (modeChanged) {
            // Add animation class to container
            contestantsContainer.classList.add('mode-transition');

            // After animation completes, update the content
            setTimeout(() => {
                updateContestantElements(data.teams, currentMode);
                contestantsContainer.classList.remove('mode-transition');
            }, 400); // Half of the animation duration
        } else if (data.teams && Array.isArray(data.teams)) {
            // If no mode change, update immediately
            updateContestantElements(data.teams, currentMode);
        }

        // Store current mode for next comparison
        previousMode = currentMode;
    });

    function updateContestantElements(contestants, mode) {
        if (!contestants || !Array.isArray(contestants)) return;

        // Clear contestants container
        contestantsContainer.innerHTML = '';

        // Set mode class (2 or 3 contestants)
        contestantsContainer.className = 'contestants-container ' +
            (mode === 3 ? 'three-contestants' : 'two-contestants');

        // Create contestant elements with staggered animations
        contestants.forEach((contestant) => {
            const contestantEl = document.createElement('div');
            contestantEl.className = 'contestant';
            contestantEl.id = `contestant-${contestant.id}`;

            contestantEl.innerHTML = `
                <h2 class="contestant-name">${contestant.name}</h2>
                <div class="score" id="score-${contestant.id}">${contestant.score}</div>
            `;

            // Add to DOM
            contestantsContainer.appendChild(contestantEl);
        });
    }

    // Add a fun launch animation on initial load
    document.querySelector('.scoreboard-container').classList.add('launch-animation');

    // Request initial data
    socket.emit('getScoreboard');
});