import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";

import Header from "../components/Header";
import { preparePrint } from "../api/tasks";
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

const ICON_HORIZONTAL_GAP = 16;

export default function PrintPreview() {
  useEffect(() => {
    document.body.classList.add("print-preview-mode");
    return () => {
      document.body.classList.remove("print-preview-mode");
    };
  }, []);

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
  const manualPositionsRef = useRef<Map<string, { left: number; top: number }>>(new Map());
  const [manualPositionsVersion, setManualPositionsVersion] = useState(0);
  const [autoLayoutTick, setAutoLayoutTick] = useState(0);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number; iconLeft: number; iconTop: number; key: string } | null>(null);
  const activeDragWrapper = useRef<HTMLDivElement | null>(null);
  const latestDragPosition = useRef<{ key: string; left: number; top: number } | null>(null);

  const query = useQuery({
    queryKey: ["print", filters],
    queryFn: () => preparePrint(filters),
  });

  const occurrences = query.data?.occurrences ?? [];

  useEffect(() => {
    setCustomLines(occurrences);
    manualPositionsRef.current.clear();
    setManualPositionsVersion((version) => version + 1);
    setAutoLayoutTick((tick) => tick + 1);
  }, [occurrences]);

  const warning = useMemo(() => {
    if (!query.data) return null;
    if (!query.data.missing_days.length) return null;
    return `No tasks on: ${query.data.missing_days.join(", ")}`;
  }, [query.data]);

  const manualPositionCount = manualPositionsRef.current.size;

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

  const handleIconMouseDown = (event: React.MouseEvent<HTMLImageElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    const img = event.currentTarget;
    const wrapper = img.closest<HTMLDivElement>(".print-line-image");
    if (!wrapper || !editorRef.current) return;

    const key = wrapper.dataset.iconKey ?? `icon-${index}`;
    wrapper.dataset.iconKey = key;

    const editorRect = editorRef.current.getBoundingClientRect();
    const savedPosition = manualPositionsRef.current.get(key);
    const wrapperRect = wrapper.getBoundingClientRect();

    const currentLeft = savedPosition?.left ?? wrapperRect.left - editorRect.left;
    const currentTop = savedPosition?.top ?? wrapperRect.top - editorRect.top;

    wrapper.classList.add("manual-positioned");
    wrapper.style.position = "absolute";
    wrapper.style.marginLeft = "0";
    wrapper.style.left = `${currentLeft}px`;
    wrapper.style.top = `${currentTop}px`;

    activeDragWrapper.current = wrapper;
    dragStartPos.current = {
      x: event.clientX,
      y: event.clientY,
      iconLeft: currentLeft,
      iconTop: currentTop,
      key,
    };
    latestDragPosition.current = { key, left: currentLeft, top: currentTop };

    document.body.style.cursor = "grabbing";
    setDraggingKey(key);

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartPos.current || !activeDragWrapper.current) return;

      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      const newLeft = dragStartPos.current.iconLeft + deltaX;
      const newTop = dragStartPos.current.iconTop + deltaY;

      activeDragWrapper.current.style.left = `${newLeft}px`;
      activeDragWrapper.current.style.top = `${newTop}px`;

      latestDragPosition.current = { key, left: newLeft, top: newTop };
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.removeProperty("cursor");

      setDraggingKey(null);

      if (latestDragPosition.current && latestDragPosition.current.key === key) {
        const { left, top } = latestDragPosition.current;
        manualPositionsRef.current.set(key, { left, top });
        setManualPositionsVersion((version) => version + 1);
      }

      dragStartPos.current = null;
      activeDragWrapper.current = null;
      latestDragPosition.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleResetIconPositions = () => {
    manualPositionsRef.current.clear();
    if (editorRef.current) {
      const wrappers = editorRef.current.querySelectorAll<HTMLDivElement>(".print-line-image");
      wrappers.forEach((wrapper) => {
        wrapper.classList.remove("manual-positioned");
        wrapper.style.position = "";
        wrapper.style.left = "";
        wrapper.style.top = "";
        wrapper.style.marginLeft = "";
      });
    }
    setManualPositionsVersion((version) => version + 1);
    setAutoLayoutTick((tick) => tick + 1);
  };

  const applyManualIconStyles = (
    editor: HTMLDivElement,
    icons: HTMLImageElement[],
    editorRect: DOMRect
  ) => {
    const placements: Array<{ top: number; bottom: number; left: number; right: number }> = [];

    icons.forEach((img) => {
      const wrapper = img.closest<HTMLDivElement>(".print-line-image");
      if (!wrapper) return;

      const key = wrapper.dataset.iconKey;
      if (!key) return;

      const manualPos = manualPositionsRef.current.get(key);
      if (!manualPos) {
        wrapper.classList.remove("manual-positioned");
        wrapper.style.position = "";
        wrapper.style.left = "";
        wrapper.style.top = "";
        wrapper.style.marginLeft = "";
        return;
      }

      const rect = img.getBoundingClientRect();
      const imgWidth = rect.width;
      const imgHeight = rect.height;

      wrapper.style.display = "";
      wrapper.classList.add("manual-positioned");
      wrapper.style.position = "absolute";
      wrapper.style.marginLeft = "0";
      wrapper.style.left = `${manualPos.left}px`;
      wrapper.style.top = `${manualPos.top}px`;
      wrapper.style.removeProperty("--icon-offset");

      const absoluteLeft = editorRect.left + manualPos.left;
      const absoluteTop = editorRect.top + manualPos.top;

      placements.push({
        top: absoluteTop,
        bottom: absoluteTop + imgHeight,
        left: absoluteLeft,
        right: absoluteLeft + imgWidth,
      });
    });

    return placements;
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const icons = Array.from(editor.querySelectorAll<HTMLImageElement>(".print-line-image img"));
    if (!icons.length) return;

    const editorRect = editor.getBoundingClientRect();
    applyManualIconStyles(editor, icons, editorRect);
  }, [manualPositionsVersion]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const distributeIcons = () => {
      const icons = Array.from(editor.querySelectorAll<HTMLImageElement>(".print-line-image img"));
      if (!icons.length) return;

      const editorRect = editor.getBoundingClientRect();
      const baseOffset = 100;
      const placements = applyManualIconStyles(editor, icons, editorRect);

      icons.forEach((img) => {
        const wrapper = img.closest<HTMLDivElement>(".print-line-image");
        if (!wrapper) return;
        const key = wrapper.dataset.iconKey;
        if (!key) return;

        if (manualPositionsRef.current.has(key)) {
          return;
        }

        const rect = img.getBoundingClientRect();
        const imgWidth = rect.width;
        const imgHeight = rect.height;
        const lineTop = rect.top;
        const lineBottom = rect.bottom;

        const maxRight = editorRect.right - baseOffset;

        let offset = 0;
        let tryLeft = editorRect.left + baseOffset;

        let collision = true;
        let attempts = 0;
        const maxAttempts = 50;

        while (collision && attempts < maxAttempts) {
          attempts++;
          collision = false;
          tryLeft = editorRect.left + baseOffset + offset;
          const tryRight = tryLeft + imgWidth;

          if (tryRight > maxRight) {
            offset = 0;
            tryLeft = editorRect.left + baseOffset;
          }

          for (const placed of placements) {
            const horizontalOverlap = !(tryRight <= placed.left || tryLeft >= placed.right);
            const verticalOverlap = !(lineBottom <= placed.top || lineTop >= placed.bottom);

            if (horizontalOverlap && verticalOverlap) {
              collision = true;
              offset = placed.right - editorRect.left - baseOffset + ICON_HORIZONTAL_GAP;
              break;
            }
          }

          if (collision && tryLeft + imgWidth > maxRight) {
            wrapper.style.display = "none";
            return;
          }
        }

        if (attempts >= maxAttempts) {
          wrapper.style.display = "none";
          return;
        }

        wrapper.style.display = "";
        wrapper.style.setProperty("--icon-offset", `${offset}px`);

        placements.push({
          top: lineTop,
          bottom: lineBottom,
          left: tryLeft,
          right: tryLeft + imgWidth,
        });
      });
    };

    distributeIcons();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => distributeIcons()) : undefined;
    resizeObserver?.observe(editor);

    const handleResize = () => distributeIcons();
    window.addEventListener("resize", handleResize);

    const images = Array.from(editor.querySelectorAll<HTMLImageElement>(".print-line-image img"));
    const cleanupImageListeners = images
      .filter((img) => !img.complete)
      .map((img) => {
        const handleLoad = () => distributeIcons();
        img.addEventListener("load", handleLoad, { once: true });
        return () => img.removeEventListener("load", handleLoad);
      });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
      cleanupImageListeners.forEach((cleanup) => cleanup());
    };
  }, [customLines, filters.font_size, settings.fontFamily, settings.lineGap, autoLayoutTick]);

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
        {manualPositionCount > 0 && (
          <button
            type="button"
            className="secondary-button"
            onClick={handleResetIconPositions}
            title="Reset all manually positioned icons to automatic positioning"
          >
            Reset Icon Positions ({manualPositionCount})
          </button>
        )}
      </section>

      {warning && <div className="warning no-print">{warning}</div>}

      <div className="no-print" style={{ textAlign: 'center', padding: '0.75rem', background: '#f0f9ff', borderRadius: '0.5rem', color: '#0369a1', fontWeight: 500, fontSize: '0.875rem', marginBottom: '1rem' }}>
        💡 Tip: You can drag and drop icons to reposition them manually.
      </div>

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
          {customLines.map((item, index) => {
            const iconKey = `icon-${index}`;
            const isDragging = draggingKey === iconKey;

            return (
              <div key={`${item.task_id}-${index}`} className="print-line">
                <span className="print-line-text">{item.title}</span>
                <div className="print-line-image" style={{ "--icon-offset": "0px" } as CSSProperties} data-icon-key={iconKey}>
                  {item.icon_path && (
                    <img
                      src={item.icon_path}
                      alt="Task icon"
                      data-width={item.icon_width ?? 150}
                      data-height={item.icon_height ?? 150}
                      draggable={false}
                      style={{
                        width: item.icon_width ?? 150,
                        height: "auto",
                        cursor: isDragging ? "grabbing" : "grab",
                      }}
                      onMouseDown={(e) => handleIconMouseDown(e, index)}
                      className={isDragging ? "dragging" : ""}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
