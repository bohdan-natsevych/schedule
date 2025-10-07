import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Header from "../components/Header";
import { preparePrint } from "../api/tasks";
import { PrintRequest, TaskOccurrence } from "../types";

const todayISOString = new Date().toISOString().slice(0, 10);
const defaultFrom = todayISOString;
const defaultTo = todayISOString;

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

  const query = useQuery({
    queryKey: ["print", filters],
    queryFn: () => preparePrint(filters),
  });

  const occurrences = query.data?.occurrences ?? [];

  useEffect(() => {
    setCustomLines(occurrences);
  }, [occurrences]);

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
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
