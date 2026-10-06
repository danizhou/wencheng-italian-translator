import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover shadow-sm",
  secondary: "border border-border bg-surface text-text hover:bg-surface-2",
  ghost: "text-primary hover:bg-primary-soft",
  danger: "text-danger hover:bg-danger-soft",
};

export function Button({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Card({ title, subtitle, actions, children, className = "", ...rest }: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <section {...rest} className={`rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(14,26,51,0.04)] ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

type Tone = "neutral" | "success" | "accent" | "warn" | "danger" | "primary";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  success: "bg-success-soft text-success",
  accent: "bg-accent-soft text-on-accent dark:text-accent",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  primary: "bg-primary-soft text-primary",
};

export function Chip({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

/** Chinese text, always marked as simplified so the right glyphs are used */
export function Han({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span lang="zh-Hans" className={className}>{children}</span>;
}
