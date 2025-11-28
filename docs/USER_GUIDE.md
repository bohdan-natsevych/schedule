# Schedule Manager - User Guide

## Getting Started

### Running the Application

1. **Double-click** `ScheduleManager.exe`
2. A console window will appear showing the server status
3. Your default web browser will automatically open with the application
4. If the browser doesn't open automatically, navigate to: `http://localhost:8000`

### First Time Use

The application will automatically:
- Create a database to store your tasks
- Create an uploads folder for task icons
- Initialize the web interface

## Interface Overview

- **Left Sidebar**: Create new tasks and sync with Google Calendar
- **Main Area**: Calendar view of your schedule
- **Right Sidebar**: List of all tasks

You can toggle the sidebars using the arrow buttons (◀ / ▶) to maximize the calendar view.

## Using Schedule Manager

### Creating Tasks

1. Fill in the **Create Task** form in the left sidebar:
   - **Title**: Name of your task
   - **Recurrence**: Choose how often the task repeats:
     - **Single Day**: One-time task
     - **Every Day**: Repeats daily
     - **Weekly**: Repeats on specific days of the week
   - **Start Date**: When the task begins
   - **End Date**: When the task stops repeating (required for recurring tasks)
   - **Time**: Start time of the task (e.g., 09:00)
   - **Show icon**: (For recurring tasks) Choose when to display the task icon:
     - **On every occurrence**
     - **On first occurrence only**
     - **On last occurrence only**

2. For **Weekly** tasks, select the days:
   - Click on the days of the week (e.g., Mon, Wed, Fri) to toggle them.

3. **Upload Icon** (Optional):
   - Click **Choose File** to select an image for the task.
   - Supported formats: JPG, PNG, GIF, WebP.

4. Click **Save Task** to create.

### Google Calendar Integration

You can import events from your Google Calendar directly into Schedule Manager.

1. In the **Left Sidebar**, scroll down to the **Google Calendar** section.
2. Click **Connect to Google Calendar**.
3. Follow the Google sign-in prompt in the new window.
4. Once connected:
   - Select one or more calendars to import from.
   - Click **Continue to Events**.
   - Select the specific events you want to import.
   - Click **Import Events**.

### Viewing Tasks

- **Calendar View** (Center): Displays tasks on a monthly grid.
  - Click a date to see details or edit overrides for that specific day.
- **Task List** (Right Sidebar): Shows a list of all your tasks.
  - Use this list to easily find, edit, or delete tasks.

### Editing Tasks

1. Click **Edit** on any task in the "Task List" (right sidebar) or click a task in the Calendar view.
2. The "Create Task" form will verify into an **Edit Task** modal.
3. Make your changes to title, dates, time, or recurrence.
4. **Icons**:
   - Upload a new icon to replace the current one.
   - Resize the icon using the width/height inputs.
   - Click **Remove Icon** to delete the current icon.
5. Click **Save Task** to update.

### Deleting Tasks

- Click the **Delete** button on a task in the Task List.
- Or, when editing a specific day in Calendar View, you can delete that specific occurrence or the entire task.

### Print Preview

Generate a printable version of your schedule.

1. Click **Print Preview** in the top navigation header.
2. **Adjust Settings**:
   - **From/To Date**: Select the range to print.
   - **Font Size**: Adjust text size (5-72).
   - **Line Gap**: Adjust space between tasks.
   - **Font Family**: Choose a font style.
3. **Customize Layout**:
   - **Drag and Drop**: Click and drag any task icon to move it manually.
   - **Remove Icons**: Hover over an icon and click the **×** to remove it from the printout.
   - **Restore Icons**: Use the "Restore All Icons" button or click "Restore icon" placeholder to bring them back.
   - **Reset Positions**: Click "Reset Icon Positions" to return all icons to their default auto-layout.
4. Click **Print (A4 portrait)** when ready.

## Data Location

Depending on how you run the application, your data is stored in different locations:

### Installed / Executable Version
If you are running `ScheduleManager.exe`:
- **Folder**: `%LOCALAPPDATA%\Schedule Manager`
  - To find this: Press `Win + R`, type `%localappdata%\Schedule Manager`, and press Enter.
- **Database**: `backend\schedule.db`
- **Uploaded Icons**: `uploads\` folder

### Development / Portable Version
If you are running from source or a portable folder:
- **Folder**: The same folder as the application
- **Database**: `backend\schedule.db`
- **Uploaded Icons**: `uploads\` folder

### Backup Your Data
To backup your tasks and icons, copy:
1. `backend\schedule.db`
2. `uploads\` folder

### Restore from Backup
1. Close the application.
2. Navigate to your data folder (see above).
3. Replace `backend\schedule.db` with your backup.
4. Replace `uploads\` folder with your backup.
5. Restart the application.

## Troubleshooting

### Application Won't Start
- **Check port 8000**: The application requires port 8000 to be free for Google Calendar integration. Ensure no other web server is running on this port.
- **Check antivirus**: Some antivirus software may block the application.
- **Run as Administrator**: Right-click and select "Run as administrator".

### Browser Doesn't Open
- Manually open your browser and go to: `http://localhost:8000`

### Tasks Not Appearing
- Check the date range in calendar view.
- For weekly tasks, ensure you've selected at least one weekday.

### Database Errors
- Close the application.
- Delete `backend\schedule.db` (Warning: This deletes all tasks!).
- Restart the application (a new database will be created).

## Stopping the Application

1. Close the web browser tab.
2. **Close the console window** (black window with text).
   - Click the × button.
   - Or press Ctrl+C in the console window.


