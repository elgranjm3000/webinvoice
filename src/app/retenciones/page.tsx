export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { fmtDate, fmtBs } from "@/lib/format";
import Link from "next/link";

type Vat = {
  id: string;
  voucher_number: string;
  voucher_date: string;
  retention_percentage: number;
  taxable_base_ves: number;
  retained_amount_ves: number;
  invoice_id: string;
  invoice: { invoice_number: string } | null;
};
type Islr = Vat & { seniat_concept_code: string };

export default async function Retenciones() {
  const sb = supabaseServer();
  const [vat, islr] = await Promise.all([
    sb
      .from("vat_retentions")
      .select("*, invoice:invoices(invoice_number)")
      .order("voucher_date", { ascending: false })
      .limit(100),
    sb
      .from("islr_retentions")
      .select("*, invoice:invoices(invoice_number)")
      .order("voucher_date", { ascending: false })
      .limit(100),
  ]);

  if (vat.error || islr.error) {
    return (
      <>
        <PageHeader title="Retenciones" />
        <EmptyState
          title="No se pudieron cargar las retenciones"
          hint={(vat.error ?? islr.error)?.message}
        />
      </>
    );
  }

  const rows = [
    ...((vat.data ?? []) as Vat[]).map((r) => ({ ...r, kind: "IVA", concept: null as string | null })),
    ...((islr.data ?? []) as Islr[]).map((r) => ({ ...r, kind: "ISLR", concept: r.seniat_concept_code })),
  ].sort((a, b) => b.voucher_date.localeCompare(a.voucher_date));

  const totalRetained = rows.reduce((s, r) => s + Number(r.retained_amount_ves), 0);

  return (
    <>
      <PageHeader
        title="Retenciones"
        subtitle="Comprobantes de retención de IVA e ISLR"
        action={
          <p className="text-right">
            <span className="num block text-[18px] font-semibold text-ambar">
              {fmtBs(totalRetained)}
            </span>
            <span className="text-[12px] text-tinta-suave">total retenido</span>
          </p>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Sin retenciones registradas"
          hint="Registra retenciones desde el detalle de cada factura."
        />
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-regla text-left text-[12px] text-tinta-suave">
              <th className="py-2 pr-4 font-medium">Comprobante</th>
              <th className="py-2 pr-4 font-medium">Fecha</th>
              <th className="py-2 pr-4 font-medium">Tipo</th>
              <th className="py-2 pr-4 font-medium">Factura</th>
              <th className="num py-2 pr-4 font-medium">Base Bs.</th>
              <th className="num py-2 pr-4 font-medium">%</th>
              <th className="num py-2 font-medium">Retenido Bs.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-regla">
                <td className="num py-3 pr-4 font-medium">{r.voucher_number}</td>
                <td className="py-3 pr-4 whitespace-nowrap">{fmtDate(r.voucher_date)}</td>
                <td className="py-3 pr-4">
                  {r.kind}
                  {r.concept && (
                    <span className="ml-2 text-[12px] text-tinta-suave">
                      concepto {r.concept}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {r.invoice && (
                    <Link
                      href={`/facturas/${r.invoice_id}`}
                      className="num underline decoration-transparent underline-offset-2 hover:decoration-current"
                    >
                      {r.invoice.invoice_number}
                    </Link>
                  )}
                </td>
                <td className="num py-3 pr-4">{fmtBs(r.taxable_base_ves)}</td>
                <td className="num py-3 pr-4">{r.retention_percentage}%</td>
                <td className="num py-3 font-medium text-ambar">
                  {fmtBs(r.retained_amount_ves)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
