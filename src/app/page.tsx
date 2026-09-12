export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, Stat, EmptyState, Sparkline } from "@/components/ui";
import { fmtUsd, fmtBs, fmtDate } from "@/lib/format";
import Link from "next/link";

type Row = Record<string, unknown>;

async function getData() {
  const sb = supabaseServer();
  const firstDay = new Date();
  firstDay.setDate(1);
  firstDay.setHours(0, 0, 0, 0);

  // Medio año hacia atrás: alimenta el gráfico de tendencia mensual.
  const sixMonthsAgo = new Date(firstDay);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

  const [inv, errInv] = await sb
    .from("invoices")
    .select("id, issue_date, total_usd, total_ves")
    .gte("issue_date", sixMonthsAgo.toISOString())
    .neq("status", "voided")
    .then((r) => [r.data, r.error] as const);

  const [rates, errRate] = await sb
    .from("exchange_rates")
    .select("*")
    .order("rate_date", { ascending: false })
    .limit(1)
    .then((r) => [r.data, r.error] as const);

  // PostgREST no permite comparar columna vs columna en el filtro;
  // traemos el stock y filtramos los bajos en memoria.
  const [stock, errLow] = await sb
    .from("inventory_stock")
    .select("product_id, current_stock, min_stock, product:products(description)")
    .then((r) => [r.data, r.error] as const);
  const low = (stock ?? [])
    .filter((s) => Number(s.current_stock) <= Number(s.min_stock))
    .slice(0, 5);

  return { inv, errInv, rate: rates?.[0], errRate, low, errLow };
}

export default async function Dashboard() {
  const { inv, errInv, rate, errRate, low, errLow } = await getData();

  const totalUsd = (inv ?? []).reduce((s, r) => s + Number(r.total_usd ?? 0), 0);
  const totalVes = (inv ?? []).reduce((s, r) => s + Number(r.total_ves ?? 0), 0);

  const byDay = dailySeries(inv ?? []);
  const byMonth = monthlySeries(inv ?? []);

  return (
    <>
      <PageHeader
        title="Panel"
        subtitle="Resumen del mes en curso"
      />

      {errInv || errRate || errLow ? (
        <EmptyState
          title="No hay conexión con la base de datos"
          hint="Verifica que los permisos GRANT estén aplicados en Supabase (ver README del proyecto)."
        />
      ) : !inv || inv.length === 0 ? (
        <EmptyState
          title="Aún no hay facturas este mes"
          hint="Cuando emitas tu primera factura, sus totales aparecerán aquí."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          <Stat
            label="Facturación en dólares (mes)"
            value={fmtUsd(totalUsd)}
            hero
            spark={<Sparkline values={byDay.map((d) => d.value)} />}
          />
          <Stat
            label="Facturas emitidas (mes)"
            value={String(inv.length)}
          />
          <Stat
            label="Facturación en bolívares"
            value={fmtBs(totalVes)}
            tone="verde"
          />
          <Stat
            label="Tasa BCV vigente"
            value={rate ? fmtBs(Number(rate.bcv_rate)) : "Sin registro"}
            detail={rate ? fmtDate(rate.rate_date) : undefined}
          />
        </div>
      )}

      {inv && inv.length > 0 && (
        <div className="mt-6 grid gap-4 xl:grid-cols-5">
          <section className="card min-w-0 p-5 sm:p-6 xl:col-span-3">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[13px] font-medium text-tinta-suave">
                Facturación por día — mes en curso (USD)
              </h2>
              <p className="num text-[12px] text-tinta-suave">
                Total {fmtUsd(totalUsd)} · pico el día{" "}
                {byDay.findIndex((d) => d.value === Math.max(...byDay.map((x) => x.value))) + 1}
              </p>
            </div>
            <BarChart
              slot={30}
              barW={16}
              points={byDay.map((d, i) => ({
                label: String(Number(d.key.slice(-2))),
                value: d.value,
                isToday: i === byDay.length - 1,
                caption: `${fmtUsd(d.value)} — ${fmtDate(d.key)}${i === byDay.length - 1 ? " (hoy)" : ""}`,
              }))}
            />
          </section>

          <section className="card min-w-0 p-5 sm:p-6 xl:col-span-2">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[13px] font-medium text-tinta-suave">
                Últimos 6 meses (USD)
              </h2>
              <p className="num text-[12px] text-tinta-suave">
                Promedio {fmtUsd(byMonth.reduce((s, m) => s + m.value, 0) / 6)}/mes
              </p>
            </div>
            <BarChart
              slot={56}
              barW={36}
              points={byMonth.map((m) => ({
                label: m.label,
                value: m.value,
                showValue: m.value > 0,
                caption: `${m.label}: ${fmtUsd(m.value)}`,
              }))}
            />
          </section>
        </div>
      )}

      {low && low.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-[13px] font-medium text-tinta-suave">
            Productos en o bajo el mínimo
          </h2>
          <ul className="border-t border-regla">
            {low.map((l, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-4 border-b border-regla py-3"
              >
                <span className="text-[14px]">
                  {productDesc(l.product)}
                </span>
                <span className="num text-[14px] text-rojo">
                  {Number(l.current_stock)} en stock
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-16 text-[13px] text-tinta-suave">
        <Link href="/facturas" className="underline underline-offset-2 hover:text-tinta">
          Ver todas las facturas
        </Link>
      </p>
    </>
  );
}

function productDesc(p: unknown): string {
  if (p && typeof p === "object" && "description" in p) {
    return String((p as { description?: unknown }).description ?? "—");
  }
  return "—";
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

type Serie = { key: string; label: string; value: number };

/** Total USD por día del mes en curso (día 1 hasta hoy, sin huecos). */
function dailySeries(rows: Row[]): Serie[] {
  const today = new Date();
  const totals = new Map<string, number>();
  for (const r of rows) {
    const day = String(r.issue_date ?? "").slice(0, 10);
    if (!day) continue;
    totals.set(day, (totals.get(day) ?? 0) + Number(r.total_usd ?? 0));
  }
  const out: Serie[] = [];
  for (let d = 1; d <= today.getDate(); d++) {
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    out.push({
      key,
      label: String(d),
      value: totals.get(key) ?? 0,
    });
  }
  return out;
}

/** Total USD por mes de los últimos 6 meses (incluye el mes vacío en 0). */
function monthlySeries(rows: Row[]): Serie[] {
  const totals = new Map<string, number>();
  for (const r of rows) {
    const month = String(r.issue_date ?? "").slice(0, 7);
    if (!month) continue;
    totals.set(month, (totals.get(month) ?? 0) + Number(r.total_usd ?? 0));
  }
  const out: Serie[] = [];
  const base = new Date();
  base.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({
      key,
      label: MESES[d.getMonth()],
      value: totals.get(key) ?? 0,
    });
  }
  return out;
}

/**
 * Gráfico de barras en SVG puro: se pinta en el servidor y funciona
 * sin JavaScript. Etiqueta máxima arriba, línea base tipo regla.
 */
function BarChart({
  points,
  slot = 44,
  barW = 32,
}: {
  points: {
    label: string;
    value: number;
    showValue?: boolean;
    isToday?: boolean;
    caption: string;
  }[];
  slot?: number;
  barW?: number;
}) {
  const H = 150;
  const baseY = 118; // línea base de las barras
  const chartTop = 14; // holgura para etiquetas de valor
  const W = points.length * slot + 34; // +34: margen para el eje izquierdo
  const max = Math.max(...points.map((p) => p.value), 0.01);

  const half = max / 2;
  const fmtTick = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(v < 10 ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label="Gráfico de barras"
        className="block"
      >
        {/* Rejilla de referencia: mitad y máximo, con su valor en el eje */}
        {[half, max].map((v, i) => {
          const y = baseY - (v / max) * (baseY - chartTop);
          return (
            <g key={i}>
              <line x1={30} y1={y} x2={W} y2={y} stroke="#E3E3DC" strokeWidth="1" />
              <text x={26} y={y + 3} textAnchor="end" fontSize="9" fill="#54635C">
                {fmtTick(v)}
              </text>
            </g>
          );
        })}

        {points.map((p, i) => {
          const barH = p.value > 0 ? Math.max((p.value / max) * (baseY - chartTop), 3) : 0;
          const x = 34 + i * slot + (slot - barW) / 2;
          const cx = x + barW / 2;
          return (
            <g key={i}>
              <title>{p.caption}</title>
              {barH > 0 && (
                <rect
                  x={x}
                  y={baseY - barH}
                  width={barW}
                  height={barH}
                  fill={p.isToday ? "#A65B12" : "#1C5D4E"}
                />
              )}
              {barH === 0 && (
                <rect x={x} y={baseY - 1} width={barW} height={1} fill="#E3E3DC" />
              )}
              {p.showValue && (
                <text
                  x={cx}
                  y={Math.max(baseY - barH - 5, 10)}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#16211C"
                >
                  {fmtTick(p.value)}
                </text>
              )}
              <text
                x={cx}
                y={134}
                textAnchor="middle"
                fontSize="10"
                fontWeight={p.isToday ? 700 : 400}
                fill={p.isToday ? "#A65B12" : "#16211C"}
              >
                {p.label}
              </text>
            </g>
          );
        })}
        <line x1={30} y1={baseY + 0.5} x2={W} y2={baseY + 0.5} stroke="#16211C" strokeWidth="1" />
      </svg>
    </div>
  );
}
