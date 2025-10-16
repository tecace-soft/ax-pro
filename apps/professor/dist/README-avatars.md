# How to Add Default Avatar Images

## Quick Guide

1. **Download your current avatar** from the Settings page (UI Customization tab)
2. **Rename the file** (e.g., `chatbot-avatar-2.png`, `professor-avatar.png`)
3. **Copy the file** to this directory: `apps/professor/public/`
4. **Use it** by entering the path: `/chatbot-avatar-2.png` in the avatar URL field

## Example File Structure

```
apps/professor/public/
├── default-profile-avatar.png    (default avatar)
├── chatbot-avatar-2.png          (your custom avatar)
├── professor-avatar.png          (another option)
└── README-avatars.md             (this file)
```

## How to Use

### Option 1: Direct Path
Enter the file path in the avatar URL field:
- `/chatbot-avatar-2.png`
- `/professor-avatar.png`

### Option 2: Upload and Adjust
1. Click "Upload Photo" button
2. Select your image
3. Adjust zoom and position
4. Click "Download" to save the adjusted version
5. Copy the downloaded file to `apps/professor/public/`
6. Use the path in settings

## Tips

- **File format**: PNG recommended for transparency
- **File size**: Keep under 500KB for best performance
- **Dimensions**: 300x300px or larger (will be automatically resized)
- **Naming**: Use descriptive names without spaces (use `-` or `_`)

## Current Default Avatars

1. `/default-profile-avatar.png` - Default fallback avatar

