import { useMemo, useState } from "react";

const WEEKDAYS = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

interface WeekdaySelectorProps {
  value: string[];
  onChange: (values: string[]) => void;
}

export default function WeekdaySelector({ value, onChange }: WeekdaySelectorProps) {
  const [inputValue, setInputValue] = useState("");
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);

  const suggestions = useMemo(() => {
    const normalized = inputValue.trim().toLowerCase();
    return WEEKDAYS.filter(
      (day) =>
        !value.includes(day.value) &&
        (normalized.length === 0 || day.label.toLowerCase().includes(normalized)),
    );
  }, [inputValue, value]);

  const addWeekday = (weekday: string) => {
    if (value.includes(weekday)) return;
    onChange([...value, weekday]);
    setInputValue("");
  };

  const removeWeekday = (weekday: string) => {
    onChange(value.filter((item) => item !== weekday));
  };

  const handleSuggestionClick = (weekday: string) => {
    addWeekday(weekday);
    setIsPopoverVisible(false);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !inputValue && value.length) {
      event.preventDefault();
      removeWeekday(value[value.length - 1]);
    }
    if (event.key === "Enter" && suggestions.length) {
      event.preventDefault();
      addWeekday(suggestions[0].value);
      setIsPopoverVisible(false);
    }
  };

  return (
    <div
      className="weekday-selector"
      onFocus={() => setIsPopoverVisible(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPopoverVisible(false);
        }
      }}
    >
      <div className="weekday-selector-input">
        {value.map((weekday) => {
          const label = WEEKDAYS.find((day) => day.value === weekday)?.label ?? weekday;
          return (
            <span key={weekday} className="weekday-chip">
              {label}
              <button
                type="button"
                className="weekday-chip-remove"
                onClick={() => removeWeekday(weekday)}
                aria-label={`Remove ${label}`}
              >
                ×
              </button>
            </span>
          );
        })}
        <input
          type="text"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            setIsPopoverVisible(true);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Start typing a weekday"
        />
      </div>
      {isPopoverVisible && suggestions.length > 0 && (
        <ul className="weekday-selector-suggestions">
          {suggestions.map((day) => (
            <li key={day.value}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSuggestionClick(day.value);
                }}
              >
                {day.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
