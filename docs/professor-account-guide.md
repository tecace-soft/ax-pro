# Professor Account - Custom Dashboard Guide

## Overview

The `professor@tecace.com` account has a customized dashboard experience with unique branding, theme colors, and UI settings.

---

## Login Credentials

**Email:** `professor@tecace.com`  
**Password:** `admin1234`  
**Role:** Admin

---

## Custom Features

### 1. **Custom Theme Colors**

The Professor account uses a unique color scheme:

- **Primary Color:** `#6366f1` (Indigo)
- **Accent Color:** `#8b5cf6` (Purple)
- **Background Color:** `#0f172a` (Darker Slate)

These colors are automatically applied when logging in with the professor account and reset when logging out.

### 2. **Custom Branding**

- **Dashboard Title:** "Professor Dashboard" (displayed in header logo area)
- **Welcome Message:** "Welcome, Professor" (displayed in performance indicator)

### 3. **Layout Customization**

The professor account has access to all dashboard sections in the default order:
1. Performance Radar
2. Daily Message Activity
3. Recent Conversations
4. Admin Feedback
5. User Feedback
6. Prompt Control

Sections can be hidden or reordered by modifying the `userCustomization.ts` configuration.

### 4. **Feature Toggles**

The professor account has access to advanced features:
- Advanced Analytics
- Custom Reports

Additional features can be enabled or disabled in the configuration.

---

## How to Test

### Step 1: Login

1. Navigate to the landing page: `http://localhost:3000/`
2. Enter credentials:
   - Email: `professor@tecace.com`
   - Password: `admin1234`
3. Click "Sign In"

### Step 2: Verify Custom UI

After logging in, you should see:

✅ **Header Changes:**
- Logo text shows "Professor Dashboard" instead of "TecAce Ax Pro"
- Performance indicator shows "Welcome, Professor" instead of "TecAce Ax Pro"

✅ **Theme Changes:**
- Primary buttons and highlights use Indigo color (#6366f1)
- Accent elements use Purple color (#8b5cf6)
- Background is darker slate (#0f172a)

✅ **Full Admin Access:**
- All dashboard sections visible
- All admin features accessible
- Knowledge Management available
- Settings accessible

### Step 3: Compare with Default Account

To see the difference, logout and login with the default admin account:

**Default Admin:**
- Email: `chatbot-admin@tecace.com`
- Password: `admin1234`

You should see the standard "TecAce Ax Pro" branding and default cyan/blue color scheme.

---

## How to Add More Custom Users

To add customization for additional users, edit `/apps/professor/src/services/userCustomization.ts`:

```typescript
const USER_CUSTOMIZATIONS: Record<string, DashboardCustomization> = {
  'professor@tecace.com': {
    // ... existing config
  },
  'newuser@tecace.com': {
    userId: 'newuser_001',
    email: 'newuser@tecace.com',
    theme: {
      primaryColor: '#10b981', // Green
      accentColor: '#14b8a6', // Teal
      backgroundColor: '#1e293b', // Slate
    },
    branding: {
      dashboardTitle: 'Custom Dashboard',
      welcomeMessage: 'Welcome, User',
    },
    layout: {
      hideSections: ['user-feedback'], // Hide specific sections
      sectionOrder: [
        'performance-radar',
        'recent-conversations',
        // ... custom order
      ]
    },
    features: {
      enabledFeatures: ['feature-a', 'feature-b'],
      disabledFeatures: ['feature-c']
    }
  }
};
```

Then add the user credentials to `/apps/professor/src/services/auth.ts`:

```typescript
const DEMO_CREDENTIALS = {
  // ... existing accounts
  'newuser@tecace.com': {
    password: 'password123',
    role: 'admin' as const,
    userId: 'newuser_001'
  }
};
```

---

## Customization Options

### Theme Customization

```typescript
theme: {
  primaryColor?: string;    // Main brand color (buttons, links)
  accentColor?: string;     // Secondary accent color
  backgroundColor?: string; // Main background color
}
```

### Branding Customization

```typescript
branding: {
  dashboardTitle?: string;   // Header logo text
  logoUrl?: string;          // Custom logo image (future)
  welcomeMessage?: string;   // Performance indicator prefix
}
```

### Layout Customization

```typescript
layout: {
  hideSections?: string[];   // Section IDs to hide
  sectionOrder?: string[];   // Custom order of sections
}
```

**Available Section IDs:**
- `performance-radar`
- `daily-message-activity`
- `recent-conversations`
- `admin-feedback`
- `user-feedback`
- `prompt-control`

### Feature Toggles

```typescript
features: {
  enabledFeatures?: string[];   // Whitelist of features
  disabledFeatures?: string[];  // Blacklist of features
}
```

---

## Technical Details

### How It Works

1. **Login Detection:** When a user logs in, `AdminDashboard` checks for customization settings
2. **Theme Application:** CSS variables are dynamically updated using `applyThemeCustomization()`
3. **Props Passing:** Custom branding is passed to `AdminHeader` component
4. **Cleanup:** Theme is reset when user logs out or component unmounts

### Files Modified

- `apps/professor/src/services/auth.ts` - Added professor account
- `apps/professor/src/services/userCustomization.ts` - New customization service
- `apps/professor/src/pages/admin/AdminDashboard.tsx` - Load and apply customization
- `apps/professor/src/components/admin/Header.tsx` - Accept custom props

### CSS Variables Used

The following CSS variables are dynamically updated:
- `--admin-primary` - Primary color
- `--admin-accent` - Accent color
- `--admin-bg` - Background color

---

## Troubleshooting

### Custom Theme Not Applied

1. Check browser console for errors
2. Verify user email matches exactly in `userCustomization.ts`
3. Clear browser cache and reload
4. Check that `applyThemeCustomization()` is called in console logs

### Custom Branding Not Showing

1. Verify `customTitle` and `customWelcome` props are passed to `AdminHeader`
2. Check that `userCustomization` state is set in `AdminDashboard`
3. Inspect header elements to see if props are received

### Theme Persists After Logout

This is expected behavior if you don't navigate away from the page. The theme resets on:
- Component unmount
- Page refresh
- Navigation to login page

---

## Future Enhancements

Potential improvements for the customization system:

1. **Database Storage:** Store customizations in Supabase instead of hardcoded
2. **UI Editor:** Admin interface to edit customizations without code
3. **Custom Logo:** Support for uploading custom logo images
4. **Per-Section Settings:** More granular control over individual sections
5. **Color Picker:** Visual color picker for theme customization
6. **Export/Import:** Save and share customization configurations

---

## Support

For questions or issues with the professor account customization:
- Check the console logs for customization application messages
- Review the `userCustomization.ts` configuration
- Contact the development team for assistance

---

## Changelog

- **2025-01**: Initial implementation of user-specific customization
- **2025-01**: Added professor@tecace.com account with custom theme

