"use client";

import { forwardRef } from "react";
import type { Token } from "@/lib/segment";

interface Props {
  italian: string;
  tokens: Token[];
  ita: string;
}

/** The card exported as PNG for social media. Fixed colors so the image looks the same in light and dark mode. */
export const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard({ italian, tokens, ita }, ref) {
  const han = tokens.filter((t) => t.kind === "han");
  return (
    <div ref={ref} className="w-[540px] rounded-2xl bg-[#111827] p-8 text-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      <p className="text-sm uppercase tracking-widest text-[#9ca3af]">Italiano → Wenchenghua</p>
      <p className="mt-2 text-2xl font-semibold">{italian}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {han.map((t, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="text-4xl">{t.text}</span>
            <span className="mt-1 text-lg font-semibold text-[#fcd34d]">{t.ita}</span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xl text-[#fcd34d]">{ita}</p>
      <p className="mt-6 text-xs text-[#6b7280]">Pronuncia approssimata · dati MCPDict (文成大嶨)</p>
    </div>
  );
});
