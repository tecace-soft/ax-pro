# UI Settings Database Setup

## Overview

The UI customization settings (chatbot name, avatar, suggested questions) are now stored in **Supabase** instead of browser localStorage. This ensures that all users see the same chatbot configuration, regardless of which device or browser they use.

## Database Table: `ui_settings`

This table stores global UI customization settings with a single row (id = 'global').

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key, always 'global' |
| `chat_title` | TEXT | Chatbot name (e.g., "TecAce Ax Pro") |
| `chat_subtitle` | TEXT | Chatbot description |
| `avatar_url` | TEXT | URL or path to chatbot avatar image |
| `question_1` | TEXT | First suggested question |
| `question_2` | TEXT | Second suggested question |
| `question_3` | TEXT | Third suggested question |
| `question_4` | TEXT | Fourth suggested question |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

## Setup Instructions

### Step 1: Create the Table in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `ui_settings_table.sql`
4. Click **Run** to execute the SQL

### Step 2: Verify the Table

1. Go to **Table Editor** in Supabase
2. You should see a new table called `ui_settings`
3. It should have one row with id = 'global' and default values

### Step 3: Configure Row Level Security (RLS)

The SQL script automatically sets up RLS policies:

- **Public Read Access**: Anyone can read the UI settings (needed for the chatbot to load)
- **Authenticated Write Access**: Only authenticated users can update settings

If you need to adjust these policies:
1. Go to **Authentication** > **Policies** in Supabase
2. Find the `ui_settings` table
3. Modify the policies as needed

### Step 4: Test the Integration

1. Open your app in the browser
2. Go to **Settings** > **UI Customization**
3. Change the chatbot title or avatar
4. Click **Save**
5. Open the app in a different browser or device
6. You should see the same customization

## How It Works

### Data Flow

1. **On App Load**: 
   - The app fetches UI settings from Supabase
   - Settings are cached in localStorage for offline access
   - If Supabase is unavailable, falls back to localStorage

2. **On Save**:
   - Settings are saved to Supabase first
   - If successful, localStorage is updated as a cache
   - If Supabase fails, only localStorage is updated

### Files Involved

- **`/src/services/uiCustomization.ts`**: Supabase CRUD operations
- **`/src/hooks/useUICustomization.ts`**: React hook with Supabase integration
- **`/src/services/settings.ts`**: localStorage fallback (backward compatibility)

## Troubleshooting

### Settings Not Syncing

1. **Check Supabase Connection**:
   - Go to Settings > Database
   - Click "Test Connection"
   - Ensure it shows "Connected successfully"

2. **Check RLS Policies**:
   - Verify that the read policy allows public access
   - Check browser console for permission errors

3. **Check Network**:
   - Open browser DevTools > Network tab
   - Look for requests to `supabase.co`
   - Check for any 403 or 401 errors

### Settings Not Loading

1. **Check if Table Exists**:
   ```sql
   SELECT * FROM ui_settings WHERE id = 'global';
   ```

2. **Check Default Values**:
   - If the query returns no rows, run the INSERT statement from `ui_settings_table.sql`

3. **Check Browser Console**:
   - Look for errors related to `fetchUICustomization`
   - If Supabase is unavailable, the app will fall back to localStorage

## Migration from localStorage

If you have existing UI customization in localStorage:

1. The app will automatically load from Supabase on first run
2. If Supabase has no data, it will use localStorage values
3. When you save settings, they will be written to Supabase
4. From that point on, Supabase is the source of truth

## Security Considerations

- **Avatar URLs**: Store image URLs, not base64 data, for better performance
- **Public Read Access**: UI settings are public by default (needed for the chatbot)
- **Admin Write Access**: Only authenticated admins should be able to update settings
- **Input Validation**: The app validates all inputs before saving

## Future Enhancements

- [ ] Add support for multiple language variants
- [ ] Add support for theme customization (colors, fonts)
- [ ] Add support for custom CSS
- [ ] Add version history for settings changes
- [ ] Add A/B testing for different UI configurations

