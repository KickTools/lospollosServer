document.addEventListener('DOMContentLoaded', () => {
    // Connect to WebSocket server
    const socket = io();
    
    // Get contestant ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const contestantId = parseInt(urlParams.get('id')) || 0; // Default to 0 if not specified
    
    // Get DOM elements
    const nameElement = document.getElementById('contestant-name');
    const scoreElement = document.getElementById('contestant-score');
    const contestantCard = document.querySelector('.contestant-card');
    
    // Add contestant-specific class for styling
    contestantCard.classList.add(`contestant-${contestantId}`);
    
    // Initialize with loading state
    nameElement.textContent = "Loading...";
    scoreElement.textContent = "0";
    
    // Listen for scoreboard updates
    socket.on('updateScoreboard', (data) => {
        updateContestantDisplay(data.contestants, data.mode);
    });
    
    function updateContestantDisplay(contestants, mode) {
        // Check if the contestant exists in the current mode
        if (contestantId < mode) {
            const contestant = contestants.find(c => c.id === contestantId);
            if (contestant) {
                nameElement.textContent = contestant.name;
                scoreElement.textContent = contestant.score;
            }
        } else {
            // Contestant not in current mode
            nameElement.textContent = "Contestant Not Active";
            scoreElement.textContent = "-";
        }
    }
    
    // Listen for individual score updates
    socket.on('scoreUpdate', (data) => {
        if (data.id === contestantId) {
            // Add animation class
            scoreElement.classList.add('score-change');
            
            // Update the score
            scoreElement.textContent = data.score;
            
            // Remove animation class after animation completes
            setTimeout(() => {
                scoreElement.classList.remove('score-change');
            }, 700);
        }
    });
});