"""
Google Calendar integration service.
Handles OAuth2 authentication and importing events from Google Calendar.
"""
import os
import pickle
from datetime import datetime, date, time, timedelta
from pathlib import Path
from typing import Optional, Dict, List

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# OAuth2 configuration
SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
]
# Go up 3 levels: google_calendar.py -> services -> app -> backend -> project root
TOKEN_PATH = Path(__file__).resolve().parents[3] / "google_token.pickle"
CREDENTIALS_PATH = Path(__file__).resolve().parents[3] / "google_credentials.json"

# Redirect URI for OAuth2
REDIRECT_URI = "http://localhost:8000/google-calendar/oauth2callback"


class GoogleCalendarService:
    """Service for managing Google Calendar integration."""
    
    def __init__(self):
        self.creds: Optional[Credentials] = None
        self.service = None
    
    def get_authorization_url(self) -> str:
        """
        Generate the Google OAuth2 authorization URL.
        Returns the URL that users should visit to authorize the app.
        """
        if not CREDENTIALS_PATH.exists():
            raise FileNotFoundError(
                f"Google credentials file not found at {CREDENTIALS_PATH}. "
                "Please download it from Google Cloud Console and save as google_credentials.json"
            )
        
        try:
            flow = Flow.from_client_secrets_file(
                str(CREDENTIALS_PATH),
                scopes=SCOPES,
                redirect_uri=REDIRECT_URI
            )
            
            auth_url, _ = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                prompt='consent'
            )
            
            return auth_url
        except Exception as e:
            print(f"Error creating authorization URL: {e}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Failed to create authorization URL: {str(e)}")
    
    def exchange_code_for_token(self, code: str) -> bool:
        """
        Exchange the authorization code for access token.
        Returns True if successful.
        """
        try:
            flow = Flow.from_client_secrets_file(
                str(CREDENTIALS_PATH),
                scopes=SCOPES,
                redirect_uri=REDIRECT_URI
            )
            
            flow.fetch_token(code=code)
            self.creds = flow.credentials
            
            # Save credentials
            with open(TOKEN_PATH, 'wb') as token_file:
                pickle.dump(self.creds, token_file)
            
            return True
        except Exception as e:
            print(f"Error exchanging code for token: {e}")
            return False
    
    def load_credentials(self) -> bool:
        """Load saved credentials. Returns True if credentials are valid."""
        if TOKEN_PATH.exists():
            with open(TOKEN_PATH, 'rb') as token_file:
                self.creds = pickle.load(token_file)
        
        # Refresh token if expired
        if self.creds and self.creds.expired and self.creds.refresh_token:
            try:
                self.creds.refresh(Request())
                with open(TOKEN_PATH, 'wb') as token_file:
                    pickle.dump(self.creds, token_file)
            except Exception as e:
                print(f"Error refreshing token: {e}")
                return False
        
        if self.creds and self.creds.valid:
            self.service = build('calendar', 'v3', credentials=self.creds)
            return True
        
        return False
    
    def is_authenticated(self) -> bool:
        """Check if user is authenticated with Google Calendar."""
        return self.load_credentials()
    
    def disconnect(self) -> bool:
        """Remove saved credentials."""
        try:
            if TOKEN_PATH.exists():
                TOKEN_PATH.unlink()
            self.creds = None
            self.service = None
            return True
        except Exception as e:
            print(f"Error disconnecting: {e}")
            return False
    
    def list_calendars(self) -> List[Dict]:
        """List all calendars accessible to the user."""
        if not self.load_credentials():
            raise Exception("Not authenticated with Google Calendar")
        
        try:
            calendar_list = self.service.calendarList().list().execute()
            calendars = []
            for calendar in calendar_list.get('items', []):
                calendars.append({
                    'id': calendar['id'],
                    'name': calendar['summary'],
                    'primary': calendar.get('primary', False),
                    'backgroundColor': calendar.get('backgroundColor', '#9E69AF'),
                })
            return calendars
        except HttpError as error:
            print(f"An error occurred: {error}")
            return []
    
    def list_events(self, calendar_ids: Optional[List[str]] = None,
                    time_min: Optional[datetime] = None,
                    time_max: Optional[datetime] = None,
                    max_results: int = 250) -> List[Dict]:
        """
        List events from specified calendars.
        If calendar_ids is None, fetch from primary calendar.
        """
        if not self.load_credentials():
            raise Exception("Not authenticated with Google Calendar")
        
        if calendar_ids is None:
            calendar_ids = ['primary']
        
        # Default time range: past 30 days to future 365 days
        if time_min is None:
            time_min = datetime.now() - timedelta(days=30)
        if time_max is None:
            time_max = datetime.now() + timedelta(days=365)
        
        all_events = []
        
        try:
            for calendar_id in calendar_ids:
                events_result = self.service.events().list(
                    calendarId=calendar_id,
                    timeMin=time_min.isoformat() + 'Z',
                    timeMax=time_max.isoformat() + 'Z',
                    maxResults=max_results,
                    singleEvents=True,
                    orderBy='startTime'
                ).execute()
                
                events = events_result.get('items', [])
                
                for event in events:
                    # Parse start/end times
                    start = event.get('start', {})
                    end = event.get('end', {})
                    
                    # Check if it's an all-day event
                    is_all_day = 'date' in start
                    
                    if is_all_day:
                        start_date = start.get('date')
                        start_time = None
                        # Google Calendar uses exclusive end date for all-day events
                        # For a 5-day event (Jan 1-5), end.date is Jan 6
                        # We need to subtract 1 day to get the actual last day
                        end_date_str = end.get('date')
                        if end_date_str:
                            end_date_obj = datetime.fromisoformat(end_date_str).date()
                            # Subtract 1 day to get inclusive end date
                            end_date_obj = end_date_obj - timedelta(days=1)
                            # Only set end_date if it's different from start_date
                            if end_date_obj > datetime.fromisoformat(start_date).date():
                                end_date = end_date_obj.isoformat()
                            else:
                                end_date = None
                        else:
                            end_date = None
                        end_time = None
                    else:
                        # Parse datetime
                        start_dt = datetime.fromisoformat(start.get('dateTime', '').replace('Z', '+00:00'))
                        end_dt = datetime.fromisoformat(end.get('dateTime', '').replace('Z', '+00:00'))
                        start_date = start_dt.date().isoformat()
                        start_time = start_dt.time().isoformat()
                        # For multi-day timed events, include end_date
                        if end_dt.date() > start_dt.date():
                            end_date = end_dt.date().isoformat()
                        else:
                            end_date = None
                        end_time = end_dt.time().isoformat()
                    
                    all_events.append({
                        'id': event['id'],
                        'calendar_id': calendar_id,
                        'title': event.get('summary', 'Untitled Event'),
                        'description': event.get('description', ''),
                        'start_date': start_date,
                        'start_time': start_time,
                        'end_date': end_date,
                        'end_time': end_time,
                        'is_all_day': is_all_day,
                        'recurrence': event.get('recurrence'),
                    })
            
            return all_events
        except HttpError as error:
            print(f"An error occurred: {error}")
            return []


# Singleton instance
_google_calendar_service = None


def get_google_calendar_service() -> GoogleCalendarService:
    """Get or create the Google Calendar service singleton."""
    global _google_calendar_service
    if _google_calendar_service is None:
        _google_calendar_service = GoogleCalendarService()
    return _google_calendar_service
