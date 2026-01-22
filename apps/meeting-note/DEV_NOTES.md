# Meeting Note App - Development Notes

## Overview

The Meeting Note app is a standalone application for transcribing audio files and accessing MS Teams chats. It was built as a separate app from the professor app but shares similar styling and theme system.

## Project Structure

```
apps/meeting-note/
├── src/
│   ├── config/
│   │   └── msalConfig.ts          # MSAL configuration for MS Teams auth
│   ├── context/
│   │   └── AuthContext.tsx        # Authentication state management
│   ├── pages/
│   │   ├── Login.tsx               # MS Teams login page
│   │   └── TranscriptionSummary.tsx # Main dashboard with uploader + chats
│   ├── services/
│   │   └── graphService.ts         # MS Graph API service for Teams data
│   ├── styles/
│   │   └── theme.css               # Theme CSS variables (matching professor app)
│   ├── theme/
│   │   └── ThemeProvider.tsx       # Dark/Light theme support
│   ├── App.tsx                     # Main app component with routing
│   ├── main.tsx                    # App entry point
│   └── index.css                   # Base styles
├── .env                            # Environment variables (gitignored)
├── .gitignore                      # Git ignore rules
├── package.json                    # Dependencies
├── vite.config.ts                  # Vite configuration
└── README.md                       # Setup instructions
```

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS
- **MSAL (Microsoft Authentication Library)** - MS Teams authentication
- **Microsoft Graph API** - Access to Teams chats, OneDrive, and user data
- **Supabase** - Database and file storage backend
- **Lucide React** - Icon library

## Key Features

### 1. MS Teams Authentication
- Single-tenant Azure AD authentication
- MSAL popup-based login flow
- Automatic token refresh
- User profile display

### 2. Audio File Upload
- Drag & drop file upload
- Click to browse files
- Support for multiple audio formats (MP3, WAV, M4A, OGG, FLAC, AAC, WMA)
- Upload progress tracking
- File status indicators (pending, uploading, processing, completed, error)

### 3. Teams Chats Integration
- Fetches all user's Teams chats via Graph API
- Displays chat information:
  - Chat name/topic
  - Chat type (one-on-one, group, meeting)
  - Member count
  - Last updated timestamp
- Scrollable chat list (max-height: 384px)
- Custom scrollbar styling

### 4. OneDrive Integration (Planned/In Development)
- Access user's OneDrive files via Microsoft Graph API
- Upload audio files directly to OneDrive
- Store transcription results in OneDrive
- Sync files between OneDrive and local storage
- Required Graph API scopes: `Files.Read`, `Files.ReadWrite`

### 5. Supabase Database Integration
- Store transcription metadata and history
- User preferences and settings
- File upload tracking and status
- Chat associations with transcriptions
- Required tables: `transcriptions`, `files`, `user_settings`

## Setup & Configuration

### Azure AD App Registration

1. **Register App in Azure Portal**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to Azure Active Directory → App registrations
   - Create new registration:
     - Name: Meeting Note App
     - Supported account types: Single tenant
     - Redirect URI: Single-page application (SPA) → `http://localhost:5174`

2. **Configure API Permissions**
   - Add Microsoft Graph delegated permissions:
     - `User.Read`
     - `Chat.Read`
     - `Chat.ReadWrite`
     - `ChatMessage.Read`
     - `Files.Read` (for OneDrive read access)
     - `Files.ReadWrite` (for OneDrive write access)
     - `Files.Read.All` (optional, for accessing all files)
     - `Sites.Read.All` (optional, for SharePoint access)
   - Grant admin consent

3. **Get Configuration Values**
   - Application (client) ID
   - Directory (tenant) ID

### Environment Variables

Create `.env` file in `apps/meeting-note/`:

```env
# Microsoft Azure AD / MSAL Configuration
VITE_MSAL_CLIENT_ID=your-client-id-here
VITE_MSAL_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
VITE_MSAL_REDIRECT_URI=http://localhost:5174

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Note:** For production, update `VITE_MSAL_REDIRECT_URI` to your production domain.

### Installation & Running

```bash
cd apps/meeting-note
npm install
npm run dev
```

App runs on `http://localhost:5174`

## Development History

### Initial Setup (2024-12-10)

1. **Created app structure** - Set up complete Vite + React + TypeScript project
2. **Theme system** - Implemented theme provider matching professor app styling
3. **MS Teams auth** - Integrated MSAL for authentication
4. **Login page** - Created Microsoft-branded login interface
5. **Transcription page** - Built main dashboard with file uploader and Teams chats

### Issues Encountered & Solutions

#### Issue 1: Cross-origin Token Redemption Error
**Error:** `AADSTS9002326: Cross-origin token redemption is permitted only for the 'Single-Page Application' client-type`

**Solution:** Changed redirect URI platform type in Azure AD from "Web" to "Single-page application (SPA)"

#### Issue 2: No Reply Address Registered
**Error:** `AADSTS500113: No reply address is registered for the application`

**Solution:** Ensured redirect URI was properly saved in Azure AD Authentication settings

#### Issue 3: Graph API Ordering Not Supported
**Error:** `QueryOptions to order by 'lastUpdatedDateTime' is not supported`

**Solution:** Removed `.orderby()` from Graph API calls and implemented client-side sorting:
- Chats sorted by `lastUpdatedDateTime` in descending order
- Messages sorted by `createdDateTime` in descending order

#### Issue 4: Chat List Not Scrollable
**Solution:** Added scrollable container with max-height and custom scrollbar styling

## Styling

The app uses the same theme system as the professor app:
- CSS variables for theming (light/dark mode)
- Consistent color palette
- Matching component styles (cards, buttons, inputs)
- Custom scrollbar implementation

Theme variables are defined in `src/styles/theme.css` and can be toggled via the ThemeProvider.

## API Integration

### Microsoft Graph API Endpoints Used

1. **Get User Chats**
   - Endpoint: `/me/chats`
   - Method: GET
   - Scopes: `Chat.Read`, `Chat.ReadWrite`
   - Returns: List of Teams chats with metadata

2. **Get Chat Messages** (prepared for future use)
   - Endpoint: `/me/chats/{chatId}/messages`
   - Method: GET
   - Scopes: `ChatMessage.Read`
   - Returns: Messages in a specific chat

3. **Get Current User**
   - Endpoint: `/me`
   - Method: GET
   - Scopes: `User.Read`
   - Returns: Current user profile

4. **OneDrive - Get Drive** (for OneDrive integration)
   - Endpoint: `/me/drive`
   - Method: GET
   - Scopes: `Files.Read`, `Files.ReadWrite`
   - Returns: User's default OneDrive drive information

5. **OneDrive - List Files** (for OneDrive integration)
   - Endpoint: `/me/drive/root/children`
   - Method: GET
   - Scopes: `Files.Read`, `Files.ReadWrite`
   - Returns: Files and folders in OneDrive root

6. **OneDrive - Upload File** (for OneDrive integration)
   - Endpoint: `/me/drive/root:/{filename}:/content`
   - Method: PUT
   - Scopes: `Files.ReadWrite`
   - Uploads file content to OneDrive

7. **OneDrive - Create Folder** (for OneDrive integration)
   - Endpoint: `/me/drive/root/children`
   - Method: POST
   - Scopes: `Files.ReadWrite`
   - Creates a new folder in OneDrive

### Graph API Limitations

- Cannot use `orderby` with chats endpoint - must sort client-side
- Some fields may require additional permissions
- Rate limiting applies (not currently handled)
- OneDrive file size limits: 4MB for upload sessions, larger files require upload sessions

## OneDrive Integration

### Overview

OneDrive integration allows users to:
- Store audio files in their OneDrive
- Save transcription results to OneDrive
- Access files from OneDrive for transcription
- Sync between local app storage and OneDrive

### Setup Requirements

1. **Azure AD Permissions**
   - Add `Files.Read` and `Files.ReadWrite` permissions in Azure AD
   - Grant admin consent

2. **Graph API Scopes**
   - Update `loginRequest` scopes in `src/config/msalConfig.ts`:
     ```typescript
     scopes: [
       'User.Read',
       'Chat.Read',
       'Chat.ReadWrite',
       'ChatMessage.Read',
       'Files.Read',
       'Files.ReadWrite',
     ]
     ```

3. **Implementation**
   - Create OneDrive service in `src/services/oneDriveService.ts`
   - Add file upload/download functions
   - Integrate with transcription workflow

### OneDrive Service Functions (To Implement)

```typescript
// Get user's OneDrive drive
getUserDrive(accessToken: string): Promise<Drive>

// List files in OneDrive folder
listOneDriveFiles(accessToken: string, folderPath?: string): Promise<DriveItem[]>

// Upload file to OneDrive
uploadToOneDrive(accessToken: string, file: File, folderPath?: string): Promise<DriveItem>

// Download file from OneDrive
downloadFromOneDrive(accessToken: string, fileId: string): Promise<Blob>

// Create folder in OneDrive
createOneDriveFolder(accessToken: string, folderName: string, parentPath?: string): Promise<DriveItem>
```

### OneDrive Folder Structure

Recommended folder structure:
```
/Meeting Notes/
  ├── Audio Files/
  │   ├── {timestamp}-{filename}.mp3
  │   └── ...
  ├── Transcriptions/
  │   ├── {timestamp}-{filename}.txt
  │   └── ...
  └── Metadata/
      └── {timestamp}-metadata.json
```

## Supabase Database Integration

### Overview

Supabase provides:
- PostgreSQL database for storing transcription metadata
- File storage (optional, if not using OneDrive)
- Real-time subscriptions for live updates
- Row Level Security (RLS) for data access control

### Setup Requirements

1. **Create Supabase Project**
   - Go to [Supabase](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Database Schema**

Create the following tables in Supabase SQL Editor:

```sql
-- Transcriptions table
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  file_type TEXT,
  onedrive_file_id TEXT,
  onedrive_web_url TEXT,
  transcription_text TEXT,
  transcription_status TEXT DEFAULT 'pending', -- pending, processing, completed, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files table (for tracking uploaded files)
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  file_type TEXT,
  storage_location TEXT, -- 'onedrive' or 'supabase'
  storage_path TEXT,
  upload_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings table
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT PRIMARY KEY,
  default_storage_location TEXT DEFAULT 'onedrive', -- 'onedrive' or 'supabase'
  onedrive_folder_path TEXT DEFAULT '/Meeting Notes',
  auto_save_transcriptions BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat associations table (link transcriptions to Teams chats)
CREATE TABLE transcription_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL, -- MS Teams chat ID
  chat_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX idx_transcriptions_status ON transcriptions(transcription_status);
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_transcription_chats_transcription_id ON transcription_chats(transcription_id);
```

3. **Row Level Security (RLS)**

Enable RLS and create policies:

```sql
-- Enable RLS
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcription_chats ENABLE ROW LEVEL SECURITY;

-- Policies for transcriptions
CREATE POLICY "Users can view their own transcriptions"
  ON transcriptions FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own transcriptions"
  ON transcriptions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own transcriptions"
  ON transcriptions FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Similar policies for files, user_settings, and transcription_chats tables
```

4. **Supabase Storage Bucket (Optional)**

If using Supabase for file storage instead of OneDrive:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-notes', 'meeting-notes', false);

-- Storage policies
CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'meeting-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'meeting-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Supabase Service Implementation

Create `src/services/supabaseService.ts`:

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Transcription functions
export async function saveTranscription(data: TranscriptionData) {
  const { data: transcription, error } = await supabase
    .from('transcriptions')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return transcription;
}

export async function getTranscriptions(userId: string) {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// File functions
export async function saveFileMetadata(data: FileMetadata) {
  const { data: file, error } = await supabase
    .from('files')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return file;
}

// User settings functions
export async function getUserSettings(userId: string) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

export async function saveUserSettings(userId: string, settings: UserSettings) {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

### Environment Variables for Supabase

Add to `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Supabase vs OneDrive Storage

**Use OneDrive when:**
- Users want files in their personal OneDrive
- Integration with Microsoft ecosystem is important
- No additional storage costs
- Files should be accessible outside the app

**Use Supabase Storage when:**
- Centralized file management needed
- Better control over file organization
- Easier integration with database metadata
- Team/organization-wide file sharing needed

## Future Development

### Planned Features

1. **Audio Transcription**
   - Integrate transcription API/service
   - Display transcription results
   - Export transcriptions

2. **Chat Interaction**
   - Click chat to view messages
   - Send transcriptions to chats
   - Create new chats

3. **File Management**
   - View transcription history
   - Delete uploaded files
   - Download transcriptions

4. **Enhanced UI**
   - Loading states
   - Error handling
   - Toast notifications
   - File preview

### Technical Improvements

1. **Error Handling**
   - Better error messages
   - Retry logic for API calls
   - Offline handling

2. **Performance**
   - Pagination for chats
   - Lazy loading
   - Caching strategies

3. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests

4. **Deployment**
   - Production build configuration
   - Environment-specific configs
   - CI/CD pipeline

## Notes

- The app is completely independent from the professor app
- Styling matches professor app for consistency
- Currently uses popup-based authentication (could switch to redirect)
- File upload is simulated - needs actual backend integration
- Chat list shows all chats but doesn't support interaction yet
- **OneDrive integration** - Planned feature for storing audio files and transcriptions
- **Supabase database** - Required for storing transcription metadata, user settings, and file tracking
- Storage strategy: Can use either OneDrive or Supabase Storage, or both (hybrid approach)

## Dependencies

Key dependencies:
- `@azure/msal-browser` - MSAL core library
- `@azure/msal-react` - React hooks for MSAL
- `@microsoft/microsoft-graph-client` - Graph API client
- `@supabase/supabase-js` - Supabase client library
- `react-router-dom` - Routing
- `lucide-react` - Icons

See `package.json` for complete list.

**Note:** Add `@supabase/supabase-js` if not already installed:
```bash
npm install @supabase/supabase-js
```

## Troubleshooting

### Authentication Issues
- Verify redirect URI matches exactly in Azure AD
- Check that API permissions are granted
- Ensure tenant ID is correct for single-tenant apps

### Graph API Issues
- Verify permissions are granted and consented
- Check access token is valid
- Review Graph API documentation for endpoint changes

### Build Issues
- Clear `node_modules` and reinstall
- Check Node.js version compatibility
- Verify environment variables are set

### OneDrive Integration Issues
- Verify `Files.Read` and `Files.ReadWrite` permissions are granted
- Check access token includes OneDrive scopes
- Ensure user has OneDrive enabled in their Microsoft account
- Check file size limits (4MB for direct upload, use upload sessions for larger files)

### Supabase Database Issues
- Verify Supabase URL and anon key are correct
- Check RLS policies allow user access
- Ensure database tables are created
- Verify user_id matches authenticated user
- Check Supabase project is active and not paused

## Contact

For questions or issues, refer to the main project documentation or contact the development team.

