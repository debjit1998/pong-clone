const paddleLeft = document.querySelector(".paddle.left");
const paddleRight = document.querySelector(".paddle.right");
const scoreLeft = document.querySelector(".score .left");
const scoreRight = document.querySelector(".score .right");
const lobbyFull = document.querySelector(".lobby-full");

const socket = new io();
const ball = new Ball(document.querySelector(".ball"));

let lastTime = null;
let socketId;

socket.on("connect", () => {
  socketId = socket.id;

  socket.emit("initial data", {
    height: window.innerHeight,
    width: window.innerWidth,
  });

  socket.on("update ball", (position) => {
    const paddleRects = [
      paddleLeft.getBoundingClientRect(),
      paddleRight.getBoundingClientRect(),
    ];
    if (!ball.update(position, paddleRects)) {
      socket.emit("collision");
    }
  });

  socket.on("update score", (score) => {
    scoreLeft.textContent = score.left;
    scoreRight.textContent = score.right;
  });

  socket.on("opponent updated", (position) => {
    const currentElm = document.getElementById("opponent");
    currentElm.style.setProperty("--position", position);
  });

  socket.on("current", ({ value, opponentPos, score, full }) => {
    if (full) {
      lobbyFull.classList.add("show");
      scoreLeft.style.display = "none";
      scoreRight.style.display = "none";
      paddleLeft.style.display = "none";
      paddleRight.style.display = "none";
      document.querySelector(".ball").style.display = "none";
      return;
    }
    if (value === "left") {
      paddleLeft.id = "mine";
      paddleRight.id = "opponent";
      paddleRight.style.setProperty("--position", opponentPos);
      paddleLeft.dataset.socket = socketId;
    } else {
      paddleLeft.id = "opponent";
      paddleRight.id = "mine";
      paddleRight.dataset.socket = socketId;
      paddleLeft.style.setProperty("--position", opponentPos);
    }

    scoreLeft.textContent = score.left;
    scoreRight.textContent = score.right;

    const currentElm = document.getElementById("mine");
    document.addEventListener("mousemove", (e) => {
      const position = (e.y / window.innerHeight) * 100;
      currentElm.style.setProperty("--position", position);
      socket.emit("update paddle", position);
    });
  });
});
