# AI Orb Chatbot with Gemini Integration

A beautiful, interactive AI chatbot featuring a stunning animated orb interface powered by Google's Gemini AI.

## ✨ Features

- **Stunning Animated Orb**: Beautiful CSS-based animated orb that responds to chat states
- **Gemini AI Integration**: Powered by Google's Gemini 2.5 Flash model
- **Real-time Chat**: Smooth, responsive chat interface
- **Dark/Light Theme**: Toggle between themes
- **Settings Panel**: Customize AI personality and orb behavior
- **Responsive Design**: Works on all devices
- **Error Handling**: Robust error handling with fallback animations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Google Gemini API key

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo>
   cd ai-orb-chatbot
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=5000
   ```
   
   **Getting a Gemini API Key:**
   1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   2. Sign in with your Google account
   3. Click "Create API Key"
   4. Copy the key to your `.env` file

3. **Start the backend server:**
   ```bash
   npm run server
   ```
   
   You should see:
   ```
   ✅ GEMINI key loaded: true
   🔑 API Key length: 39
   🤖 Using Gemini model: gemini-2.5-flash
   ✅ Server running on port 5000
   🏥 Health check: http://localhost:5000/api/health
   💬 Chat endpoint: http://localhost:5000/api/chat
   ```

4. **Start the frontend (in a new terminal):**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

### Running Both Servers

You need to run both the backend (Express) and frontend (Next.js) servers:

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## 🧪 Testing

### Test the Backend API

**Health Check:**
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"ok":true,"model":"gemini-2.5-flash","timestamp":"2025-10-08T15:04:14.159Z"}
```

**Chat Test:**
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, can you help me?"}'
```

Expected response:
```json
{"reply":"Yes, I can! Please tell me what you need help with. I'm ready to assist you."}
```

**PowerShell (Windows):**
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/chat" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"message":"Hello"}'
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes | - |
| `PORT` | Backend server port | No | 5000 |

### Available npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js frontend dev server (port 3000) |
| `npm run server` | Start Express backend server (port 5000) |
| `npm run dev:server` | Alias for `npm run server` |
| `npm run backend` | Alias for `npm run server` |
| `npm run build` | Build Next.js for production |
| `npm start` | Start Next.js production server |
| `npm run lint` | Run ESLint |

## 🏗️ Architecture

### Project Structure

```
ai-orb-chatbot/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (legacy)
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── animated-orb.tsx   # Animated orb component
│   ├── chat-ui-express.tsx # Chat UI (Express backend)
│   ├── chat-ui.tsx        # Chat UI (API routes)
│   ├── safe-orb-wrapper.tsx # Orb wrapper with error handling
│   ├── settings-panel.tsx # Settings panel
│   └── ui/                # shadcn/ui components
├── server/                # Express backend
│   ├── index.js           # Backend entry point ⭐
│   └── utils/
│       └── gemini.js      # Gemini API helper (optional)
├── .env                   # Environment variables (DO NOT COMMIT)
├── .env.example           # Example environment file
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

### Frontend Stack
- **Next.js 15** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **shadcn/ui** component library

### Backend Stack
- **Express 5** for HTTP server
- **Google Generative AI SDK** (@google/generative-ai)
- **CORS** for cross-origin requests
- **dotenv** for environment variables

### Key Components
- `SafeOrbWrapper`: Handles orb rendering with fallbacks
- `FallbackOrb`: CSS-based animated orb
- `ChatUI`: Main chat interface
- `SplashScreen`: Landing page with animated orb
- `server/index.js`: Backend API with locked model name

## 🐛 Troubleshooting

### Common Issues

**"Failed to fetch" / "ERR_CONNECTION_REFUSED"**
- ✅ Make sure the backend server is running (`npm run server`)
- ✅ Check that the server is running on port 5000
- ✅ Verify the frontend is fetching from `http://localhost:5000/api/chat`
- ✅ Check CORS is enabled in the backend

**"Missing GEMINI_API_KEY in environment"**
- ✅ Create a `.env` file in the root directory
- ✅ Add your API key: `GEMINI_API_KEY=your_key_here`
- ✅ Restart the backend server

**"Gemini API request failed" / Model not found errors**
- ✅ The backend now uses `gemini-2.5-flash` (confirmed available)
- ✅ Check your API key is valid
- ✅ Ensure you have sufficient API quota
- ✅ Verify the key has proper permissions

**Orb not animating**
- ✅ The app uses CSS-based fallback animations
- ✅ Check browser console for any JavaScript errors
- ✅ Ensure Framer Motion is properly installed

**Chat not responding**
- ✅ Check network connectivity
- ✅ Verify the backend server is running
- ✅ Check browser developer tools Network tab
- ✅ Test the backend API directly with curl

### Debugging Tips

1. **Check backend logs:**
   - Look for `✅ Server running on port 5000` message
   - Check for any error messages in the terminal

2. **Test backend independently:**
   - Use the curl commands in the Testing section
   - Verify the health endpoint works

3. **Check browser console:**
   - Look for network errors
   - Check for CORS issues
   - Verify fetch URLs are correct

4. **Restart everything:**
   - Stop both frontend and backend
   - Delete `node_modules` and run `npm install`
   - Restart both servers

## 📝 API Reference

### Backend Endpoints

#### Health Check
**GET** `/api/health`

Returns server status and configuration.

**Response:**
```json
{
  "ok": true,
  "model": "gemini-2.5-flash",
  "timestamp": "2025-10-08T15:04:14.159Z"
}
```

#### Chat
**POST** `/api/chat`

Sends a message to Gemini AI and returns a response.

**Request:**
```json
{
  "message": "Hello, how are you?"
}
```

**Response:**
```json
{
  "reply": "Hello! I'm doing well, thank you for asking. How can I help you today?"
}
```

**Error Response:**
```json
{
  "error": "Failed to generate response",
  "details": "Error message here",
  "model": "gemini-2.5-flash"
}
```

## 🎨 Customization

### AI Personality
The chatbot supports different AI personalities through the settings panel:
- **Friendly**: Warm and conversational
- **Formal**: Professional and structured  
- **Sarcastic**: Witty and humorous
- **Concise**: Brief and to-the-point

### Orb Themes
Customize the animated orb with different color themes:
- **Default**: Sky blue, white, and indigo
- **Aurora**: Greens, pinks, and yellows
- **Nebula**: Purples, blues, and deep reds
- **Monochrome**: Grays and white

### Changing the Gemini Model

The backend uses `gemini-2.5-flash` by default. This model is **locked** in `server/index.js` to prevent automatic changes. To use a different model:

1. Open `server/index.js`
2. Find the `MODEL_NAME` constant (around line 25)
3. Change it to one of the available models:
   - `gemini-2.5-flash` (default, stable)
   - `gemini-2.5-pro` (more powerful)
   - `gemini-flash-latest` (always latest)
   - `gemini-pro-latest` (always latest pro)

**⚠️ Important:** Only change the model if you're certain the new model is available and supports `generateContent`.

## 🚀 Deployment

### Deploying the Backend

The Express backend needs to be deployed separately from the Next.js frontend.

**Options:**
- **Railway**: Perfect for Express apps
- **Render**: Free tier available
- **Heroku**: Classic choice
- **AWS/GCP/Azure**: For production

**Environment Variables:**
- Set `GEMINI_API_KEY` in your deployment platform
- Set `PORT` if required (most platforms set this automatically)

### Deploying the Frontend

**Vercel (Recommended):**
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Update frontend fetch URL to point to your backend
4. Deploy automatically

**Other Platforms:**
- **Netlify**
- **AWS Amplify**
- **Cloudflare Pages**

**⚠️ Update Frontend URL:**
After deploying the backend, update the fetch URL in `components/chat-ui-express.tsx`:
```typescript
const response = await fetch("https://your-backend-url.com/api/chat", {
  // ...
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Google Gemini AI** for powerful language capabilities
- **Next.js** for the excellent React framework
- **Tailwind CSS** for beautiful styling
- **Framer Motion** for smooth animations
- **shadcn/ui** for accessible components

---

**Built with ❤️ using Next.js, React, and Google Gemini AI**

## 📊 Model Information

The backend uses **Gemini 2.5 Flash** model:
- **Model Name**: `gemini-2.5-flash`
- **Version**: Stable (001)
- **Description**: Mid-size multimodal model supporting up to 1 million tokens
- **Released**: June 2025
- **Input Limit**: 1,048,576 tokens
- **Output Limit**: 65,536 tokens
- **Supported Methods**: generateContent, countTokens, createCachedContent, batchGenerateContent

This model is **locked** in the code to prevent automatic changes and ensure stability.