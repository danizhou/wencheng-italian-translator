"use client";

import { DIALECTS, type DialectId } from "@/lib/dialects";
import { toSimplified } from "@/lib/simplified";
import { Han } from "./ui";

export function DialectPicker({ value, onChange, disabled }: { value: DialectId; onChange: (id: DialectId) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Dialetto" className="inline-flex rounded-full border border-border bg-surface-2 p-1">
      {DIALECTS.map((d) => (
        <button
          key={d.id}
          type="button"
          role="radio"
          aria-checked={value === d.id}
          disabled={disabled}
          onClick={() => onChange(d.id)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition disabled:opacity-50 ${value === d.id ? "bg-primary text-on-primary shadow-sm" : "text-text hover:bg-primary-soft"}`}
        >
          {d.name} <Han className={value === d.id ? "opacity-80" : "text-muted"}>{toSimplified(d.han)}</Han>
        </button>
      ))}
    </div>
  );
}
