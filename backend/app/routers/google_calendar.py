"""
Google Calendar API router.
Handles OAuth2 flow and importing events from Google Calendar.
"""
from typing import List, Optional
from datetime import datetime, date, time
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app import crud, schemas
from app.database import get_db
from app.services.google_calendar import get_google_calendar_service

router = APIRouter(prefix="/google-calendar", tags=["google-calendar"])


class AuthStatusResponse(BaseModel):
    """Response model for authentication status."""
    authenticated: bool
    message: str


class CalendarInfo(BaseModel):
    """Response model for calendar information."""
    id: str
    name: str
    primary: bool
    backgroundColor: str


class GoogleEvent(BaseModel):
    """Response model for Google Calendar events."""
    id: str
    calendar_id: str
    title: str
    description: str
    start_date: str
    start_time: Optional[str]
    end_date: Optional[str]
    end_time: Optional[str]
    is_all_day: bool
    recurrence: Optional[List[str]]


class ListEventsRequest(BaseModel):
    """Request model for listing events."""
    calendar_ids: Optional[List[str]] = None  # If None, use primary calendar


class ImportEventsRequest(BaseModel):
    """Request model for importing selected events."""
    events: List[GoogleEvent]


class ImportEventsResponse(BaseModel):
    """Response model for import operation."""
    success: bool
    imported_count: int
    failed_count: int
    message: str


@router.get("/auth-status", response_model=AuthStatusResponse)
def get_auth_status():
    """Check if the user is authenticated with Google Calendar."""
    service = get_google_calendar_service()
    is_authenticated = service.is_authenticated()
    
    return AuthStatusResponse(
        authenticated=is_authenticated,
        message="Connected to Google Calendar" if is_authenticated else "Not connected"
    )


@router.get("/auth-url")
def get_auth_url():
    """Get the Google OAuth2 authorization URL."""
    try:
        service = get_google_calendar_service()
        auth_url = service.get_authorization_url()
        return {"auth_url": auth_url}
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate authorization URL: {str(e)}"
        )


@router.get("/oauth2callback")
def oauth2_callback(request: Request, code: str = Query(...), state: Optional[str] = None):
    """
    OAuth2 callback endpoint.
    Google redirects here after user authorizes the app.
    """
    service = get_google_calendar_service()
    success = service.exchange_code_for_token(code)
    
    # CURSOR: Get base URL from request to redirect to correct port (dev or production)
    base_url = f"{request.url.scheme}://{request.url.netloc}"
    
    if success:
        return RedirectResponse(url=f"{base_url}/?google_auth=success")
    else:
        return RedirectResponse(url=f"{base_url}/?google_auth=failed")


@router.post("/disconnect", response_model=AuthStatusResponse)
def disconnect_google_calendar():
    """Disconnect from Google Calendar (remove stored credentials)."""
    service = get_google_calendar_service()
    success = service.disconnect()
    
    if success:
        return AuthStatusResponse(
            authenticated=False,
            message="Successfully disconnected from Google Calendar"
        )
    else:
        raise HTTPException(
            status_code=500,
            detail="Failed to disconnect from Google Calendar"
        )


@router.get("/calendars", response_model=List[CalendarInfo])
def list_calendars():
    """List all calendars accessible to the authenticated user."""
    service = get_google_calendar_service()
    
    if not service.is_authenticated():
        raise HTTPException(
            status_code=401,
            detail="Not authenticated with Google Calendar. Please authenticate first."
        )
    
    try:
        calendars = service.list_calendars()
        return [CalendarInfo(**cal) for cal in calendars]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch calendars: {str(e)}"
        )


@router.post("/events", response_model=List[GoogleEvent])
def list_events(request: ListEventsRequest):
    """List events from specified calendars."""
    service = get_google_calendar_service()
    
    if not service.is_authenticated():
        raise HTTPException(
            status_code=401,
            detail="Not authenticated with Google Calendar. Please authenticate first."
        )
    
    try:
        events = service.list_events(calendar_ids=request.calendar_ids)
        return [GoogleEvent(**event) for event in events]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch events: {str(e)}"
        )


@router.post("/import", response_model=ImportEventsResponse)
def import_events(request: ImportEventsRequest, db: Session = Depends(get_db)):
    """Import selected events from Google Calendar as tasks."""
    imported_count = 0
    failed_count = 0
    
    for event in request.events:
        try:
            # Parse start_time
            start_time_obj = None
            if event.start_time:
                try:
                    # Parse time from ISO format
                    start_time_obj = time.fromisoformat(event.start_time.split('.')[0])
                except Exception:
                    # Default to 9:00 AM if parsing fails
                    start_time_obj = time(9, 0)
            else:
                # All-day event, default to 9:00 AM
                start_time_obj = time(9, 0)
            
            # Determine recurrence based on date range
            start_date_obj = date.fromisoformat(event.start_date)
            end_date_obj = date.fromisoformat(event.end_date) if event.end_date else start_date_obj
            
            # Check if event spans multiple days
            if end_date_obj > start_date_obj:
                # Multi-day event - use daily recurrence
                recurrence_type = "daily"
            else:
                # Single day event
                recurrence_type = "once"
                end_date_obj = None  # Clear end_date for single day events
            
            # Create task from event
            task_data = schemas.TaskCreate(
                title=event.title,
                description=event.description or None,
                start_date=start_date_obj,
                end_date=end_date_obj,
                start_time=start_time_obj,
                end_time=None,
                recurrence=recurrence_type,
                weekday_mask=None,
                icon_path=None,
                icon_width=None,
                icon_height=None,
                icon_display_mode="all",
                font_size=None,
                is_all_day=event.is_all_day,
                sync_to_google_calendar=False,
            )
            
            crud.create_task(db, task_data)
            imported_count += 1
            
        except Exception as e:
            print(f"Error importing event {event.id}: {e}")
            failed_count += 1
    
    message = (
        f"Successfully imported {imported_count} events."
        if failed_count == 0
        else f"Imported {imported_count} events. {failed_count} failed."
    )
    
    return ImportEventsResponse(
        success=failed_count == 0,
        imported_count=imported_count,
        failed_count=failed_count,
        message=message
    )
