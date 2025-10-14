# Security Setup Guide

## ⚠️ CRITICAL: Environment Variables Required

This application requires environment variables for secure operation. **Never commit sensitive credentials to version control.**

## Setup Instructions

### 1. Create Environment File

Copy the example environment file and configure it:

```bash
cd apps/professor
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your actual credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# N8N Webhook Configuration
VITE_N8N_BASE_URL=https://your-n8n-instance.com
VITE_N8N_UPLOAD_WEBHOOK_ID=your_upload_webhook_id
VITE_N8N_LIST_FILES_WEBHOOK_ID=your_list_files_webhook_id
VITE_N8N_DELETE_FILE_WEBHOOK_ID=your_delete_file_webhook_id
VITE_N8N_REINDEX_FILE_WEBHOOK_ID=your_reindex_file_webhook_id
VITE_N8N_FILE_STATUS_WEBHOOK_ID=your_file_status_webhook_id

# Development Settings
VITE_DEV_MODE=false
VITE_USE_MOCK_DATA=false
```

### 3. Security Best Practices

- ✅ **Never commit `.env` files** to version control
- ✅ **Use different credentials** for development and production
- ✅ **Rotate credentials** regularly
- ✅ **Use least privilege** for database access
- ✅ **Monitor access logs** for suspicious activity

### 4. Production Deployment

For production deployment:

1. Set environment variables in your hosting platform
2. Ensure `.env` files are not included in deployment
3. Use secure credential management (e.g., AWS Secrets Manager, Azure Key Vault)
4. Enable HTTPS for all webhook endpoints

## Current Security Status

- ✅ Environment variables implemented
- ✅ Sensitive data moved out of source code
- ✅ .gitignore updated to exclude .env files
- ⚠️ **Action Required**: Update your actual credentials in `.env`

## Migration from Hardcoded Values

The following hardcoded values have been moved to environment variables:

- Supabase URL and API key
- N8N webhook URLs and IDs
- Development mode settings

**Update your `.env` file with your actual credentials before running the application.**
