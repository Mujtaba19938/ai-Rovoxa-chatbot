import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  originalname: String,
  filename: String,
  size: Number,
  mimetype: String,
  path: String
});

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  files: [fileSchema]
});

const chatSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  chatId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  messages: [messageSchema],
  title: {
    type: String,
    default: "New Chat"
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Chat', chatSchema);