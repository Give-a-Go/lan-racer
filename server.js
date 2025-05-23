const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

const PORT = 3001;
let players = {};

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

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  const initialX = trackCenterX + trackRadius * Math.cos(initialAngle);
  const initialY = trackCenterY + trackRadius * Math.sin(initialAngle);

  players[socket.id] = {
    x: initialX,
    y: initialY,
    angle: initialAngle,
    color: getRandomColor(),
    id: socket.id,
    name: `Racer_${socket.id.substring(0, 4)}`,
  };

  socket.emit("currentPlayers", players);
  socket.emit("yourId", socket.id, players[socket.id].name);
  socket.broadcast.emit("newPlayer", players[socket.id]);

  socket.on("playerMovement", (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].angle = movementData.angle;
      socket.broadcast.emit("playerMoved", players[socket.id]);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (players[socket.id]) {
      console.log(`${players[socket.id].name} disconnected.`);
    }
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(
    `For LAN play, other players should connect to this machine's local IP address on port ${PORT}.`
  );
});
