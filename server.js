const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const os = require("os");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

const PORT = 3001;
let players = {};
let playerCount = 0; // Track the number of players for assigning player numbers
const INACTIVITY_TIMEOUT = 20000; // 20 seconds in ms

// Track parameters (server needs to know the starting line concept for initial position)
const trackCenterX = 400; // Assuming client canvas width 800
const trackCenterY = 300; // Assuming client canvas height 600
const trackRadius = 250; // Circle radius
const initialAngle = 0; // Start at the right side of the circle

function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Periodically check for inactive players
setInterval(() => {
  const now = Date.now();
  for (const id in players) {
    if (
      players[id].lastActive &&
      now - players[id].lastActive > INACTIVITY_TIMEOUT
    ) {
      // Disconnect the socket if inactive
      const socket = io.sockets.sockets.get(id);
      if (socket) {
        socket.disconnect(true);
      }
    }
  }
}, 2000); // Check every 2 seconds

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  const initialX = trackCenterX + trackRadius * Math.cos(initialAngle);
  const initialY = trackCenterY + trackRadius * Math.sin(initialAngle);

  playerCount += 1;
  const playerNumber = playerCount;
  const playerColor = getRandomColor();

  players[socket.id] = {
    x: initialX,
    y: initialY,
    angle: initialAngle,
    color: playerColor,
    id: socket.id,
    number: playerNumber, // Use number instead of name
    lastActive: Date.now(), // Track last activity
  };

  socket.emit("currentPlayers", players);
  socket.emit("yourId", socket.id, playerNumber, playerColor);
  socket.broadcast.emit("newPlayer", players[socket.id]);

  socket.on("playerMovement", (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].angle = movementData.angle;
      players[socket.id].lastActive = Date.now(); // Update last activity
      socket.broadcast.emit("playerMoved", players[socket.id]);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (players[socket.id]) {
      console.log(`Player ${players[socket.id].number} disconnected.`);
    }
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
  });
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }

  return "127.0.0.1"; // fallback
}

server.listen(PORT, () => {
  console.log(
    `Server running on http://${getLocalIP()}:${PORT} [http://localhost:${PORT}]`
  );
  console.log(
    `For LAN play, other players should connect to this machine's local IP address on port ${PORT}.`
  );
});
