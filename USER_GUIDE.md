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

## Using Schedule Manager

### Creating Tasks

1. Fill in the **Create Task** form in the left sidebar:
   - **Title**: Name of your task
   - **Start Date**: When the task begins
   - **End Date** (optional): For multi-day tasks
   - **Recurrence**: Choose how often the task repeats:
     - **Once**: Single occurrence
     - **Daily**: Every day
     - **Weekly**: Specific days of the week
     - **Monthly**: Same day each month
     - **Yearly**: Same date each year

2. For **Weekly** tasks, select which days of the week:
   - Type day names (e.g., "Monday", "Wed", "Friday")
   - Click suggestions to add days
   - Click × on chips to remove days

3. Click **Create Task** to save

### Viewing Tasks

- **Calendar View**: See all tasks in a monthly calendar
- **Agenda View**: List view of upcoming tasks (next 365 days)
- Switch between views using the buttons in the toolbar
- Click dates to select them
- Navigate months using Back/Next buttons

### Editing Tasks

1. Click **Edit** on any task in the "Existing Tasks" list
2. The form will populate with task details
3. Make your changes
4. Click **Create Task** to save (button updates the selected task)

### Adding Icons to Tasks

1. **Edit** a task to select it
2. Scroll down to the **Icon** section
3. Click **Choose File** and select an image
4. Click **Upload Icon**
5. Adjust icon size using the width/height inputs

### Deleting Tasks

1. Click **Delete** on any task in the "Existing Tasks" list
2. Confirm the deletion

### Print Preview

1. Click **Print Preview** in the header
2. Adjust settings:
   - **From/To Date**: Date range to print
   - **Font Size**: Text size (5-72)
   - **Line Gap**: Space between lines (0-48px)
   - **Font Family**: Choose your preferred font
3. The preview shows:
   - **Estimated pages**: How many A4 pages will be used
   - Editable preview of the print output
4. Click **Print (A4 portrait)** when ready

## Tips

### Keyboard Shortcuts in Print Preview
- Edit text directly in the preview area
- Changes are saved automatically as you type

### Date Formats
- Agenda view displays dates in **dd/MM/yyyy** format
- Date pickers use your system's format

### Recurring Tasks
- Weekly tasks show on all selected weekdays
- Monthly tasks repeat on the same day of each month
- Yearly tasks repeat on the exact same date each year

### Icons
- Supported formats: JPG, PNG, GIF, WebP
- Icons display alongside task titles in print preview
- Adjust icon size before printing for best results

## Data Location

Your data is stored in the application folder:
- **Database**: `backend\schedule.db`
- **Uploaded Icons**: `uploads\` folder

### Backup Your Data
To backup your tasks and icons, copy:
1. `backend\schedule.db` (your tasks database)
2. `uploads\` folder (your uploaded icons)

### Restore from Backup
To restore:
1. Close the application
2. Replace `backend\schedule.db` with your backup
3. Replace `uploads\` folder with your backup
4. Restart the application

## Troubleshooting

### Application Won't Start
- **Check port 8000**: Make sure no other program is using port 8000
- **Check antivirus**: Some antivirus software may block the application
- **Run as Administrator**: Right-click and select "Run as administrator"

### Browser Doesn't Open
- Manually open your browser and go to: `http://localhost:8000`

### Tasks Not Appearing
- Check the date range in calendar view
- For weekly tasks, ensure you've selected at least one weekday
- Try refreshing the browser (F5)

### Print Preview Issues
- If page count seems wrong, try adjusting font size or line gap
- Ensure your browser's print settings are set to A4 paper size

### Database Errors
- Close the application
- Delete `backend\schedule.db` (Note: This deletes all tasks!)
- Restart the application (a new database will be created)

## Stopping the Application

To close Schedule Manager:
1. Close the web browser tab
2. **Close the console window** (black window with text)
   - Click the × button
   - Or press Ctrl+C in the console window

**Important**: The application keeps running until you close the console window!

## Updates

Check for updates at: [Your project URL]

## Support

For help or to report issues:
- GitHub Issues: [Your GitHub issues URL]
- Email: [Your support email]

---

Thank you for using Schedule Manager!
