export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { fmtBs, fmtDate } from "@/lib/format";

type Doc = {
  id: string;
  invoice_number: string;
  issue_date: string;
  total_ves: number | null;
  customer: { legal_name: string } | null;
};

const BUCKETS = [
  { label: "Por vencer", min: 0, max: 30 },
  { label: "1–30 días", min: 31, max: 60 },
  { label: "31–60 días", min: 61, max: 90 },
  { label: "Más de 60", min: 91, max: Infinity },
];

function daysOverdue(issueDate: string): number {
  const days = Math.floor(
    (Date.now() - new Date(issueDate).getTime()) / 86_400_000
  );
  return Math.max(days - 30, 0);
}

function bucketOf(issueDate: string): string {
  const d = daysOverdue(issueDate);
  return (BUCKETS.find((b) => d >= b.min && d <= b.max) ?? BUCKETS[0]).label;
}

export default async function Cobrar() {
  const sb = supabaseServer();

  const [{ data: docs, error }, { data: payments }, { data: vats }, { data: islrs }] =
    await Promise.all([
      sb
        .from("invoices")
        .select("id, invoice_number, issue_date, total_ves, customer:customers(legal_name)")
        .in("document_type", ["invoice"])
        .in("status", ["issued", "partially_paid", "fully_paid"])
        .order("issue_date")
        .limit(200),
      sb.from("payments").select("invoice_id, ves_equivalent_amount, igtf_amount_ves"),
      sb.from("vat_retentions").select("invoice_id, retained_amount_ves"),
      sb.from("islr_retentions").select("invoice_id, retained_amount_ves"),
    ]);

  if (error || !payments || !vats || !islrs) {
    return (
      <>
        <PageHeader title="Cuentas por cobrar" />
        <EmptyState
          title="No se pudo cargar la cartera"
          hint={(error ?? { message: undefined }).message}
        />
      </>
    );
  }

  const paid = new Map<string, number>();
  const retained = new Map<string, number>();

  for (const p of payments) {
    paid.set(
      p.invoice_id,
      (paid.get(p.invoice_id) ?? 0) + Number(p.ves_equivalent_amount ?? 0)
    );
  }
  for (const r of [...vats, ...islrs]) {
    retained.set(
      r.invoice_id,
      (retained.get(r.invoice_id) ?? 0) + Number(r.retained_amount_ves ?? 0)
    );
  }

  const rows = (docs ?? [])
    .map((d) => {
      const total = Number(d.total_ves ?? 0);
      const cobrado = (paid.get(d.id) ?? 0) + (retained.get(d.id) ?? 0);
      const saldo = Math.max(total - cobrado, 0);
      return { ...d, customer: d.customer as unknown as { legal_name: string } | null, total, cobrado, saldo };
    })
    .filter((r) => r.saldo > 0.009);

  const totalCartera = rows.reduce((s, r) => s + r.saldo, 0);
  const bucketTotals = new Map(
    BUCKETS.map((b) => [
      b.label,
      rows
        .filter((r) => bucketOf(r.issue_date) === b.label)
        .reduce((s, r) => s + r.saldo, 0),
    ])
  );

  return (
    <>
      <PageHeader
        title="Cuentas por cobrar"
        subtitle="Saldo pendiente por factura, con antigüedad de la deuda"
        action={
          <p className="text-right">
            <span className="num block text-[18px] font-semibold text-ambar">
              {fmtBs(totalCartera)}
            </span>
            <span className="text-[12px] text-tinta-suave">saldo por cobrar</span>
          </p>
        }
      />

      {/* Antigüedad de la cartera */}
      <dl className="mb-12 grid grid-cols-2 gap-px border border-regla bg-regla sm:grid-cols-4">
        {BUCKETS.map((b) => (
          <div key={b.label} className="bg-white px-5 py-4 sm:min-h-[86px]">
            <dt className="text-[12px] text-tinta-suave">{b.label}</dt>
            <dd className="num mt-1 text-[16px] font-semibold">
              {fmtBs(bucketTotals.get(b.label) ?? 0)}
            </dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <EmptyState
          title="No hay saldos pendientes"
          hint="Todas las facturas emitidas están cobradas. Aquí aparecerá la cartera activa."
        />
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-tinta text-left text-[12px] text-tinta-suave">
              <th className="py-2 pr-4 font-medium">Factura</th>
              <th className="py-2 pr-4 font-medium">Cliente</th>
              <th className="py-2 pr-4 font-medium">Emisión</th>
              <th className="py-2 pr-4 font-medium">Antigüedad</th>
              <th className="num py-2 pr-4 font-medium">Total Bs.</th>
              <th className="num py-2 pr-4 font-medium">Cobrado Bs.</th>
              <th className="num py-2 font-medium">Saldo Bs.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const overdue = daysOverdue(r.issue_date);
              return (
                <tr key={r.id} className="border-b border-regla">
                  <td className="num py-3 pr-4 font-medium">
                    <Link
                      href={`/facturas/${r.id}`}
                      className="underline decoration-transparent underline-offset-2 hover:decoration-current"
                    >
                      {r.invoice_number}
                    </Link>
                  </td>
                  <td className="max-w-[28ch] truncate py-3 pr-4">
                    {r.customer?.legal_name ?? "—"}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{fmtDate(r.issue_date)}</td>
                  <td className={`py-3 pr-4 ${overdue > 60 ? "text-rojo" : overdue > 30 ? "text-ambar" : "text-tinta-suave"}`}>
                    {overdue === 0 ? <span className="text-verde">corriente</span> : `${overdue} días`}
                  </td>
                  <td className="num py-3 pr-4">{fmtBs(r.total)}</td>
                  <td className="num py-3 pr-4 text-tinta-suave">
                    {fmtBs(r.cobrado)}
                  </td>
                  <td className="num py-3 font-medium text-ambar">{fmtBs(r.saldo)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="mt-8 max-w-prose text-[12px] leading-relaxed text-tinta-suave">
        El monto cobrado suma pagos recibidos y retenciones de IVA e ISLR
        registradas: ambas reducen lo que el cliente te debe en efectivo.
      </p>
    </>
  );
}
