# Chat History Setup Guide

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ai-orb-chat

# Server Configuration
PORT=5000
```

## MongoDB Setup

### Option 1: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use the default connection string: `mongodb://localhost:27017/ai-orb-chat`

### Option 2: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string and update `MONGODB_URI` in `.env`

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Express server (for chat history):
   ```bash
   npm run server
   ```

3. Start the Next.js development server (in a new terminal):
   ```bash
   npm run dev
   ```

## Features Added

✅ **Persistent Chat History**
- Messages are stored in MongoDB
- Each user has a unique ID stored in localStorage
- Chat history persists across browser sessions

✅ **API Endpoints**
- `POST /api/chat` - Send message and get AI response
- `GET /api/chat/:userId` - Retrieve chat history
- `DELETE /api/chat/:userId` - Clear chat history

✅ **Frontend Integration**
- Automatic user ID generation and storage
- Chat history loading on page refresh
- Clear chat functionality
- Export chat feature
- Toast notifications for user feedback

✅ **Database Schema**
```javascript
{
  userId: String,       // unique identifier for user/session
  messages: [
    {
      sender: "user" | "ai",
      text: String,
      timestamp: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

## Testing

1. Open the application in your browser
2. Send a few messages
3. Refresh the page - your chat history should be preserved
4. Use the "Clear Chat" option to test the delete functionality
5. Check the browser's localStorage to see your user ID

## Troubleshooting

- **MongoDB Connection Issues**: Ensure MongoDB is running and the connection string is correct
- **API Errors**: Check that both the Express server (port 5000) and Next.js dev server are running
- **Missing Chat History**: Verify the user ID is being generated and stored in localStorage
