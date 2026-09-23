export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { closeCash } from "./actions";
import { fmtBs, fmtDate } from "@/lib/format";

const num = (n: number) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const METHOD_LABELS: Record<string, string> = {
  punto_de_venta: "Punto de venta",
  transferencia: "Transferencia",
  efectivo_usd: "Efectivo USD",
  zelle: "Zelle",
  pago_movil: "Pago móvil",
  otro: "Otro",
};

function dayRange(fecha: string) {
  const start = new Date(`${fecha}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function Cierre({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; fecha?: string }>;
}) {
  const { ok, error: notice, fecha: fechaParam } = await searchParams;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaParam ?? "")
    ? (fechaParam as string)
    : today();
  const { start, end } = dayRange(fecha);
  const sb = supabaseServer();

  const [{ data: payments }, { data: closes }, { data: alreadyClosed }] =
    await Promise.all([
      sb
        .from("payments")
        .select(
          "id, payment_date, payment_method, payment_currency, original_currency_amount, applied_bcv_rate, ves_equivalent_amount, applies_igtf, igtf_amount_ves, reference_number, invoice:invoices(invoice_number)"
        )
        .gte("payment_date", start)
        .lt("payment_date", end)
        .order("payment_date", { ascending: true })
        .limit(500),
      sb
        .from("cash_closes")
        .select("id, close_date, payments_count, total_ves, total_igtf_ves, totals_by_method")
        .order("close_date", { ascending: false })
        .limit(30),
      sb
        .from("cash_closes")
        .select("id")
        .eq("close_date", fecha)
        .maybeSingle(),
    ]);

  if (!payments || !closes) {
    return (
      <>
        <PageHeader title="Cierre de caja" />
        <EmptyState title="No se pudieron cargar los pagos" />
      </>
    );
  }

  const rows = payments as unknown as {
    id: string;
    payment_date: string;
    payment_method: string;
    payment_currency: string;
    original_currency_amount: number;
    applied_bcv_rate: number | null;
    ves_equivalent_amount: number;
    applies_igtf: boolean | null;
    igtf_amount_ves: number | null;
    reference_number: string | null;
    invoice: { invoice_number: string } | null;
  }[];

  const totalVes = rows.reduce((a, r) => a + Number(r.ves_equivalent_amount), 0);
  const totalIgtf = rows.reduce((a, r) => a + Number(r.igtf_amount_ves ?? 0), 0);
  const byMethod = new Map<string, number>();
  for (const r of rows) {
    byMethod.set(r.payment_method, (byMethod.get(r.payment_method) ?? 0) + Number(r.ves_equivalent_amount));
  }

  const closed = Boolean(alreadyClosed);

  return (
    <>
      <PageHeader
        title="Cierre de caja"
        subtitle="Arqueo diario de los pagos recibidos"
      />

      {notice && (
        <p role="alert" className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-[14px] text-rojo">
          {notice}
        </p>
      )}
      {ok && (
        <p className="mb-6 border-l-2 border-verde bg-white px-4 py-3 text-[14px] text-verde">
          {ok}
        </p>
      )}

      <form action="/cierre" method="get" className="mb-8 flex items-end gap-3">
        <label className="block text-[13px] text-tinta-suave">
          Día a cuadrar
          <input
            type="date"
            name="fecha"
            defaultValue={fecha}
            className="num mt-1.5 block border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="border border-tinta bg-white px-4 py-2 text-[14px] font-medium transition-colors hover:bg-papel-2"
        >
          Ver día
        </button>
      </form>

      {closed ? (
        <p className="mb-8 border-l-2 border-verde bg-white px-4 py-3 text-[14px] text-verde">
          La caja del {fmtDate(fecha)} ya está cerrada. Los pagos de ese día quedan
          congelados en el historial de abajo.
        </p>
      ) : (
        <div className="mb-12 grid gap-6 card p-6 sm:grid-cols-3">
          <div>
            <p className="text-[12px] text-tinta-suave">Pagos del día</p>
            <p className="num mt-1 text-[26px] font-semibold tracking-tight">
              {rows.length}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-tinta-suave">Total recibido</p>
            <p className="num mt-1 text-[26px] font-semibold tracking-tight">
              {fmtBs(totalVes)}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-tinta-suave">IGTF cobrado</p>
            <p className="num mt-1 text-[26px] font-semibold tracking-tight text-ambar">
              {fmtBs(totalIgtf)}
            </p>
          </div>
          <div className="sm:col-span-3">
            <table className="w-full text-[13px]">
              <tbody>
                {[...byMethod.entries()].map(([m, v]) => (
                  <tr key={m} className="border-b border-regla last:border-none">
                    <td className="py-2">{METHOD_LABELS[m] ?? m}</td>
                    <td className="num py-2 text-right font-medium">{fmtBs(v)}</td>
                  </tr>
                ))}
                {byMethod.size === 0 && (
                  <tr>
                    <td className="py-2 text-tinta-suave">Sin pagos registrados este día.</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <form action={closeCash} className="flex items-end gap-4 sm:col-span-3">
            <input type="hidden" name="fecha" value={fecha} />
            <label className="block flex-1 text-[13px] text-tinta-suave">
              Observaciones del cierre (opcional)
              <input
                name="notas"
                maxLength={300}
                className="mt-1.5 w-full border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={rows.length === 0}
              className="bg-tinta px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cerrar caja del {fecha}
            </button>
          </form>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <h2 className="mb-4 text-[15px] font-semibold tracking-tight">
            Pagos del {fmtDate(fecha)}
          </h2>
          <table className="mb-12 w-full text-[14px]">
            <thead>
              <tr className="border-b border-regla text-left text-[12px] text-tinta-suave">
                <th className="py-2 pr-4 font-medium">Hora</th>
                <th className="py-2 pr-4 font-medium">Factura</th>
                <th className="py-2 pr-4 font-medium">Método</th>
                <th className="num py-2 pr-4 font-medium">Monto original</th>
                <th className="num py-2 pr-4 font-medium">Tasa</th>
                <th className="num py-2 pr-4 font-medium">IGTF</th>
                <th className="num py-2 font-medium">Total Bs.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-regla">
                  <td className="num py-3 pr-4 text-tinta-suave">
                    {new Date(r.payment_date).toLocaleTimeString("es-VE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="num py-3 pr-4">{r.invoice?.invoice_number ?? "—"}</td>
                  <td className="py-3 pr-4">{METHOD_LABELS[r.payment_method] ?? r.payment_method}</td>
                  <td className="num py-3 pr-4">
                    {r.payment_currency === "USD" ? "$ " : "Bs. "}
                    {num(Number(r.original_currency_amount))}
                  </td>
                  <td className="num py-3 pr-4 text-tinta-suave">
                    {r.applied_bcv_rate ? num(Number(r.applied_bcv_rate)) : "—"}
                  </td>
                  <td className="num py-3 pr-4 text-ambar">
                    {Number(r.igtf_amount_ves ?? 0) > 0 ? fmtBs(Number(r.igtf_amount_ves)) : "—"}
                  </td>
                  <td className="num py-3 font-medium">{fmtBs(Number(r.ves_equivalent_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2 className="mb-4 text-[15px] font-semibold tracking-tight">
        Cierres anteriores
      </h2>
      {closes.length === 0 ? (
        <EmptyState
          title="Todavía no hay cierres"
          hint="Cuadra la caja al final del día para dejar el arqueo congelado."
        />
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-regla text-left text-[12px] text-tinta-suave">
              <th className="py-2 pr-4 font-medium">Día</th>
              <th className="num py-2 pr-4 font-medium">Pagos</th>
              <th className="num py-2 pr-4 font-medium">Total Bs.</th>
              <th className="num py-2 pr-4 font-medium">IGTF</th>
              <th className="py-2 font-medium">Desglose</th>
            </tr>
          </thead>
          <tbody>
            {closes.map((c) => {
              const m = (c.totals_by_method ?? {}) as Record<string, number>;
              return (
                <tr key={c.id} className="border-b border-regla">
                  <td className="num py-3 pr-4 font-medium">{c.close_date}</td>
                  <td className="num py-3 pr-4">{c.payments_count}</td>
                  <td className="num py-3 pr-4">{fmtBs(Number(c.total_ves))}</td>
                  <td className="num py-3 pr-4 text-ambar">{fmtBs(Number(c.total_igtf_ves))}</td>
                  <td className="py-3 text-[12px] text-tinta-suave">
                    {Object.entries(m)
                      .map(([k, v]) => `${METHOD_LABELS[k] ?? k}: ${num(Number(v))}`)
                      .join(" · ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
