"use client";

import { useId, useState } from "react";

type FormFieldProps = {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  autoComplete: string;
  defaultValue?: string;
  hint?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
};

/**
 * Large, iPad-friendly input. Text is 16px or larger so Safari does not
 * zoom in when the field is tapped. Password fields get a Show/Hide button.
 */
export function FormField({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  hint,
  required = true,
  minLength,
  maxLength,
}: FormFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isPassword && visible ? "text" : type}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          autoCapitalize={type === "text" ? "words" : "none"}
          autoCorrect="off"
          spellCheck={false}
          className="h-14 w-full rounded-xl border border-panel-edge bg-cockpit px-4 text-base text-ink outline-none transition focus:border-amber focus:ring-2 focus:ring-amber/30"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-2 my-2 rounded-lg px-3 text-sm font-medium text-muted hover:text-ink"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
