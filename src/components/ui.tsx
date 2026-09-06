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
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
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
}: {
  label: string;
  value: string;
  detail?: React.ReactNode;
}) {
  return (
    <div className="border-t-2 border-tinta pt-3">
      <p className="num text-[22px] font-semibold leading-none">{value}</p>
      <p className="mt-2 text-[13px] text-tinta-suave">{label}</p>
      {detail && <p className="num mt-1 text-[13px] text-ambar">{detail}</p>}
    </div>
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
    <div className="border border-dashed border-regla px-6 py-14 text-center">
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
