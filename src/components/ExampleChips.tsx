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
          className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {ex.it}
        </button>
      ))}
    </div>
  );
}
