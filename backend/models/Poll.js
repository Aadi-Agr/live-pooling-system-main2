const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema({
  question: String,
  options: [
    {
      id: Number,
      text: String,
      correct: Boolean,
    },
  ],
  timer: Number,
  teacherUsername: String,
  votes: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Poll", pollSchema);