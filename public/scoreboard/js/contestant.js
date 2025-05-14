document.addEventListener('DOMContentLoaded', () => {
    // Connect to WebSocket server
    const socket = io();
    
    // Debug connection
    socket.on('connect', () => {
        console.log('Contestant widget connected to server with ID:', socket.id);
    });
    
    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });
    
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
    
    // Listen for ALL possible scoreboard update events
    socket.on('updateScoreboard', handleScoreboardUpdate);
    socket.on('scoreboardData', handleScoreboardUpdate);
    
    function handleScoreboardUpdate(data) {
        console.log('Received scoreboard data:', data);
        updateContestantDisplay(data.contestants, data.mode);
    }
    
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
    
    // Listen for ALL possible score update events
    socket.on('scoreUpdate', handleScoreUpdate);
    socket.on('contestant:update', handleScoreUpdate);
    socket.on('updateScore', handleScoreUpdate);
    
    function handleScoreUpdate(data) {
        console.log('Received score update:', data);
        if (data.id === contestantId) {
            // Add animation class
            scoreElement.classList.add('score-change');
            
            // Update the score
            scoreElement.textContent = data.score;
            
            // Remove animation class after animation completes
            setTimeout(() => {
                scoreElement.classList.remove('score-change');
            }, 800); // Updated to 800ms to match animation duration
        }
    }
    
    // Request initial data
    socket.emit('getScoreboard');
});