const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initial scoreboard data
let scoreboardData = {
    contestants: [
        { id: 0, name: 'Contestant 1', score: 0 },
        { id: 1, name: 'Contestant 2', score: 0 },
        { id: 2, name: 'Contestant 3', score: 0 }
    ],
    round: 1,
    mode: 2 // Default to 2 contestants
};

let currentQuestion = null;

// Admin credentials (in a production app, use environment variables or a database)
const adminCredentials = {
    username: 'admin',
    passcode: 'gameshow123'
};

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log('A user connected');

    // Send initial scoreboard data to all clients
    socket.emit('updateScoreboard', {
        contestants: scoreboardData.mode === 2
            ? scoreboardData.contestants.slice(0, 2)
            : scoreboardData.contestants,
        round: scoreboardData.round,
        mode: scoreboardData.mode
    });

    // Admin login
    socket.on('adminLogin', (data, callback) => {
        if (data.username === adminCredentials.username &&
            data.passcode === adminCredentials.passcode) {
            socket.join('admin');
            callback({ success: true });
        } else {
            callback({ success: false });
        }
    });

    // Get scoreboard data (admin only)
    socket.on('getScoreboard', () => {
        if (socket.rooms.has('admin')) {
            socket.emit('scoreboardData', scoreboardData);
        }
    });

    // Update scoreboard (admin only)
    socket.on('updateScoreboard', (data) => {
        if (socket.rooms.has('admin')) {
            scoreboardData = data;

            // Broadcast updates to all clients
            io.emit('updateScoreboard', {
                contestants: data.mode === 2
                    ? data.contestants.slice(0, 2)
                    : data.contestants,
                round: data.round,
                mode: data.mode
            });
        }
    });

    // Update individual score (admin only)
    socket.on('updateScore', (data) => {
        if (socket.rooms.has('admin')) {
            if (scoreboardData.contestants[data.id]) {
                scoreboardData.contestants[data.id].score = data.score;

                // Broadcast score update to all clients
                io.emit('scoreUpdate', {
                    id: data.id,
                    score: data.score
                });
            }
        }
    });

    socket.on('updateQuestion', (data) => {
        if (socket.rooms.has('admin')) {
            currentQuestion = data;
            io.emit('updateQuestion', data);
        }
    });

    socket.on('highlightAnswer', (data) => {
        if (socket.rooms.has('admin')) {
            io.emit('highlightAnswer', data);
        }
    });

    socket.on('resetHighlights', () => {
        if (socket.rooms.has('admin')) {
            io.emit('resetHighlights');
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add this route to your server.js file
app.get('/contestant', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contestant.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/questions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'questions.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});