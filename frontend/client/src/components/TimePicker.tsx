import { useEffect, useId, useState } from "react";
import type { ChangeEvent } from "react";

interface TimePickerProps {
  value?: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: boolean;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0")
);

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0")
);

const DEFAULT_STATE = { hour: "09", minute: "00" };

const parseTime = (value?: string | null) => {
  if (!value) {
    return DEFAULT_STATE;
  }

  const parts = value.split(":");
  const rawHour = parts[0] ?? "09";
  const rawMinute = parts[1] ?? "00";

  return {
    hour: String(Math.min(Math.max(parseInt(rawHour, 10), 0), 23)).padStart(2, "0"),
    minute: String(parseInt(rawMinute, 10) || 0).padStart(2, "0"),
  };
};

const toTimeString = (hour: string, minute: string) =>
  `${String(Math.min(Math.max(parseInt(hour, 10), 0), 23)).padStart(2, "0")}:${String(
    parseInt(minute, 10) || 0
  ).padStart(2, "0")}`;

export default function TimePicker({ value, onChange, onBlur, disabled, error }: TimePickerProps) {
  const [{ hour, minute }, setTime] = useState(() => parseTime(value ?? undefined));
  const generatedId = useId();
  const hourSelectId = `${generatedId}-hour`;
  const minuteSelectId = `${generatedId}-minute`;

  useEffect(() => {
    setTime(parseTime(value ?? undefined));
  }, [value]);

  const updateTime = (updater: (prev: typeof DEFAULT_STATE) => typeof DEFAULT_STATE) => {
    setTime((prev) => {
      const next = updater(prev);
      onChange(toTimeString(next.hour, next.minute));
      return next;
    });
  };

  const handleHourChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextHour = event.target.value;
    updateTime((prev) => ({ ...prev, hour: nextHour }));
  };

  const handleMinuteChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextMinute = event.target.value;
    updateTime((prev) => ({ ...prev, minute: nextMinute }));
  };

  const handleBlur = () => {
    onBlur?.();
  };

  return (
    <div className={`time-picker${error ? " has-error" : ""}${disabled ? " is-disabled" : ""}`}>
      <div className="time-picker-body">
        <div className="time-picker-select-group">
          <label className="time-picker-label" htmlFor={hourSelectId}>Hour</label>
          <select
            id={hourSelectId}
            className="time-picker-select"
            value={hour}
            onChange={handleHourChange}
            onBlur={handleBlur}
            disabled={disabled}
          >
            {HOUR_OPTIONS.map((optionValue) => (
              <option key={optionValue} value={optionValue}>
                {optionValue}
              </option>
            ))}
          </select>
        </div>
        <span className="time-picker-separator" aria-hidden>:</span>
        <div className="time-picker-select-group">
          <label className="time-picker-label" htmlFor={minuteSelectId}>Minute</label>
          <select
            id={minuteSelectId}
            className="time-picker-select"
            value={minute}
            onChange={handleMinuteChange}
            onBlur={handleBlur}
            disabled={disabled}
          >
            {MINUTE_OPTIONS.map((optionValue) => (
              <option key={optionValue} value={optionValue}>
                {optionValue}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
