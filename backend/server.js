require('dotenv').config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const Poll = require("./models/Poll");
const { router: apiRoutes, pollHistory } = require("./routes/api");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Connect to database
connectDB();

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// In-memory storage
let currentPoll = null;
let votes = {};
let participants = [];
let chatMessages = [];

// API Routes
app.get("/", (req, res) => {
  res.json({ message: "Intervue Poll System API" });
});

app.use("/", apiRoutes);

// Socket.IO events
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("joinChat", ({ username }) => {
    if (username && !participants.includes(username)) {
      participants.push(username);
      io.emit("participantsUpdate", participants);
    }
  });

  socket.on("chatMessage", (message) => {
    chatMessages.push(message);
    io.emit("chatMessage", message);
  });

  socket.on("kickOut", (username) => {
    participants = participants.filter((p) => p !== username);
    io.emit("participantsUpdate", participants);
    io.emit("kickedOut", username);
  });

  socket.on("createPoll", async (pollData) => {
    const pollDocument = {
      question: pollData.question,
      options: pollData.options,
      timer: parseInt(pollData.timer),
      teacherUsername: pollData.teacherUsername,
      votes: {},
      createdAt: new Date(),
    };

    // Reset votes for new poll
    votes = {};

    // Check if MongoDB is connected
    if (Poll && require("mongoose").connection.readyState === 1) {
      try {
        // Save to MongoDB and let it generate the _id
        const newPoll = new Poll(pollDocument);
        await newPoll.save();
        
        // Use the MongoDB-generated ID
        currentPoll = {
          _id: newPoll._id.toString(),
          ...pollDocument
        };
        
        console.log("Poll saved to database with ID:", currentPoll._id);
      } catch (error) {
        console.error("Error saving poll:", error);
        // Fallback to in-memory if database save fails
        currentPoll = {
          _id: Date.now().toString(),
          ...pollDocument
        };
        pollHistory.push({ ...currentPoll });
      }
    } else {
      // Use in-memory storage with timestamp ID
      currentPoll = {
        _id: Date.now().toString(),
        ...pollDocument
      };
      pollHistory.push({ ...currentPoll });
    }

    io.emit("pollCreated", currentPoll);
    io.emit("pollResults", votes);
  });

  socket.on("submitAnswer", async ({ username, option, pollId }) => {
    // Update in-memory votes
    if (!votes[option]) {
      votes[option] = 0;
    }
    votes[option]++;

    console.log("Vote received:", { username, option, pollId, currentVotes: votes });

    // Check if MongoDB is connected
    if (Poll && require("mongoose").connection.readyState === 1) {
      try {
        // Update the poll's votes in the database
        const updatedPoll = await Poll.findByIdAndUpdate(
          pollId,
          { 
            $set: { votes: votes }
          },
          { new: true }
        );
        
        if (updatedPoll) {
          console.log("Poll votes updated in database:", updatedPoll.votes);
        } else {
          console.log("Poll not found in database, using in-memory storage");
        }
      } catch (error) {
        console.error("Error updating poll votes:", error);
        // Continue anyway - votes are still tracked in memory
      }
    } else {
      // Update in-memory storage
      const pollIndex = pollHistory.findIndex((p) => p._id === pollId);
      if (pollIndex !== -1) {
        pollHistory[pollIndex].votes = { ...votes };
        console.log("Poll votes updated in memory:", pollHistory[pollIndex].votes);
      }
    }

    // Broadcast updated votes to all clients
    io.emit("pollResults", votes);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});