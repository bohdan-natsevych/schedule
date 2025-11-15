# Google Calendar Integration Setup Guide

This guide will help you set up Google Calendar integration to import events into the Schedule Manager app.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name your project (e.g., "Schedule Manager")
4. Click "Create"

### 2. Enable Google Calendar API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and click "Enable"

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type (or "Internal" if using Google Workspace)
   - Fill in app name: "Schedule Manager"
   - Add your email as support email
   - Add scopes: Click "Add or Remove Scopes" and add:
     - `.../auth/calendar.events` (View and edit events on all calendars)
   - Add test users (your email address)
   - Save and continue

4. Back to creating OAuth client ID:
   - Application type: "Web application"
   - Name: "Schedule Manager"
   - Authorized redirect URIs: Add `http://localhost:8000/api/google-calendar/oauth2callback`
   - Click "Create"

5. Download the JSON file:
   - Click the download button (⬇) next to your newly created OAuth 2.0 Client ID
   - Save the file as `google_credentials.json`

### 4. Install the Credentials File

1. Place `google_credentials.json` in the **root directory** of your Schedule Manager project:
   ```
   C:\Work\personal\schedule\google_credentials.json
   ```

### 5. Install Python Dependencies

Open PowerShell in your project directory and run:

```powershell
.\venv\Scripts\Activate.ps1
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

Or simply update requirements:
```powershell
cd backend
pip install -r requirements.txt
```

### 6. Recreate Database (to apply schema changes)

Run this command to recreate the database with updated schema:

```powershell
cd c:\Work\personal\schedule\backend
Remove-Item schedule.db -Force
cd ..
.\venv\Scripts\Activate.ps1
cd backend
py -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine); print('Database recreated successfully')"
```

### 7. Start the Application

```powershell
.\dev.bat
```

## Using the Integration

### Import Events from Google Calendar

1. In the app sidebar, scroll down to "Import from Google Calendar"
2. Click "Connect to Google Calendar"
3. A new window will open - sign in to your Google account
4. Grant permissions to access your calendar
5. Return to the app and click "Load Calendars"
6. Choose your import option:
   - **Import from all calendars**: Get events from all your calendars
   - **Select specific calendars**: Choose which calendars to import from
7. Click "Load Events"
8. Select the events you want to import (or use "Select All")
9. Click "Import X Events"
10. Events will be created as tasks in your schedule!

### Event Import Details

- **Single events**: Imported as one-time tasks with correct date and time
- **All-day events**: Imported with default 9:00 AM time
- **Recurring events**: Currently imported as individual occurrences (not as recurring tasks)
- **Event details**: Title and description are preserved
- **Time zones**: Events are imported with their original times

## Troubleshooting

### "Credentials file not found" Error

- Make sure `google_credentials.json` is in the project root directory
- Check the file name is exactly `google_credentials.json` (case-sensitive)

### "Failed to connect to Google Calendar"

- Verify you added the correct redirect URI in Google Cloud Console
- Make sure your app is running on `http://localhost:8000`
- Check that the Google Calendar API is enabled in your project

### "No events found"

- Check that your selected calendar has events in the date range (past 30 days to future 365 days)
- Verify calendar permissions in Google Calendar settings

### OAuth Screen Issues

- If using "External" user type, your app will be in testing mode
- Add your Google account as a test user in the OAuth consent screen
- You may see a warning screen - click "Advanced" → "Go to Schedule Manager (unsafe)" to proceed

## Security Notes

- The `google_credentials.json` file contains sensitive information
- Never commit this file to version control (it should be in `.gitignore`)
- The authentication token is stored locally in `google_token.pickle`
- You can disconnect at any time using the "Disconnect" button
- Deleting `google_token.pickle` will require re-authentication

## Production Deployment

For production use:

1. Change redirect URI to your production domain
2. Update `REDIRECT_URI` in `backend/app/services/google_calendar.py`
3. Update the redirect URL in `backend/app/routers/google_calendar.py` OAuth callback
4. Verify your app in Google Cloud Console (for external user type)
5. Consider using environment variables for credentials

## Support

If you encounter issues:
1. Check the terminal for error messages
2. Verify all setup steps were completed
3. Review Google Cloud Console settings
4. Check browser console for frontend errors
