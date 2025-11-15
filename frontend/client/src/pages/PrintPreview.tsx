import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Header from "../components/Header";
import { preparePrint } from "../api/tasks";
import { sendHeartbeat } from "../api/client";
import { PrintRequest, TaskOccurrence } from "../types";

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = new Date();
const defaultFrom = formatDate(today);
const sixMonthsFromToday = (() => {
  const future = new Date(today);
  future.setMonth(future.getMonth() + 6);
  return formatDate(future);
})();
const defaultTo = sixMonthsFromToday;

interface EditorSettings {
  lineGap: number;
  fontFamily: string;
}

const DEFAULT_SETTINGS: EditorSettings = {
  lineGap: 6,
  fontFamily: "Segoe UI",
};

export default function PrintPreview() {
  const [filters, setFilters] = useState<PrintRequest>({
    from_date: defaultFrom,
    to_date: defaultTo,
    font_size: 12,
  });
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const [customLines, setCustomLines] = useState<TaskOccurrence[]>([]);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const pageHeightRef = useRef<number | null>(null);

  const query = useQuery({
    queryKey: ["print", filters],
    queryFn: () => preparePrint(filters),
  });

  const occurrences = query.data?.occurrences ?? [];

  useEffect(() => {
    setCustomLines(occurrences);
  }, [occurrences]);

  // Heartbeat to keep server alive
  useEffect(() => {
    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 3 seconds
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 3000);

    // CURSOR: Removed automatic shutdown on beforeunload as it triggers on page refresh

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, []);

  const warning = useMemo(() => {
    if (!query.data) return null;
    if (!query.data.missing_days.length) return null;
    return `No tasks on: ${query.data.missing_days.join(", ")}`;
  }, [query.data]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: name === "font_size" ? Number(value) : value,
    }));
  };

  const handleGapChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setSettings((prev) => ({ ...prev, lineGap: value }));
  };

  const handleFontChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSettings((prev) => ({ ...prev, fontFamily: value }));
  };

  const handleEditorInput = () => {
    const node = editorRef.current;
    if (!node) return;

    const blocks = Array.from(node.querySelectorAll(".print-line"));
    const updated: TaskOccurrence[] = blocks.map((block, index) => {
      const textElement = block.querySelector(".print-line-text");
      const img = block.querySelector("img");
      const base = customLines[index];

      return {
        ...base,
        title: textElement?.textContent ?? base?.title ?? "",
        icon_width: img ? parseInt(img.getAttribute("data-width") ?? "150", 10) : base?.icon_width,
        icon_height: img ? parseInt(img.getAttribute("data-height") ?? "150", 10) : base?.icon_height,
      };
    });

    setCustomLines(updated);
  };

  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;

    const resolvePageHeight = () => {
      if (pageHeightRef.current !== null) {
        return pageHeightRef.current;
      }

      if (typeof window === "undefined") {
        return 0;
      }

      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.visibility = "hidden";
      div.style.height = "297mm";
      div.style.width = "1px";
      div.style.pointerEvents = "none";
      document.body.appendChild(div);
      const height = div.getBoundingClientRect().height;
      document.body.removeChild(div);
      pageHeightRef.current = height;
      return height;
    };

    let timeoutId: number | undefined;
    const updatePageCount = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        const pageHeight = resolvePageHeight();
        if (!pageHeight) return;
        const totalHeight = node.scrollHeight;
        const pages = Math.max(1, Math.ceil(totalHeight / pageHeight));
        setPageCount((prev) => (prev === pages ? prev : pages));
      }, 100);
    };

    updatePageCount();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updatePageCount())
        : undefined;
    observer?.observe(node);

    const handleResize = () => updatePageCount();
    window.addEventListener("resize", handleResize);

    const images = Array.from(node.querySelectorAll("img"));
    const cleanupImageListeners = images
      .filter((img) => !img.complete)
      .map((img) => {
        const handleLoad = () => updatePageCount();
        img.addEventListener("load", handleLoad, { once: true });
        return () => img.removeEventListener("load", handleLoad);
      });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      observer?.disconnect();
      window.removeEventListener("resize", handleResize);
      cleanupImageListeners.forEach((cleanup) => cleanup());
    };
  }, [customLines, filters.font_size, settings.fontFamily, settings.lineGap]);

  return (
    <div className="print-preview" style={{ gap: "1rem" }}>
      <div className="no-print">
        <Header />
      </div>

      <section className="print-controls no-print">
        <div className="form-field">
          <label>From date</label>
          <input
            type="date"
            name="from_date"
            value={filters.from_date}
            onChange={handleChange}
          />
        </div>
        <div className="form-field">
          <label>To date</label>
          <input
            type="date"
            name="to_date"
            value={filters.to_date}
            onChange={handleChange}
            min={filters.from_date}
          />
        </div>
        <div className="form-field">
          <label>Font size</label>
          <input
            type="number"
            name="font_size"
            min={5}
            max={72}
            value={filters.font_size}
            onChange={handleChange}
          />
        </div>
        <div className="form-field">
          <label>Line gap (px)</label>
          <input
            type="number"
            min={0}
            max={48}
            value={settings.lineGap}
            onChange={handleGapChange}
          />
        </div>
        <div className="form-field">
          <label>Font family</label>
          <select value={settings.fontFamily} onChange={handleFontChange}>
            <option value="Segoe UI">Segoe UI</option>
            <option value="Roboto">Roboto</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
          </select>
        </div>
        <button type="button" className="primary-button" onClick={() => window.print()}>
          Print (A4 portrait)
        </button>
        <div className="page-count-indicator" aria-live="polite">
          Estimated pages: <span>{pageCount}</span>
        </div>
      </section>

      {warning && <div className="warning no-print">{warning}</div>}

      {query.isLoading && <p>Loading...</p>}
      {!query.isLoading && !customLines.length && <p>No tasks in range.</p>}

      <div className="print-editor-wrapper">
        <div
          ref={editorRef}
          className="print-editor"
          contentEditable
          suppressContentEditableWarning
          style={{
            fontSize: `${filters.font_size}px`,
            fontFamily: settings.fontFamily,
            // @ts-ignore custom property for CSS gap
            "--line-gap": `${settings.lineGap}px`,
          }}
          onInput={handleEditorInput}
        >
          {customLines.map((item, index) => (
            <div key={`${item.task_id}-${index}`} className="print-line">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="print-line-text">{item.title}</span>
                {item.icon_path && (
                  <img
                    src={item.icon_path}
                    alt="Task icon"
                    data-width={item.icon_width ?? 150}
                    data-height={item.icon_height ?? 150}
                    style={{
                      width: item.icon_width ?? 150,
                      height: item.icon_height ?? 150,
                      marginLeft: '100px',
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
