import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGoogleAuthStatus,
  getGoogleAuthUrl,
  disconnectGoogle,
  listCalendars,
  listEvents,
  importEvents,
  CalendarInfo,
  GoogleEvent,
} from "../api/googleCalendar";

type ImportStep = "auth" | "select-calendar" | "select-events" | "importing";

export default function GoogleCalendarImport() {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<ImportStep>("auth");
  const [message, setMessage] = useState("");
  
  // Calendar selection
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [importAllCalendars, setImportAllCalendars] = useState(false);
  
  // Event selection
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    checkAuthStatus();

    // Check for OAuth callback success/failure
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get("google_auth");
    if (authStatus === "success") {
      setMessage("Successfully connected to Google Calendar!");
      checkAuthStatus();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === "failed") {
      setMessage("Failed to connect to Google Calendar. Please try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const status = await getGoogleAuthStatus();
      setIsAuthenticated(status.authenticated);
      if (status.authenticated) {
        setStep("select-calendar");
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const authUrl = await getGoogleAuthUrl();
      window.open(authUrl, "_blank");
      setMessage("Please authorize in the new window, then return here and refresh.");
    } catch (error: any) {
      setMessage(error.message || "Failed to get authorization URL");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGoogle();
      setIsAuthenticated(false);
      setStep("auth");
      setMessage("Disconnected from Google Calendar");
    } catch (error: any) {
      setMessage(error.message || "Failed to disconnect");
    }
  };

  const handleLoadCalendars = async () => {
    try {
      setMessage("");
      const cals = await listCalendars();
      setCalendars(cals);
      setStep("select-calendar");
    } catch (error: any) {
      setMessage(error.message || "Failed to load calendars");
    }
  };

  const handleLoadEvents = async () => {
    setLoadingEvents(true);
    setMessage("");
    try {
      const calIds = importAllCalendars ? undefined : selectedCalendars;
      const evts = await listEvents(calIds);
      setEvents(evts);
      setStep("select-events");
    } catch (error: any) {
      setMessage(error.message || "Failed to load events");
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleToggleEvent = (eventId: string) => {
    const newSelection = new Set(selectedEvents);
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId);
    } else {
      newSelection.add(eventId);
    }
    setSelectedEvents(newSelection);
  };

  const handleSelectAllEvents = () => {
    setSelectedEvents(new Set(events.map(e => e.id)));
  };

  const handleDeselectAllEvents = () => {
    setSelectedEvents(new Set());
  };

  const handleImport = async () => {
    if (selectedEvents.size === 0) {
      setMessage("Please select at least one event to import.");
      return;
    }

    setImporting(true);
    setStep("importing");
    setMessage("");
    
    try {
      const eventsToImport = events.filter(e => selectedEvents.has(e.id));
      const result = await importEvents(eventsToImport);
      setMessage(result.message);
      
      // Refresh the task list to show imported events
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      // Reset state
      setTimeout(() => {
        setStep("select-calendar");
        setSelectedEvents(new Set());
        setEvents([]);
      }, 2000);
    } catch (error: any) {
      setMessage(error.message || "Failed to import events");
      setStep("select-events");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="google-calendar-section">
        <h3>Import from Google Calendar</h3>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="google-calendar-section">
      <h3>Import from Google Calendar</h3>

      {message && (
        <div
          className="message-box"
          style={{
            padding: "10px",
            marginBottom: "15px",
            backgroundColor: message.includes("Success") || message.includes("Successfully") ? "#d4edda" : "#f8d7da",
            color: message.includes("Success") || message.includes("Successfully") ? "#155724" : "#721c24",
            borderRadius: "4px",
          }}
        >
          {message}
        </div>
      )}

      {step === "auth" && !isAuthenticated && (
        <div>
          <p>Connect to Google Calendar to import your events.</p>
          <button onClick={handleConnect} className="primary-button">
            Connect to Google Calendar
          </button>
        </div>
      )}

      {step === "select-calendar" && isAuthenticated && (
        <div>
          <button onClick={handleLoadCalendars} className="secondary-button" style={{ marginBottom: "15px" }}>
            {calendars.length > 0 ? "Refresh Calendars" : "Load Calendars"}
          </button>

          {calendars.length > 0 && (
            <>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={importAllCalendars}
                    onChange={(e) => {
                      setImportAllCalendars(e.target.checked);
                      if (e.target.checked) setSelectedCalendars([]);
                    }}
                  />
                  <span>Import from all calendars</span>
                </label>
              </div>

              {!importAllCalendars && (
                <div style={{ marginBottom: "15px", maxHeight: "200px", overflowY: "auto" }}>
                  <p><strong>Select calendars:</strong></p>
                  {calendars.map(cal => (
                    <label key={cal.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <input
                        type="checkbox"
                        checked={selectedCalendars.includes(cal.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCalendars([...selectedCalendars, cal.id]);
                          } else {
                            setSelectedCalendars(selectedCalendars.filter(id => id !== cal.id));
                          }
                        }}
                      />
                      <span style={{ color: cal.backgroundColor }}>{cal.name}</span>
                      {cal.primary && <span style={{ fontSize: "12px", color: "#666" }}>(Primary)</span>}
                    </label>
                  ))}
                </div>
              )}

              <button
                onClick={handleLoadEvents}
                className="primary-button"
                disabled={loadingEvents || (!importAllCalendars && selectedCalendars.length === 0)}
              >
                {loadingEvents ? "Loading Events..." : "Load Events"}
              </button>
            </>
          )}

          <div style={{ marginTop: "20px" }}>
            <button onClick={handleDisconnect} className="secondary-button">
              Disconnect
            </button>
          </div>
        </div>
      )}

      {step === "select-events" && (
        <div>
          <p><strong>Select events to import:</strong></p>
          <div style={{ marginBottom: "10px" }}>
            <button onClick={handleSelectAllEvents} className="secondary-button" style={{ marginRight: "10px" }}>
              Select All
            </button>
            <button onClick={handleDeselectAllEvents} className="secondary-button">
              Deselect All
            </button>
          </div>

          <div style={{ maxHeight: "400px", overflowY: "auto", marginBottom: "15px", border: "1px solid #ddd", padding: "10px", borderRadius: "4px" }}>
            {events.length === 0 ? (
              <p>No events found.</p>
            ) : (
              events.map(event => (
                <label key={event.id} style={{ display: "block", marginBottom: "12px", padding: "8px", backgroundColor: selectedEvents.has(event.id) ? "#e3f2fd" : "transparent", borderRadius: "4px" }}>
                  <input
                    type="checkbox"
                    checked={selectedEvents.has(event.id)}
                    onChange={() => handleToggleEvent(event.id)}
                    style={{ marginRight: "8px" }}
                  />
                  <strong>{event.title}</strong>
                  <div style={{ fontSize: "13px", color: "#666", marginLeft: "24px" }}>
                    {event.start_date} {event.start_time && `at ${event.start_time.substring(0, 5)}`}
                    {event.is_all_day && " (All day)"}
                  </div>
                </label>
              ))
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleImport} className="primary-button" disabled={selectedEvents.size === 0}>
              Import {selectedEvents.size} Event{selectedEvents.size !== 1 ? "s" : ""}
            </button>
            <button onClick={() => setStep("select-calendar")} className="secondary-button">
              Back
            </button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <div>
          <p>Importing events...</p>
        </div>
      )}
    </div>
  );
}
