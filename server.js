const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allows your GitHub Pages frontend to connect
    methods: ["GET", "POST"]
  }
});

let currentGameState = {};
let studentStore = {};

io.on('connection', (socket) => {
  // Send existing state upon connection
  socket.emit('gameStateUpdated', currentGameState);
  socket.emit('studentListUpdated', studentStore);

  socket.on('updateGameState', (newState) => {
    currentGameState = { ...currentGameState, ...newState };
    io.emit('gameStateUpdated', currentGameState);
  });

  socket.on('updateStudentsStore', (store) => {
    studentStore = store;
    io.emit('studentListUpdated', studentStore);
  });

  socket.on('tutorPenalty', () => {
    if (currentGameState.status === 'playing') {
      currentGameState.points = Math.max(0, (currentGameState.points || 0) - 10);
      io.emit('gameStateUpdated', currentGameState);
    }
  });

  socket.on('tutorEndRound', (data) => {
    if (currentGameState.status === 'playing') {
      const success = data.success;
      const baseline = currentGameState.baseline || 50;
      const finalBaseline = success ? baseline : 0;
      const finalBonus = success ? Math.max(0, currentGameState.points - baseline) : 0;
      const finalEarned = finalBaseline + finalBonus;

      currentGameState = {
        status: 'summary',
        success: success,
        earned: finalEarned,
        baselineEarned: finalBaseline,
        bonusEarned: finalBonus,
        tier: currentGameState.tier,
        isNewRecord: false
      };
      io.emit('gameStateUpdated', currentGameState);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});