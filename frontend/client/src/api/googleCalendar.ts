const API_BASE_URL = import.meta.env.DEV ? "http://127.0.0.1:8000" : "";

export interface AuthStatus {
  authenticated: boolean;
  message: string;
}

export interface CalendarInfo {
  id: string;
  name: string;
  primary: boolean;
  backgroundColor: string;
}

export interface GoogleEvent {
  id: string;
  calendar_id: string;
  title: string;
  description: string;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  is_all_day: boolean;
  recurrence: string[] | null;
}

export interface ListEventsRequest {
  calendar_ids?: string[];
}

export interface ImportEventsResponse {
  success: boolean;
  imported_count: number;
  failed_count: number;
  message: string;
}

export async function getGoogleAuthStatus(): Promise<AuthStatus> {
  const response = await fetch(`${API_BASE_URL}/google-calendar/auth-status`);
  if (!response.ok) throw new Error("Failed to get auth status");
  return response.json();
}

export async function getGoogleAuthUrl(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/google-calendar/auth-url`);
  if (!response.ok) throw new Error("Failed to get auth URL");
  const data = await response.json();
  return data.auth_url;
}

export async function disconnectGoogle(): Promise<AuthStatus> {
  const response = await fetch(`${API_BASE_URL}/google-calendar/disconnect`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to disconnect");
  return response.json();
}

export async function listCalendars(): Promise<CalendarInfo[]> {
  const response = await fetch(`${API_BASE_URL}/google-calendar/calendars`);
  if (!response.ok) throw new Error("Failed to list calendars");
  return response.json();
}

export async function listEvents(calendarIds?: string[]): Promise<GoogleEvent[]> {
  const body: ListEventsRequest = calendarIds ? { calendar_ids: calendarIds } : {};
  const response = await fetch(`${API_BASE_URL}/google-calendar/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to list events");
  return response.json();
}

export async function importEvents(events: GoogleEvent[]): Promise<ImportEventsResponse> {
  const response = await fetch(`${API_BASE_URL}/google-calendar/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });
  if (!response.ok) throw new Error("Failed to import events");
  return response.json();
}
