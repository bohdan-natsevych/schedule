import { useEffect, useRef, useState } from "react";
import axios from "axios";

import {
  checkForUpdate,
  fetchUpdateStatus,
  installUpdate,
  type UpdateStatus,
} from "../api/update";

type Phase = "idle" | "checking" | "current" | "available" | "installing" | "error";

const RELAUNCH_POLL_MS = 2000;

const describe = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
    if (detail) return detail;
  }
  return "Could not reach the update service.";
};

export default function UpdateChecker() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pollRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    fetchUpdateStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  if (!status) return null;

  const handleCheck = async () => {
    setPhase("checking");
    setMessage(null);
    try {
      const result = await checkForUpdate();
      setLatestVersion(result.latest_version);
      if (result.update_available) {
        setPhase("available");
      } else {
        setPhase("current");
        setMessage(`You are on the newest version (${result.installed_version}).`);
      }
    } catch (error) {
      setPhase("error");
      setMessage(describe(error));
    }
  };

  const handleInstall = async () => {
    setPhase("installing");
    setMessage("Downloading and installing. The app will restart on its own.");
    try {
      await installUpdate();
    } catch (error) {
      setPhase("error");
      setMessage(describe(error));
      return;
    }

    // CLAUDE CODE: the server exits so the installer can replace the executable,
    // then the installer starts it again. Wait for it to answer before reloading.
    pollRef.current = window.setInterval(async () => {
      try {
        const next = await fetchUpdateStatus();
        if (next.installed_version !== status.installed_version) {
          window.clearInterval(pollRef.current);
          window.location.reload();
        }
      } catch {
        // Still down; keep waiting.
      }
    }, RELAUNCH_POLL_MS);
  };

  return (
    <div className="update-checker no-print">
      <span className="update-checker-version">v{status.installed_version}</span>

      {phase === "available" && status.can_install && (
        <button type="button" className="update-checker-button" onClick={handleInstall}>
          Update to v{latestVersion}
        </button>
      )}

      {phase === "available" && !status.can_install && (
        <a
          className="update-checker-button"
          href={status.releases_url}
          target="_blank"
          rel="noreferrer"
        >
          v{latestVersion} available
        </a>
      )}

      {phase !== "available" && (
        <button
          type="button"
          className="update-checker-button"
          onClick={handleCheck}
          disabled={phase === "checking" || phase === "installing"}
        >
          {phase === "checking" && "Checking..."}
          {phase === "installing" && "Installing..."}
          {phase !== "checking" && phase !== "installing" && "Check for updates"}
        </button>
      )}

      {message && (
        <span
          className={`update-checker-message${phase === "error" ? " is-error" : ""}`}
          role="status"
        >
          {message}
        </span>
      )}
    </div>
  );
}
