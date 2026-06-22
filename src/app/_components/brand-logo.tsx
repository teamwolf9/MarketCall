/**
 * Brand mark shown in front of a brand name. Renders the uploaded logo when set,
 * otherwise a tile with the brand's initial. Plain component (no client JS) so it
 * works in server components everywhere a brand is listed.
 */
export function BrandLogo({
  name,
  logoUrl,
  size = 28,
  className = "",
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const dim = { width: size, height: size, borderRadius: Math.round(size * 0.28) };

  if (logoUrl) {
    return (
      // Small data-URL/object logo — next/image adds no value here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        style={dim}
        className={`shrink-0 border border-line object-cover ${className}`}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      style={{ ...dim, fontSize: Math.round(size * 0.48) }}
      className={`inline-flex shrink-0 items-center justify-center bg-accent-soft font-display font-semibold text-accent-hover ${className}`}
    >
      {initial}
    </span>
  );
}
