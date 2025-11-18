import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";

interface IconUploaderProps {
  taskId?: number;
  iconPath?: string | null;
  iconWidth?: number | null;
  iconHeight?: number | null;
  onUpload: (file: File) => Promise<void> | void;
  onResize: (dimensions: { icon_width: number; icon_height: number }) => void;
  onRemove?: () => void;
  deferActions?: boolean;
}

export interface IconUploaderRef {
  applyPendingChanges: () => void;
}

type SizePreset = 'small' | 'medium' | 'large' | 'custom';

const IconUploader = forwardRef<IconUploaderRef, IconUploaderProps>(({
  taskId,
  iconPath,
  iconWidth = 150,
  iconHeight = 150,
  onUpload,
  onResize,
  onRemove,
  deferActions = false,
}, ref) => {
  const [preview, setPreview] = useState(iconPath ?? null);
  const [width, setWidth] = useState(iconWidth ?? 150);
  const [height, setHeight] = useState(iconHeight ?? 150);
  const [tempWidth, setTempWidth] = useState<number | ''>(iconWidth ?? 150);
  const [tempHeight, setTempHeight] = useState<number | ''>(iconHeight ?? 150);
  const [hasLocalPreview, setHasLocalPreview] = useState(false);
  const [sizePreset, setSizePreset] = useState<SizePreset>('medium');
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number>(1);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const SIZE_PRESETS = {
    small: { width: 75, height: 75 },
    medium: { width: 112, height: 112 },
    large: { width: 150, height: 150 },
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const shouldPreviewLocally = deferActions || !taskId;

    if (shouldPreviewLocally) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        setHasLocalPreview(true);
        
        // Load image to get natural dimensions
        const img = new Image();
        img.onload = () => {
          const ratio = img.naturalWidth / img.naturalHeight;
          setNaturalAspectRatio(ratio);
          setAspectRatio(ratio);
          
          // Set medium size as default
          const mediumWidth = SIZE_PRESETS.medium.width;
          const mediumHeight = Math.round(mediumWidth / ratio);
          setWidth(mediumWidth);
          setHeight(mediumHeight);
          setTempWidth(mediumWidth);
          setTempHeight(mediumHeight);
          setSizePreset('medium');
          onResize({ icon_width: mediumWidth, icon_height: mediumHeight });
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
    
    await onUpload(file);
  };

  const handleImageLoad = () => {
    if (imgRef.current) {
      const ratio = imgRef.current.naturalWidth / imgRef.current.naturalHeight;
      setNaturalAspectRatio(ratio);
      setAspectRatio(ratio);
    }
  };

  const handleSizePresetChange = (preset: SizePreset) => {
    setSizePreset(preset);
    
    if (preset === 'custom') {
      // Don't change dimensions, just switch to custom mode
      return;
    }
    
    // Use the preset's width and calculate height based on aspect ratio
    const baseWidth = SIZE_PRESETS[preset].width;
    const newWidth = baseWidth;
    const newHeight = Math.round(baseWidth / aspectRatio);
    setWidth(newWidth);
    setHeight(newHeight);
    setTempWidth(newWidth);
    setTempHeight(newHeight);
    onResize({ icon_width: newWidth, icon_height: newHeight });
  };

  const handleWidthChange = (value: string) => {
    // Allow typing any numeric value, validate on blur
    const parsed = parseInt(value);
    if (!isNaN(parsed) || value === '') {
      setTempWidth(value === '' ? '' : parsed);
      
      if (!isNaN(parsed)) {
        setSizePreset('custom');
        const newHeight = Math.round(parsed / aspectRatio);
        setTempHeight(newHeight);
      }
    }
  };

  const handleHeightChange = (value: string) => {
    // Allow typing any numeric value, validate on blur
    const parsed = parseInt(value);
    if (!isNaN(parsed) || value === '') {
      setTempHeight(value === '' ? '' : parsed);
      
      if (!isNaN(parsed)) {
        setSizePreset('custom');
        const newWidth = Math.round(parsed * aspectRatio);
        setTempWidth(newWidth);
      }
    }
  };

  const applyCustomSize = () => {
    // Validate and clamp values on blur
    const validWidth = Math.max(50, Math.min(300, typeof tempWidth === 'number' ? tempWidth : 150));
    const validHeight = Math.max(50, Math.min(300, typeof tempHeight === 'number' ? tempHeight : 150));
    
    setTempWidth(validWidth);
    setTempHeight(validHeight);
    setWidth(validWidth);
    setHeight(validHeight);
    onResize({ icon_width: validWidth, icon_height: validHeight });
  };

  const handleWidthBlur = () => {
    if (tempWidth === '') {
      setTempWidth(width ?? 150);
      return;
    }
    applyCustomSize();
  };

  const handleHeightBlur = () => {
    if (tempHeight === '') {
      setTempHeight(height ?? 150);
      return;
    }
    applyCustomSize();
  };

  // Expose the apply function to parent components
  useImperativeHandle(ref, () => ({
    applyPendingChanges: () => {
      if (sizePreset === 'custom' && (tempWidth !== width || tempHeight !== height)) {
        applyCustomSize();
      }
    },
  }));

  useEffect(() => {
    if (deferActions && hasLocalPreview) {
      return;
    }

    const w = iconWidth ?? 150;
    const h = iconHeight ?? 150;
    setPreview(iconPath ?? null);
    setWidth(w);
    setHeight(h);
    setTempWidth(w);
    setTempHeight(h);
    if (hasLocalPreview) {
      setHasLocalPreview(false);
    }

    // Don't calculate aspect ratio from stored dimensions yet
    // Wait for image to load to get natural aspect ratio
  }, [iconPath, iconHeight, iconWidth, deferActions, hasLocalPreview]);

  useEffect(() => {
    if (!taskId) {
      return;
    }
    setHasLocalPreview(false);
  }, [taskId]);

  useEffect(() => {
    // Determine which preset matches based on width and natural aspect ratio
    if (naturalAspectRatio === 1) return; // Wait for natural aspect ratio to be calculated
    
    const w = width ?? 150;
    const h = height ?? 150;
    
    const smallHeight = Math.round(SIZE_PRESETS.small.width / naturalAspectRatio);
    const mediumHeight = Math.round(SIZE_PRESETS.medium.width / naturalAspectRatio);
    const largeHeight = Math.round(SIZE_PRESETS.large.width / naturalAspectRatio);
    
    if (w === SIZE_PRESETS.small.width && h === smallHeight) {
      setSizePreset('small');
    } else if (w === SIZE_PRESETS.medium.width && h === mediumHeight) {
      setSizePreset('medium');
    } else if (w === SIZE_PRESETS.large.width && h === largeHeight) {
      setSizePreset('large');
    } else {
      setSizePreset('custom');
    }
  }, [width, height, naturalAspectRatio]);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  const handleRemoveClick = () => {
    const shouldPreviewLocally = deferActions || !taskId;
    if (shouldPreviewLocally) {
      setPreview(null);
    }
    setHasLocalPreview(false);
    onRemove?.();
  };

  return (
    <div className="icon-uploader-container">
      <label htmlFor={`icon-${taskId}`} className="form-field-label">Icon</label>
      <div className="file-input-wrapper">
        <label htmlFor={`icon-${taskId}`} className="file-input-button">
          Choose File
        </label>
        <input 
          id={`icon-${taskId}`} 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange}
          className="file-input-hidden"
        />
        {preview && onRemove && (
          <button 
            type="button" 
            className="icon-remove-button" 
            onClick={handleRemoveClick}
            title="Remove icon"
          >
            ✕
          </button>
        )}
      </div>
      {preview && (
        <div>
          <img
            ref={imgRef}
            src={preview}
            alt="Task icon"
            width={width ?? 150}
            height={height ?? 150}
            style={{ display: "block", marginTop: "0.5rem" }}
            onLoad={handleImageLoad}
          />
          <div className="icon-size-controls">
            <div className="size-preset-buttons">
              <button
                type="button"
                className={`size-preset-btn ${sizePreset === 'small' ? 'active' : ''}`}
                onClick={() => handleSizePresetChange('small')}
              >
                Small
              </button>
              <button
                type="button"
                className={`size-preset-btn ${sizePreset === 'medium' ? 'active' : ''}`}
                onClick={() => handleSizePresetChange('medium')}
              >
                Medium
              </button>
              <button
                type="button"
                className={`size-preset-btn ${sizePreset === 'large' ? 'active' : ''}`}
                onClick={() => handleSizePresetChange('large')}
              >
                Large
              </button>
              <button
                type="button"
                className={`size-preset-btn ${sizePreset === 'custom' ? 'active' : ''}`}
                onClick={() => handleSizePresetChange('custom')}
              >
                Custom
              </button>
            </div>
            {sizePreset === 'custom' && (
              <div className="icon-resize-custom">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={tempWidth ?? 150}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  onBlur={handleWidthBlur}
                  onFocus={(e) => e.target.select()}
                  className="size-input"
                  placeholder="Width"
                />
                <span className="size-separator">×</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={tempHeight ?? 150}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  onBlur={handleHeightBlur}
                  onFocus={(e) => e.target.select()}
                  className="size-input"
                  placeholder="Height"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

IconUploader.displayName = 'IconUploader';

export default IconUploader;
