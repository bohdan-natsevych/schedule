import React, { useEffect, useState } from "react";

interface IconUploaderProps {
  taskId: number;
  iconPath?: string | null;
  iconWidth?: number | null;
  iconHeight?: number | null;
  onUpload: (file: File) => Promise<void>;
  onResize: (dimensions: { icon_width: number; icon_height: number }) => void;
}

export default function IconUploader({
  taskId,
  iconPath,
  iconWidth = 150,
  iconHeight = 150,
  onUpload,
  onResize,
}: IconUploaderProps) {
  const [preview, setPreview] = useState(iconPath ?? null);
  const [width, setWidth] = useState(iconWidth);
  const [height, setHeight] = useState(iconHeight);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await onUpload(file);
  };

  const handleResize = () => {
    onResize({ icon_width: width, icon_height: height });
  };

  useEffect(() => {
    setPreview(iconPath ?? null);
    setWidth(iconWidth);
    setHeight(iconHeight);
  }, [iconPath, iconHeight, iconWidth]);

  return (
    <div>
      <label htmlFor={`icon-${taskId}`}>Icon (optional)</label>
      <input id={`icon-${taskId}`} type="file" accept="image/*" onChange={handleFileChange} />
      {preview && (
        <div>
          <img
            src={preview}
            alt="Task icon"
            width={width}
            height={height}
            style={{ display: "block", marginTop: "0.5rem" }}
          />
          <div className="icon-resize">
            <label>
              Width
              <input
                type="number"
                min={50}
                max={300}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
              />
            </label>
            <label>
              Height
              <input
                type="number"
                min={50}
                max={300}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
              />
            </label>
            <button type="button" className="secondary-button" onClick={handleResize}>
              Apply size
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
