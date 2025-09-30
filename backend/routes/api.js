const express = require("express");
const router = express.Router();
const Poll = require("../models/Poll");

let teacherCounter = 1;
let pollHistory = []; // In-memory fallback

// Teacher login
router.post("/teacher-login", (req, res) => {
  const username = `teacher${teacherCounter++}`;
  res.json({ username });
});

// Get poll history
router.get("/poll-history/:teacherUsername", async (req, res) => {
  const { teacherUsername } = req.params;

  try {
    if (Poll && require("mongoose").connection.readyState === 1) {
      const polls = await Poll.find({ teacherUsername }).sort({ createdAt: -1 });
      res.json(polls);
    } else {
      const teacherPolls = pollHistory.filter(
        (poll) => poll.teacherUsername === teacherUsername
      );
      res.json(teacherPolls);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch poll history" });
  }
});

// Export pollHistory for socket events
module.exports = { router, pollHistory };