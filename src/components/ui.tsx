import { fmtUsd, fmtBs } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-regla pb-5">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[14px] text-tinta-suave">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}

/** Cifra principal del panel: número grande con etiqueta pequeña debajo. */
export function Stat({
  label,
  value,
  detail,
  hero = false,
  spark,
  tone = "tinta",
}: {
  label: string;
  value: string;
  detail?: React.ReactNode;
  /** Cifra protagonista del panel: más grande, con la etiqueta encima. */
  hero?: boolean;
  /** Mini-gráfico de línea (SVG) junto a la cifra. */
  spark?: React.ReactNode;
  /** Color de la regla superior (semántica: dinero=verde, alerta=ámbar). */
  tone?: "tinta" | "verde" | "ambar";
}) {
  if (hero) {
    return (
      <div className="card-lift col-span-2 border-t-2 border-verde bg-white px-5 py-4 lg:col-span-3">
        <p className="text-[12px] text-tinta-suave">{label}</p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <p className="num text-[32px] font-semibold leading-none tracking-tight">
            {value}
          </p>
          {spark && <div aria-hidden className="pb-1">{spark}</div>}
        </div>
        {detail && <p className="num mt-2 text-[12.5px] text-ambar">{detail}</p>}
      </div>
    );
  }
  return (
    <div
      className={`card-lift border-t-2 bg-white px-5 py-4 ${
        tone === "verde" ? "border-verde" : tone === "ambar" ? "border-ambar" : "border-tinta"
      }`}
    >
      <p className="text-[12px] text-tinta-suave">{label}</p>
      <p className="num mt-1.5 text-[22px] font-semibold leading-none tracking-tight">{value}</p>
      {detail && <p className="num mt-1.5 text-[12.5px] text-ambar">{detail}</p>}
    </div>
  );
}

/** Sparkline: línea de tendencia mínima en SVG puro. */
export function Sparkline({
  values,
  width = 120,
  height = 36,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.01);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = height - 3 - ((v - min) / span) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={width} height={height} role="img" aria-label="Tendencia">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="#1C5D4E"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={width}
        cy={height - 3 - ((values[values.length - 1] - min) / span) * (height - 6)}
        r="2.5"
        fill="#1C5D4E"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="card px-6 py-14 text-center">
      <p className="text-[15px] font-medium">{title}</p>
      {hint && <p className="mt-1 text-[13px] text-tinta-suave">{hint}</p>}
    </div>
  );
}

/** Dúo de montos: USD a la izquierda, Bs. en ámbar debajo. */
export function Amount({
  usd,
  bs,
}: {
  usd: number | null | undefined;
  bs?: number | null | undefined;
}) {
  return (
    <div>
      <span className="num block">{fmtUsd(usd)}</span>
      {bs != null && (
        <span className="num block text-[12px] text-ambar">{fmtBs(bs)}</span>
      )}
    </div>
  );
}

/**
 * Ventana modal sin JavaScript: la apertura vive en la URL (?nuevo=1 /
 * ?edit=id), así que el componente solo pinta si `open`. El cierre es un
 * enlace a la misma pantalla sin parámetros — funciona siempre.
 */
export function Modal({
  open,
  title,
  onCloseHref,
  children,
}: {
  open: boolean;
  title: string;
  onCloseHref: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Fondo: clicable, cierra la ventana */}
      <a
        href={onCloseHref}
        aria-label="Cerrar"
        className="fixed inset-0 cursor-default bg-tinta/60"
      />
      <div className="modal-card card relative mx-auto my-[7vh] w-[min(92vw,34rem)] p-6 shadow-[0_24px_64px_rgba(22,33,28,0.35)]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-regla pb-4">
          <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
          <a
            href={onCloseHref}
            aria-label="Cerrar ventana"
            className="-mr-1 px-1.5 text-[18px] leading-none text-tinta-suave transition-colors hover:text-tinta"
          >
            ✕
          </a>
        </div>
        {children}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  issued: "Emitida",
  partially_paid: "Abonada",
  fully_paid: "Pagada",
  voided: "Anulada",
};

export function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "—";
  const tone =
    s === "fully_paid"
      ? "text-verde"
      : s === "voided"
        ? "text-rojo"
        : "text-ambar";
  return (
    <span className={`text-[13px] ${tone}`}>
      {STATUS_LABEL[s] ?? s}
    </span>
  );
}
