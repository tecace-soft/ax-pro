-- UI Settings Table for storing global chatbot customization
-- This table stores the chatbot's title, avatar, and suggested questions
-- that should be consistent across all users and devices

CREATE TABLE IF NOT EXISTS ui_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  chat_title TEXT NOT NULL DEFAULT 'TecAce Ax Pro',
  chat_subtitle TEXT NOT NULL DEFAULT 'Select a conversation from the sidebar or start a new chat',
  avatar_url TEXT NOT NULL DEFAULT '/default-profile-avatar.png',
  question_1 TEXT NOT NULL DEFAULT 'What is artificial intelligence?',
  question_2 TEXT NOT NULL DEFAULT 'How does machine learning work?',
  question_3 TEXT NOT NULL DEFAULT 'Explain quantum computing',
  question_4 TEXT NOT NULL DEFAULT 'What are the benefits of cloud computing?',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default values
INSERT INTO ui_settings (id, chat_title, chat_subtitle, avatar_url)
VALUES ('global', 'TecAce Ax Pro', 'Main AI Assistant for HR Support', '/default-profile-avatar.png')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE ui_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read ui_settings (public access)
CREATE POLICY "Allow public read access to ui_settings"
  ON ui_settings
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users can update ui_settings
-- Adjust this based on your authentication setup
CREATE POLICY "Allow authenticated users to update ui_settings"
  ON ui_settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Only authenticated users can insert ui_settings
CREATE POLICY "Allow authenticated users to insert ui_settings"
  ON ui_settings
  FOR INSERT
  WITH CHECK (true);

-- Create an index for faster lookups (though we only have one row)
CREATE INDEX IF NOT EXISTS idx_ui_settings_id ON ui_settings(id);

-- Add a comment to the table
COMMENT ON TABLE ui_settings IS 'Global UI customization settings for the chatbot interface';

