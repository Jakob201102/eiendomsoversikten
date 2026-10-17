/** Supplied brand artwork; keep its original proportions and colours. */
export default function BrandLogo({ variant = "full", className = "", decorative = false }: {
  variant?: "full" | "mark";
  className?: string;
  decorative?: boolean;
}) {
  const mark = variant === "mark";
  return <img
    src={mark ? "/brand/eiendomsoversikten-round-v76.jpg" : "/brand/eiendomsoversikten-wide-v76.jpg"}
    alt={decorative ? "" : "Eiendomsoversikten"}
    aria-hidden={decorative || undefined}
    width={mark ? 1254 : 1536}
    height={mark ? 1254 : 1024}
    decoding="async"
    className={`object-contain ${className}`}
  />;
}
