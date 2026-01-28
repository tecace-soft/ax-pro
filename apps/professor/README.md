# AX Pro Professor App

A production-ready React + TypeScript chat application with Teams-like interface, real-time streaming, and enterprise features.

## ✨ Features

- **🌓 Dark/Light Theme**: Auto-detects system preference with manual toggle
- **🌍 Internationalization**: English/Korean language support with persistence
- **🔐 Demo Authentication**: Hardcoded demo accounts for testing
- **🛡️ Role-based Access**: User and admin routes with proper protection
- **💾 Persistent Settings**: Theme and language preferences saved to localStorage
- **🎨 CSS Variables**: Dynamic theming with accessible contrast ratios
- **📱 Responsive Design**: Mobile-first approach with enterprise styling
- **💬 ChatGPT-style Interface**: Two-pane layout with session management
- **🔄 Real-time Streaming**: SSE-based message streaming with typing indicators
- **📚 RAG Citations**: Expandable reference sections with source links
- **👍 Message Feedback**: Thumbs up/down with optional notes
- **🔍 Session Search**: Search through conversation history
- **📝 Session Management**: Rename, close, delete conversations
- **🏷️ Auto-naming**: Sessions automatically named from first message
- **🔒 Close Sessions**: Close chats while retaining history
- **🗑️ Permanent Delete**: Option to permanently delete conversations
- **⌨️ Keyboard Shortcuts**: Cmd/Ctrl+N for new chat
- **⚙️ API Settings**: Secure configuration management for multiple APIs
- **🎭 Smart Simulation**: Intelligent message simulation based on input content
- **🔐 Secure Storage**: Encrypted API key storage with inspector protection
- **🔗 n8n Integration**: Webhook support for n8n workflow automation
- **📝 Markdown Support**: Rich text formatting with code blocks, lists, and more
- **🔄 Session Persistence**: Messages persist when switching between chats
- **🏷️ Auto-naming**: Chat titles automatically generated from first message
- **🗑️ Permanent Delete**: Enhanced delete functionality for closed chats

## 🚀 Demo Credentials

- **User**: `demo@tecace.com` / `demo1234` → redirects to `/chat`
- **Admin**: `admin@tecace.com` / `admin1234` → redirects to `/dashboard`

## 🏃‍♂️ Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (optional, required for ChatKit embed `/session` + `/chatkit`):
   ```bash
   # For ChatKit embed endpoints (/session and /chat)
   export OPENAI_API_KEY=your_openai_api_key_here
   export WORKFLOW_ID=your_workflow_id_here
   ```
   
   Or create a `.env` file in the project root:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   WORKFLOW_ID=your_workflow_id_here
   ```

3. Start both frontend and backend:
   ```bash
   npm run dev:full
   ```
   
   Or start them separately:
   ```bash
   # Terminal 1 - Backend API (for full chat features)
   npm run dev:server
   
   # Terminal 2 - Frontend
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🚀 Quick Start (Development)

**Option 1: Frontend Only (Local Auth)**
```bash
npm run dev
```
- Uses local authentication only
- Limited chat features
- Perfect for UI development

**Option 2: Full Stack (Recommended)**
```bash
npm run dev:full
```
- Complete chat system with backend
- Real-time streaming
- Session management
- Message persistence

## 📁 Project Structure

```
src/
├── pages/
│   ├── Landing.tsx              # Login page with theme/i18n controls
│   ├── ChatShell.tsx           # Teams-like two-pane chat interface
│   ├── Dashboard.tsx            # Admin console
│   ├── Settings.tsx             # API and n8n configuration
│   └── AdminShell.tsx           # Admin dashboard layout
├── features/
│   ├── sessions/
│   │   ├── SessionList.tsx     # Left rail session list
│   │   ├── SessionListItem.tsx # Individual session with context menu
│   │   └── useSessions.ts      # Session management hooks
│   └── thread/
│       ├── ThreadView.tsx      # Main conversation view
│       ├── MessageBubble.tsx   # Individual message component
│       ├── References.tsx      # RAG citations display
│       ├── FeedbackBar.tsx     # Thumbs up/down feedback
│       ├── Composer.tsx        # Message input with streaming
│       └── useThread.ts        # Thread management hooks
├── features/
│   ├── overview/
│   │   └── OverviewDashboard.tsx # Admin analytics dashboard
│   ├── usage/
│   │   └── ChatUsage.tsx        # Chat usage analytics
│   └── management/
│       ├── PromptControl.tsx    # System prompt management
│       └── KnowledgeManagement.tsx # Knowledge base management
├── services/
│   ├── auth.ts                 # Authentication service
│   ├── api.ts                  # API client with auth cookies
│   ├── chat.ts                 # Chat service with SSE streaming
│   ├── n8n.ts                  # n8n webhook integration
│   ├── settings.ts             # API configuration management
│   ├── simulation.ts           # Message simulation service
│   └── devMode.ts              # Development mode utilities
├── theme/
│   └── ThemeProvider.tsx       # Theme context with light/dark support
├── i18n/
│   └── I18nProvider.tsx        # Internationalization with EN/KO
├── styles/
│   └── theme.css               # CSS variables for theming
├── server/
│   └── index.ts                # Express backend with chat API
├── App.tsx                     # Main app with providers and routing
├── main.tsx                    # React entry point
└── index.css                   # Global styles
```

## 🎨 Theme System

The app uses CSS variables for dynamic theming:

- **Light Theme**: Clean whites and grays with blue accents
- **Dark Theme**: Dark backgrounds with proper contrast
- **Auto-detection**: Respects `prefers-color-scheme` on first visit
- **Manual Toggle**: Persistent theme selection in localStorage

## 🌍 Internationalization

- **Languages**: English (default) and Korean
- **Persistence**: Language selection saved to localStorage
- **Complete Coverage**: All UI strings translated
- **Easy Extension**: Simple to add more languages

## 💬 Chat System

### Teams-like Interface
- **Left Rail**: Session list with search, filters, and "New Chat" button
- **Main Pane**: Conversation thread with message bubbles
- **Session Management**: Rename, close, delete with context menus
- **Real-time Updates**: Optimistic UI updates with server sync

### Message Features
- **Streaming Responses**: SSE-based real-time message streaming
- **RAG Citations**: Expandable reference sections with source links
- **Message Feedback**: Thumbs up/down with optional notes
- **Typing Indicators**: Visual feedback during message generation
- **Message History**: Persistent conversation storage

### API Architecture
- **RESTful Endpoints**: Sessions, messages, feedback, auth
- **Server-Sent Events**: Real-time streaming for assistant responses
- **Cookie Authentication**: Secure session management
- **Mock Connector**: Demo AI responses with lorem ipsum streaming

## ⚙️ API Settings & Simulation

### Configuration Management
- **Multiple API Support**: Configure and manage multiple API endpoints
- **Secure Storage**: API keys encrypted and protected from inspector access
- **Active Configuration**: Set which API to use for requests
- **Model Parameters**: Temperature, max tokens, and model selection

### Smart Simulation Mode
- **Content-Aware Responses**: Simulation based on actual chat input
- **PSDAP Program Support**: Specialized responses for program-related questions
- **Technical Guidance**: API integration and best practices
- **Realistic Streaming**: Word-by-word streaming simulation with delays

### Development Workflow
- **Backend Detection**: Automatic fallback to simulation when backend unavailable
- **Local Storage**: Sessions and messages persist in simulation mode
- **Seamless Switching**: No code changes needed between modes

## 🔗 n8n Integration

### Webhook Configuration
- **Multiple n8n Configs**: Manage multiple n8n webhook endpoints
- **Active Configuration**: Set which webhook to use for chat requests
- **Connection Testing**: Test webhook connectivity before saving
- **Secure Storage**: Webhook URLs stored securely in localStorage

### Chat Flow
- **Automatic Fallback**: Backend → n8n → Simulation (in order)
- **Request Format**: Structured JSON payloads for n8n workflows
- **Response Handling**: Parse n8n responses with citations and content
- **Error Handling**: Graceful fallback when webhooks fail

## 🎯 ChatKit Embed Endpoints

### Overview
The app provides embed-ready endpoints for integrating OpenAI ChatKit into external websites via iframes.

### Required Environment Variables
- **OPENAI_API_KEY**: Your OpenAI API key (never exposed to client)
- **WORKFLOW_ID**: Your ChatKit workflow ID

### Setting Environment Variables in Render
1. Go to your Render dashboard
2. Select your service
3. Navigate to "Environment" tab
4. Add the following environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `WORKFLOW_ID`: Your ChatKit workflow ID
5. Save and redeploy

### Endpoints (ChatKit test UI)

#### GET /session
Creates a ChatKit session and returns a `client_secret` for initializing the ChatKit UI.

**Response:**
```json
{
  "client_secret": "<session_client_secret>"
}
```

**Error Handling:**
- Returns 500 if environment variables are missing
- Forwards OpenAI API errors with original status code
- Includes error details in response body

**Security:**
- `OPENAI_API_KEY` is never exposed to the client
- Cache-Control: no-store header prevents caching

**Test URL:**
- Local: `http://localhost:3001/session`
- Production: `https://<your-render-domain>/session`

#### GET /chatkit
Returns an HTML page that:
1. Fetches `/session` (same origin) to get `client_secret`
2. Initializes ChatKit UI using the workflow/session `client_secret`

**Features:**
- Iframe-ready (no X-Frame-Options: DENY)
- Same-origin session fetching
- Error handling with user-friendly messages
- Loading states during session creation

**Test URL:**
- Local: `http://localhost:3001/chatkit`
- Production: `https://<your-render-domain>/chatkit`

### Verification Steps

1. **Verify /session endpoint:**
   ```bash
   curl https://<your-render-domain>/session
   ```
   Should return: `{"client_secret":"..."}`

2. **Verify /chatkit page:**
   - Open `https://<your-render-domain>/chatkit` in browser
   - Should load and display "Session OK" message
   - Check browser console for "ChatKit session created successfully"
   - No errors should appear

3. **Test iframe embedding (`/chatkit` ChatKit test UI, supports `?groupId=` query param):**
   ```html
   <iframe src="https://<your-render-domain>/chatkit?groupId=my-bot-id" width="100%" height="600"></iframe>
   ```
   The page should load successfully within the iframe.

### Security Notes
- `/session` is same-origin only (no CORS headers for cross-origin)
- `/chat` is designed for iframe embedding (no X-Frame-Options: DENY)
- CSP frame-ancestors can be configured later for allowlist
- API keys are never logged or exposed to client-side code

## 📝 Markdown Support

### Supported Features
- **Code Blocks**: Inline `code` and ```code blocks```
- **Lists**: Bulleted and numbered lists
- **Headers**: H1, H2, H3 with proper sizing
- **Quotes**: Blockquotes with left border styling
- **Bold/Italic**: **bold** and *italic* text formatting
- **Tables**: GitHub-flavored markdown tables

### Styling
- **Theme Integration**: Markdown elements use CSS variables
- **Responsive Design**: Code blocks scroll horizontally on mobile
- **Accessibility**: Proper contrast ratios and semantic HTML

## 🏢 Admin Dashboard

### Overview Dashboard
- **Performance Radar**: Multi-metric performance visualization
- **Timeline Charts**: Daily/weekly performance trends
- **Activity Metrics**: User vs assistant message counts
- **Date Range Filters**: 7d, 30d, 90d analytics periods

### Chat Usage Analytics
- **Recent Conversations**: Sortable table with session details
- **Message History**: Full conversation thread viewer
- **Feedback Analysis**: Admin and user feedback tracking
- **Session Management**: Bulk operations and filtering

### Chatbot Management
- **Prompt Control**: System prompt editor with live testing
- **Model Configuration**: Endpoint and parameter management
- **Knowledge Base**: File library and indexing system
- **Sync Overview**: Knowledge base synchronization status

### UI Components
- **Responsive Tables**: Sortable columns with pagination
- **Interactive Charts**: Recharts-based data visualization
- **Modal Drawers**: Full message content viewer
- **Status Badges**: Visual status indicators
- **Empty States**: Helpful placeholder content

## 🔐 Authentication Flow

1. **Landing Page**: Clean login form with theme/language controls
2. **Demo Accounts**: Hardcoded credentials for testing
3. **Role-based Redirect**: Users → `/chat`, Admins → `/dashboard`
4. **Session Persistence**: Uses sessionStorage for login state
5. **Protected Routes**: Automatic redirect for unauthorized access

## 🛠️ Key Technologies

- **React 18**: Latest React with hooks and functional components
- **TypeScript**: Full type safety with strict configuration
- **React Router**: Client-side routing with protected routes
- **Express.js**: Backend API with session management
- **Server-Sent Events**: Real-time streaming for chat responses
- **CSS Variables**: Dynamic theming without JavaScript frameworks
- **Context API**: Theme and i18n state management
- **Cookie Authentication**: Secure server-side session management
- **React Markdown**: Rich text rendering with GitHub-flavored markdown
- **Recharts**: Interactive data visualization for admin dashboard
- **n8n Integration**: Webhook-based workflow automation
- **LocalStorage**: Client-side persistence for settings and sessions

## 🎯 Acceptance Tests

✅ **Theme Toggle**: Switches between light/dark themes with persistence  
✅ **Language Switch**: Updates all visible strings (EN ↔ KO)  
✅ **Demo Authentication**: User/admin credentials route correctly  
✅ **Protected Routes**: Unauthorized access redirects to landing  
✅ **Accessibility**: Proper labels, focus styles, and contrast ratios  
✅ **No Secrets**: All authentication is demo-only and documented  
✅ **Session Management**: Create, rename, close, delete conversations  
✅ **Message Streaming**: Real-time SSE streaming with typing indicators  
✅ **RAG Citations**: Expandable references with source links  
✅ **Message Feedback**: Thumbs up/down with optional notes  
✅ **Session Search**: Search through conversation history  
✅ **Persistent Storage**: Messages and sessions persist across refreshes  
✅ **n8n Integration**: Webhook configuration and testing  
✅ **Markdown Support**: Rich text formatting with code blocks and lists  
✅ **Session Persistence**: Messages persist when switching between chats  
✅ **Auto-naming**: Chat titles automatically generated from first message  
✅ **Admin Dashboard**: Analytics, usage tracking, and management tools  
✅ **API Settings**: Multiple API configuration with secure storage  

## 📜 Available Scripts

- `npm run dev` - Start frontend development server (port 3000)
- `npm run dev:server` - Start backend API server (port 3001)
- `npm run dev:full` - Start both frontend and backend concurrently
- `npm run build` - Build optimized production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality

## 🔧 Development Notes

- **No External Dependencies**: Minimal i18n implementation without i18next
- **CSS Variables**: All colors defined in `theme.css` for easy customization
- **TypeScript Strict**: Full type safety with no `any` types
- **Accessibility First**: Proper ARIA labels and keyboard navigation
- **Production Ready**: Optimized build with proper error handling
- **Mock Backend**: In-memory storage for demo; easily replaceable with database
- **SSE Streaming**: Real-time message streaming with proper error handling
- **Optimistic UI**: Immediate feedback with server reconciliation
- **Enterprise UX**: Teams-like interface with professional styling