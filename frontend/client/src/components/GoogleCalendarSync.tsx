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

interface GoogleCalendarImportProps {
  onConnectStart?: () => void;
}

export default function GoogleCalendarImport({ onConnectStart }: GoogleCalendarImportProps = {}) {
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
        await handleLoadCalendars();
        // Trigger scroll after loading calendars
        setTimeout(() => {
          onConnectStart?.();
        }, 200);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      onConnectStart?.();
      const authUrl = await getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (error: any) {
      setMessage(error.message || "Failed to get authorization URL");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect from Google Calendar?")) return;
    try {
      await disconnectGoogle();
      setIsAuthenticated(false);
      setStep("auth");
      setCalendars([]);
      setEvents([]);
      setSelectedCalendars([]);
      setSelectedEvents(new Set());
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

  const getStepNumber = () => {
    if (!isAuthenticated) return 1;
    if (step === "select-calendar") return 2;
    if (step === "select-events") return 3;
    if (step === "importing") return 4;
    return 1;
  };

  if (loading) {
    return (
      <div className="google-calendar-section">
        <div className="google-calendar-header">
          <span className="google-calendar-icon">📅</span>
          <h3>Google Calendar</h3>
        </div>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  return (
    <div className="google-calendar-section">
      <div className="google-calendar-header">
        <span className="google-calendar-icon">📅</span>
        <h3>Google Calendar</h3>
      </div>

      {message && (
        <div className={`message-box ${message.includes("Success") || message.includes("Successfully") ? "success" : "error"}`}>
          <span className="message-text">{message}</span>
          <button 
            className="message-close-btn"
            onClick={() => setMessage("")}
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      )}

      {isAuthenticated && (
        <div className="import-steps">
          <div className={`step-indicator ${step === "select-calendar" || step === "auth" ? "active" : "complete"}`}>
            <span className="step-number">{getStepNumber() > 2 ? "✓" : "1"}</span>
            <span className="step-label">Connect</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-indicator ${step === "select-calendar" ? "active" : step === "select-events" || step === "importing" ? "complete" : ""}`}>
            <span className="step-number">{getStepNumber() > 3 ? "✓" : "2"}</span>
            <span className="step-label">Select</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-indicator ${step === "select-events" ? "active" : step === "importing" ? "complete" : ""}`}>
            <span className="step-number">{getStepNumber() === 4 ? "✓" : "3"}</span>
            <span className="step-label">Import</span>
          </div>
        </div>
      )}

      {!isAuthenticated && (
        <div className="auth-section">
          <p className="section-description">Connect to Google Calendar to import your events as tasks.</p>
          <button onClick={handleConnect} className="primary-button google-connect-btn">
            <span className="google-icon">🔗</span>
            Connect to Google Calendar
          </button>
        </div>
      )}

      {step === "select-calendar" && isAuthenticated && (
        <div className="calendar-selection">
          {calendars.length === 0 ? (
            <p className="loading-text">Loading calendars...</p>
          ) : (
            <>
              <div className="import-option">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={importAllCalendars}
                    onChange={(e) => {
                      setImportAllCalendars(e.target.checked);
                      if (e.target.checked) setSelectedCalendars([]);
                    }}
                    className="custom-checkbox"
                  />
                  <span>Import from all calendars</span>
                </label>
              </div>

              {!importAllCalendars && (
                <div className="calendar-list">
                  <p className="section-subtitle">Select calendars:</p>
                  {calendars.map(cal => (
                    <label key={cal.id} className="calendar-item">
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
                        className="custom-checkbox"
                      />
                      <span className="calendar-name" style={{ borderLeft: `4px solid ${cal.backgroundColor}` }}>
                        {cal.name}
                        {cal.primary && <span className="primary-badge">Primary</span>}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <div className="button-group">
                <button
                  onClick={handleLoadEvents}
                  className="primary-button"
                  disabled={loadingEvents || (!importAllCalendars && selectedCalendars.length === 0)}
                >
                  {loadingEvents ? "Loading Events..." : "Continue to Events"}
                </button>
                <button onClick={handleDisconnect} className="secondary-button disconnect-btn">
                  Disconnect
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === "select-events" && (
        <div className="event-selection">
          <div className="selection-header">
            <p className="section-subtitle">Select events to import ({events.length} total)</p>
            <div className="selection-actions">
              <button onClick={handleSelectAllEvents} className="text-button">
                Select All
              </button>
              <span className="action-separator">•</span>
              <button onClick={handleDeselectAllEvents} className="text-button">
                Clear
              </button>
            </div>
          </div>

          <div className="event-list">
            {events.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>No events found in selected calendars</p>
              </div>
            ) : (
              events.map(event => (
                <label key={event.id} className={`event-item ${selectedEvents.has(event.id) ? "selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selectedEvents.has(event.id)}
                    onChange={() => handleToggleEvent(event.id)}
                    className="custom-checkbox"
                  />
                  <div className="event-details">
                    <div className="event-title">{event.title}</div>
                    <div className="event-meta">
                      <span>📅 {event.start_date}</span>
                      {event.start_time && <span>🕐 {event.start_time.substring(0, 5)}</span>}
                      {event.is_all_day && <span className="all-day-badge">All day</span>}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="button-group">
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
        <div className="importing-state">
          <div className="spinner"></div>
          <p>Importing events...</p>
        </div>
      )}
    </div>
  );
}
