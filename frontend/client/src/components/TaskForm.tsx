import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { addYears, format, parseISO, isValid } from "date-fns";

import WeekdaySelector from "./WeekdaySelector";
import TimePicker from "./TimePicker";
import { Task, TaskCreate } from "../types";

interface TaskFormProps {
  onSubmit: (data: TaskCreate) => void;
  onCancel?: () => void;
  onClear?: () => void;
  defaultValues?: Partial<Task>;
  submitting?: boolean;
  children?: React.ReactNode;
}

export default function TaskForm({ onSubmit, onCancel, onClear, defaultValues, submitting, children }: TaskFormProps) {
  const today = format(new Date(), "yyyy-MM-dd");

  const parseDate = (value?: string | null) => {
    if (!value) return null;
    try {
      const parsed = parseISO(value);
      return isValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const addOneYear = (value: string) => {
    const base = parseDate(value) ?? new Date();
    return format(addYears(base, 1), "yyyy-MM-dd");
  };

  const initialStartDate = defaultValues?.start_date ?? today;
  const initialRecurrence = defaultValues?.recurrence ?? "once";
  const initialEndDate = defaultValues?.end_date
    ?? (initialRecurrence === "once" ? initialStartDate : addOneYear(initialStartDate));
  const initialWeekdayMask = defaultValues?.weekday_mask ?? "";
  const initialStartTime = defaultValues?.start_time ?? "09:00";

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskCreate>({
    defaultValues: {
      title: defaultValues?.title ?? "",
      start_date: initialStartDate,
      start_time: initialStartTime,
      end_date: initialEndDate,
      recurrence: initialRecurrence,
      weekday_mask: initialWeekdayMask,
    },
  });

  useEffect(() => {
    const start = defaultValues?.start_date ?? today;
    const recurrenceValue = defaultValues?.recurrence ?? "once";
    reset({
      title: defaultValues?.title ?? "",
      start_date: start,
      start_time: defaultValues?.start_time ?? "09:00",
      end_date:
        defaultValues?.end_date
          ?? (recurrenceValue === "once" ? start : addOneYear(start)),
      recurrence: recurrenceValue,
      weekday_mask: defaultValues?.weekday_mask ?? "",
    });
  }, [defaultValues, reset, today]);

  const recurrence = watch("recurrence");
  const startDate = watch("start_date");
  const endDate = watch("end_date");
  const weekdayMask = watch("weekday_mask") ?? "";

  useEffect(() => {
    if (!startDate) return;
    const start = parseDate(startDate);
    if (!start) return;

    if (recurrence === "once") {
      // Only auto-set end_date if it's not already set (new task)
      // or if end_date is before start_date (invalid)
      const end = parseDate(endDate);
      if (!end || end < start) {
        setValue("end_date", format(start, "yyyy-MM-dd"), { shouldDirty: true });
      }
      return;
    }

    const end = parseDate(endDate);
    if (!end || end <= start) {
      setValue("end_date", addOneYear(format(start, "yyyy-MM-dd")), {
        shouldDirty: true,
      });
    }
  }, [startDate, recurrence, endDate, setValue]);

  useEffect(() => {
    if (recurrence !== "weekly") {
      setValue("weekday_mask", "", { shouldDirty: true });
    }
  }, [recurrence, setValue]);

  const handleWeekdayChange = (values: string[]) => {
    setValue("weekday_mask", values.join(","), { shouldDirty: true });
  };

  const weekdayValues = weekdayMask
    .split(",")
    .map((day) => day.trim().toLowerCase())
    .filter(Boolean);

  return (
    <form className="form-section" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-field">
        <label htmlFor="title">Title *</label>
        <input id="title" {...register("title", { required: true })} />
        {errors.title && <small>Title is required.</small>}
      </div>

      <div className="form-field">
        <label htmlFor="recurrence">Recurrence *</label>
        <select id="recurrence" {...register("recurrence")}>
          <option value="once">Single Day</option>
          <option value="daily">Every Day</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      <div className="form-field">
        <label>Start date *</label>
        <input type="date" {...register("start_date", { required: true })} />
      </div>

      {recurrence !== "once" && (
        <div className="form-field">
          <label>End date *</label>
          <input type="date" {...register("end_date", { required: true })} />
        </div>
      )}

      <div className="form-field">
        <label>Time *</label>
        <Controller
          name="start_time"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <TimePicker
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={submitting}
              error={Boolean(errors.start_time)}
            />
          )}
        />
        {errors.start_time && <small>Time is required.</small>}
      </div>

      {recurrence === "weekly" && (
        <div className="form-field">
          <label>Weekdays *</label>
          <WeekdaySelector value={weekdayValues} onChange={handleWeekdayChange} />
          {weekdayValues.length === 0 && (
            <small>Select at least one weekday.</small>
          )}
        </div>
      )}

      {recurrence !== "once" && (
        <div className="form-field">
          <label htmlFor="icon_display_mode">Show icon</label>
          <select id="icon_display_mode" {...register("icon_display_mode")}>
            <option value="all">On every occurrence</option>
            <option value="first">On first occurrence only</option>
            <option value="last">On last occurrence only</option>
          </select>
        </div>
      )}

      {children}

      <input type="hidden" {...register("weekday_mask")} />

      <div className="button-group">
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? "Saving..." : "Save Task"}
        </button>
        {onCancel ? (
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel Edit
          </button>
        ) : (
          <button type="button" className="secondary-button" onClick={() => { reset(); onClear?.(); }}>
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
