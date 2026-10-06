import logo from "@/data/logo.json";

/** The app logo: yellow speech bubble with 温, drawn as paths so it looks the same on every device. */
export function Logo({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox={logo.viewBox} className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path d={logo.bubble} fill={logo.colors.bubble} />
      <path d={logo.glyph} transform={logo.glyphTransform} fill={logo.colors.glyph} />
    </svg>
  );
}
