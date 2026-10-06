"use client";

import { forwardRef } from "react";
import type { Dialect } from "@/lib/dialects";
import type { Token } from "@/lib/segment";
import { toSimplified } from "@/lib/simplified";

interface Props {
  italian: string;
  tokens: Token[];
  ita: string;
  dialect: Dialect;
}

const HAN_FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", sans-serif';

/** The card exported as PNG. Fixed brand colors so it looks the same in light and dark mode. */
export const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard({ italian, tokens, ita, dialect }, ref) {
  const han = tokens.filter((t) => t.kind === "han");
  return (
    <div ref={ref} className="w-[560px] overflow-hidden rounded-3xl bg-[#13308f] text-white" style={{ fontFamily: "var(--font-google-sans), sans-serif" }}>
      <div className="flex items-center gap-3 bg-[#0d1a3d] px-8 py-4">
        <span lang="zh-Hans" className="flex size-9 items-center justify-center rounded-lg bg-[#ffc72c] text-xl font-bold text-[#13308f]" style={{ fontFamily: HAN_FONT }}>文</span>
        <span className="text-sm font-medium tracking-wide text-[#c9d6ff]">Traduttore Wencheng · Italiano → <span lang="zh-Hans" style={{ fontFamily: HAN_FONT }}>{toSimplified(dialect.han)}</span></span>
      </div>
      <div className="px-8 py-7">
        <p className="text-2xl font-semibold">{italian}</p>
        <div className="mt-6 flex flex-wrap gap-4">
          {han.map((t, i) => (
            <div key={i} className="flex flex-col items-center">
              <span lang="zh-Hans" className="text-5xl" style={{ fontFamily: HAN_FONT }}>{toSimplified(t.text)}</span>
              <span className="mt-2 text-lg font-semibold text-[#ffc72c]">{t.ita}</span>
            </div>
          ))}
        </div>
        <p className="mt-7 rounded-xl bg-[#ffc72c] px-4 py-3 text-2xl font-bold text-[#13308f]">{ita}</p>
        <p className="mt-5 text-xs text-[#9fb3ef]">Pronuncia approssimata · dati MCPDict (<span lang="zh-Hans">{toSimplified(dialect.table)}</span>)</p>
      </div>
    </div>
  );
});
