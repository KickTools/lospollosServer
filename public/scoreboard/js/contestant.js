// /js/contestant.js
// use ?id=# 1-3 for contestant parameter
document.addEventListener('DOMContentLoaded', () => {
    // Connect to WebSocket server
    const socket = io();
    
    // Debug connection
    socket.on('connect', () => {
        console.log('Contestant widget connected to server with ID:', socket.id);
        
        // Start periodic refresh after connection
        startPeriodicRefresh();
    });
    
    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });
    
    // Reconnection handling
    socket.on('reconnect', () => {
        console.log('Reconnected to server, requesting latest data');
        socket.emit('getScoreboard');
    });
    
    // Get contestant ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const contestantId = parseInt(urlParams.get('id')) || 0; // Default to 0 if not specified
    
    // Get DOM elements
    const nameElement = document.getElementById('contestant-name');
    const scoreElement = document.getElementById('contestant-score');
    const contestantCard = document.querySelector('.contestant-card');
    
    // Track current score to avoid unnecessary updates
    let currentScore = null;
    
    // Add contestant-specific class for styling
    contestantCard.classList.add(`contestant-${contestantId}`);
    
    // Initialize with loading state
    nameElement.textContent = "Loading...";
    scoreElement.textContent = "0";
    
    // Handle scoreboard data updates (full data refresh)
    socket.on('scoreboard:data', (data) => {
        
        if (data.teams && Array.isArray(data.teams)) {
            // Find our team in the teams array
            const myTeam = data.teams.find(team => team.id === contestantId);
            
            if (myTeam) {
                // Always update name as it might change
                nameElement.textContent = myTeam.name;
                
                // Update score without animation if it's a periodic refresh
                // or if the score hasn't changed
                if (currentScore === null || myTeam.score === currentScore) {
                    scoreElement.textContent = myTeam.score;
                } else if (myTeam.score !== currentScore) {
                    // Add animation class only if score actually changed
                    scoreElement.classList.add('score-change');
                    scoreElement.textContent = myTeam.score;
                    
                    // Remove animation class after animation completes
                    setTimeout(() => {
                        scoreElement.classList.remove('score-change');
                    }, 800);
                }
                
                // Update current score reference
                currentScore = myTeam.score;
            } else {
                nameElement.textContent = "Team Not Found";
                scoreElement.textContent = "-";
                currentScore = null;
            }
        }
    });
    
    // Handle individual team score updates
    socket.on('contestant:update', (data) => {
        
        if (data.id === contestantId) {
            // Add animation class
            scoreElement.classList.add('score-change');
            
            // Update the score
            scoreElement.textContent = data.score;
            currentScore = data.score;
            
            // Remove animation class after animation completes
            setTimeout(() => {
                scoreElement.classList.remove('score-change');
            }, 800); // Match animation duration
        }
    });
    
    // Set up periodic refresh to maintain connection and ensure data is current
    function startPeriodicRefresh() {
        // Request fresh data every 30 seconds without animation
        const refreshInterval = setInterval(() => {
            // Only refresh if socket is connected
            if (socket.connected) {
                socket.emit('getScoreboard');
            }
        }, 30000); // 30 seconds
        
        // Clean up interval on page unload
        window.addEventListener('beforeunload', () => {
            clearInterval(refreshInterval);
        });
    }
    
    // Request initial data
    socket.emit('getScoreboard');
});