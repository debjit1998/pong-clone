import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
const app = express();
const server = http.createServer(app);

function randomNumberBetween(min, max) {
  return Math.random() * (max - min) + min;
}
let VELOCITY = 0.5;

const io = new Server(server);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_, res) => {
  res.sendFile("index.html");
});

const connections = {};

let direction = { x: 0 };
let position = { x: 50, y: 50 };
let paddlePos = {};
let score = { left: 0, right: 0 };

const startGame = () => {
  VELOCITY = 0.5;
  direction = { x: 0 };
  position = { x: 50, y: 50 };
  Object.keys(paddlePos).forEach((key) => (paddlePos[key] = 50));

  while (Math.abs(direction.x) <= 0.2 || Math.abs(direction.x) >= 0.9) {
    const heading = randomNumberBetween(0, 2 * Math.PI);
    direction = { x: Math.cos(heading), y: Math.sin(heading) };
  }
};

let interval;
let collisionTimer;

io.on("connection", (socket) => {
  if (Object.entries(connections).length === 2) {
    socket.emit("current", {
      full: true,
    });
    return;
  }
  paddlePos[socket.id] = 50;
  if (
    Object.entries(connections).length === 0 ||
    Object.values(connections).includes("right")
  ) {
    connections[socket.id] = "left";
  } else {
    connections[socket.id] = "right";
  }

  if (Object.entries(connections).length === 1) {
    startGame();
  }

  const getOpponent = () => {
    const conn = Object.keys(connections).filter((c) => c !== socket.id);
    if (conn) return paddlePos[conn];
    return 50;
  };

  socket.emit("current", {
    value: connections[socket.id],
    opponentPos: getOpponent(),
    score,
  });
  socket.broadcast.emit("opponent updated", 50);

  if (!interval) {
    interval = setInterval(() => {
      if (position.x > 101 || position.x < -1) {
        if (position.x > 101) {
          score.left += 1;
        } else score.right += 1;
        io.emit("update score", score);
        startGame();
        return;
      }
      if (position.y >= 99.5 || position.y <= 0) {
        direction.y *= -1;
      }
      position = {
        ...position,
        x: position.x + direction.x * VELOCITY,
        y: position.y + direction.y * VELOCITY,
      };
      io.emit("update ball", position);
    }, 30);
  }

  socket.on("update paddle", (position) => {
    paddlePos[socket.id] = position;
    socket.broadcast.emit("opponent updated", position);
  });

  function handleCollision() {
    if (collisionTimer) return;
    direction.x *= -1;
    VELOCITY += 0.3;
    collisionTimer = setTimeout(() => {
      clearTimeout(collisionTimer);
      collisionTimer = null;
    }, 1000);
  }

  socket.on("collision", handleCollision);

  socket.on("disconnect", () => {
    delete connections[socket.id];
    delete paddlePos[socket.id];
    if (Object.entries(connections).length === 0) {
      clearInterval(interval);
      interval = null;
      VELOCITY = 0.5;
      direction = { x: 0 };
      position = { x: 50, y: 50 };
      score = { left: 0, right: 0 };
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port 3000");
});
