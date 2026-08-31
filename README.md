# ♟️ Chess — Real-Time Multiplayer Chess

A full-stack web-based chess application that allows players to play chess through a modern interactive interface. The project follows a separate frontend/backend architecture and is designed for real-time gameplay.

## 🚀 Live Demo

**[Play Chess Online](https://chess-frontend-silk.vercel.app/)**

---

## ✨ Features

* ♟️ Interactive chess board
* 🎮 Real-time multiplayer gameplay
* 👥 Play chess with another player
* 🔄 Real-time game state synchronization
* ✅ Legal chess move handling
* 👑 Check and checkmate detection
* 🏰 Special chess moves such as castling and pawn promotion
* 📜 Move tracking
* 📱 Responsive interface
* ⚡ Fast and interactive frontend
* 🔌 Frontend–backend communication through APIs/WebSockets
* 🌐 Production deployment support

---

## 🛠️ Tech Stack

### Frontend

* React
* JavaScript
* HTML5
* CSS3
* Vite
* Chess.js
* WebSocket / Socket.IO

### Backend

* Node.js
* Express.js
* WebSocket / Socket.IO
* REST APIs

### Deployment

* **Frontend:** Vercel
* **Backend:** Render

---

## 🏗️ Project Architecture

```text
chess/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── package.json
├── package-lock.json
└── .gitignore
```

The application is divided into two major components:

```text
             ┌──────────────────────┐
             │      Chess Client    │
             │   React + Vite       │
             └──────────┬───────────┘
                        │
                  HTTP / WebSocket
                        │
                        ▼
             ┌──────────────────────┐
             │    Chess Backend     │
             │ Node.js + Express    │
             │ WebSocket / Socket.IO│
             └──────────────────────┘
```

The frontend is responsible for the user interface and chess interactions, while the backend manages game communication and synchronization between players.

---

## 💻 Getting Started

### Prerequisites

Make sure you have the following installed:

* [Node.js](https://nodejs.org/)
* npm
* Git

### 1. Clone the repository

```bash
git clone https://github.com/navateja-tech/chess.git
cd chess
```

---

## 🎨 Frontend Setup

Navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create the required environment file:

```bash
.env
```

Add your backend URL according to your environment:

```env
VITE_API_URL=http://localhost:5000
```

Start the development server:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

---

## ⚙️ Backend Setup

Open another terminal and navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file and configure the required environment variables.

Example:

```env
PORT=5000
```

Start the backend:

```bash
npm run dev
```

If the backend uses a different start command in your configuration, use the corresponding script from `backend/package.json`.

---

## 🔄 Development Workflow

Run both applications during development:

### Terminal 1 — Frontend

```bash
cd frontend
npm run dev
```

### Terminal 2 — Backend

```bash
cd backend
npm run dev
```

Then open the frontend URL in your browser.

---

## 🌐 Deployment

### Frontend — Vercel

The frontend can be deployed using Vercel.

```text
Build Command:
npm run build

Output Directory:
dist
```

Configure the production backend URL in the Vercel environment variables.

Example:

```env
VITE_API_URL=https://your-backend.onrender.com
```

### Backend — Render

Deploy the backend as a Node.js web service on Render.

Typical configuration:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

Make sure the backend listens on the port provided by Render:

```javascript
const PORT = process.env.PORT || 5000;
```

---

## 🔐 Environment Variables

Do not commit sensitive credentials or environment variables to GitHub.

Use `.env` files locally and configure production environment variables through your hosting provider.

Example:

```env
PORT=5000
VITE_API_URL=http://localhost:5000
```

> The exact variables may vary depending on the backend configuration.

---

## 🧠 How It Works

The application follows a client-server architecture.

1. A player interacts with the chess board.
2. The frontend validates/processes the move.
3. The move is sent to the backend.
4. The backend manages the game session and communicates the updated state.
5. The opponent receives the updated board state in real time.
6. Both players remain synchronized throughout the game.

---

## 📌 Future Improvements

Some possible improvements include:

* 🤖 Play against an AI opponent
* 🏆 ELO/rating system
* 👤 User authentication
* 📊 Player statistics
* 🏅 Leaderboards
* 💬 In-game chat
* ⏱️ Chess clocks
* 🎯 Chess puzzles
* 📜 Complete game history
* 🔁 Game replay
* 🌙 Dark/light themes
* 📱 Improved mobile experience
* 🧪 Automated testing

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a new branch.

```bash
git checkout -b feature/your-feature
```

3. Make your changes.
4. Commit your changes.

```bash
git commit -m "Add your feature"
```

5. Push the branch.

```bash
git push origin feature/your-feature
```

6. Open a Pull Request.

---

## 📄 License

This project is available for educational and personal use.

---

## 👨‍💻 Author

**Navateja**

GitHub: [@navateja-tech](https://github.com/navateja-tech)

---

⭐ If you found this project useful, consider giving the repository a star!


https://github.com/user-attachments/assets/20c0076b-295c-4081-b0d7-5f969f4c4f20

