document.addEventListener('DOMContentLoaded', () => {
    // Connect to WebSocket server
    const socket = io();
    
    const contestantsContainer = document.getElementById('contestants-container');
    
    // Listen for scoreboard updates
    socket.on('updateScoreboard', (data) => {
        updateScoreboard(data.contestants, data.round, data.mode);
    });
    
    // Track previous mode to detect changes
    let previousMode = null;
    
    function updateScoreboard(contestants, round, mode) {
        // Update round
        document.getElementById('round-number').textContent = round;
        
        // Check if mode has changed
        const modeChanged = previousMode !== null && previousMode !== mode;
        
        // If mode changed, add animation class
        if (modeChanged) {
            // Add animation class to container
            contestantsContainer.classList.add('mode-transition');
            
            // After animation completes, update the content
            setTimeout(() => {
                updateContestantElements(contestants, mode);
                contestantsContainer.classList.remove('mode-transition');
            }, 400); // Half of the animation duration
        } else {
            // If no mode change, update immediately
            updateContestantElements(contestants, mode);
        }
        
        // Store current mode for next comparison
        previousMode = mode;
    }
    
    function updateContestantElements(contestants, mode) {
        // Clear contestants container
        contestantsContainer.innerHTML = '';
        
        // Set mode class (2 or 3 contestants)
        contestantsContainer.className = 'contestants-container ' + 
            (mode === 3 ? 'three-contestants' : 'two-contestants');
        
        // Create contestant elements with staggered animations
        contestants.forEach((contestant, index) => {
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
    
    // Listen for score updates and animate changes
    socket.on('scoreUpdate', (data) => {
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

    // Add a fun launch animation
    document.querySelector('.scoreboard-container').classList.add('launch-animation');
});