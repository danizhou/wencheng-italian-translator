"use client";

import examples from "@/data/examples.json";

export interface Example {
  it: string;
  zh: string;
}

export function ExampleChips({ onPick, disabled }: { onPick: (example: Example) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(examples as Example[]).map((ex) => (
        <button
          key={ex.zh}
          type="button"
          disabled={disabled}
          onClick={() => onPick(ex)}
          className="rounded-full border border-border bg-surface-2 px-3.5 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:bg-primary-soft disabled:opacity-50"
        >
          {ex.it}
        </button>
      ))}
    </div>
  );
}
