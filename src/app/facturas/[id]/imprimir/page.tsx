export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { EmptyState } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { fmtBs, fmtDate, fmtQty, fmtUsd } from "@/lib/format";

const DOCTYPE_LABEL: Record<string, string> = {
  invoice: "Factura",
  credit_note: "Nota de crédito",
  debit_note: "Nota de débito",
};

export default async function DocumentoImprimible({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = supabaseServer();

  const [{ data: inv, error }, { data: company }] = await Promise.all([
    sb
      .from("invoices")
      .select(
        `*, customer:customers(*), emission_point:emission_points(name, point_code, branch_code, control_number_prefix), affected:invoices(invoice_number, control_number)`
      )
      .eq("id", id)
      .maybeSingle(),
    sb.from("companies").select("*").limit(1).maybeSingle(),
  ]);

  const items = error || !inv
    ? []
    : (await sb.from("invoice_items").select("*").eq("invoice_id", id)).data ?? [];

  if (error || !inv) {
    return (
      <>
        <h1 className="mb-6 text-[26px] font-semibold tracking-tight">Documento</h1>
        <EmptyState title="No se encontró el documento" hint={error?.message} />
      </>
    );
  }

  const cust = inv.customer as {
    legal_name: string;
    tax_id: string;
    fiscal_address: string | null;
    id_type: string;
    phone: string | null;
  } | null;
  const co = company as {
    legal_name: string;
    trade_name: string | null;
    tax_id: string;
    fiscal_address: string;
    phone: string | null;
  } | null;
  const ep = inv.emission_point as {
    name: string;
    point_code: string;
    branch_code: string;
  } | null;
  const affected = inv.affected as
    | { invoice_number: string; control_number: string }
    | null;

  const tipo = DOCTYPE_LABEL[inv.document_type] ?? "Factura";
  const condicion =
    inv.status === "fully_paid" ? "Contado" : "Crédito";

  return (
    <>
      {/* Barra de pantalla: no sale en el papel */}
      <div className="mb-8 flex items-center justify-between border-b border-regla pb-4 print:hidden">
        <Link
          href={`/facturas/${id}`}
          className="text-[13px] text-tinta-suave underline underline-offset-2 hover:text-tinta"
        >
          ← Volver al detalle
        </Link>
        <PrintButton label={`Imprimir ${tipo.toLowerCase()}`} />
      </div>

      {/* El documento en sí: A4 aprox., solo el papel */}
      <article className="mx-auto max-w-[820px] card p-8 text-tinta sm:p-12 print:border-0 print:p-0">
        {inv.status === "voided" && (
          <p className="mb-6 border-2 border-rojo py-2 text-center text-[18px] font-bold tracking-widest text-rojo">
            DOCUMENTO ANULADO
          </p>
        )}

        {/* Encabezado fiscal: vendedor, tipo de documento y numeración */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-tinta pb-5">
          <div className="text-[13px] leading-relaxed">
            <p className="text-[17px] font-semibold">{co?.legal_name}</p>
            {co?.trade_name && <p className="text-tinta-suave">{co.trade_name}</p>}
            <p className="num">RIF: {co?.tax_id}</p>
            <p className="text-tinta-suave">{co?.fiscal_address}</p>
            {co?.phone && <p className="num text-tinta-suave">Telf.: {co.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-[18px] font-bold tracking-wide">{tipo}</p>
            <p className="num mt-2 text-[13px]">
              N° {inv.invoice_number}
            </p>
            <p className="num text-[13px]">
              N° de control {inv.control_number}
            </p>
          </div>
        </div>

        {/* Datos del comprador y condiciones de emisión */}
        <div className="grid gap-6 border-b border-tinta py-4 text-[13px] leading-relaxed sm:grid-cols-2">
          <div>
            <p className="font-medium">{cust?.legal_name}</p>
            <p className="num">
              RIF: {cust?.id_type}-{cust?.tax_id}
            </p>
            <p className="text-tinta-suave">{cust?.fiscal_address}</p>
            {cust?.phone && <p className="num text-tinta-suave">Telf.: {cust.phone}</p>}
          </div>
          <div className="sm:text-right">
            <p>
              <span className="text-tinta-suave">Fecha de emisión: </span>
              {fmtDate(inv.issue_date)}
            </p>
            <p>
              <span className="text-tinta-suave">Condición de pago: </span>
              {condicion}
            </p>
            <p>
              <span className="text-tinta-suave">Punto de emisión: </span>
              <span className="num">
                {ep ? `${ep.branch_code}-${ep.point_code}` : "—"}
              </span>
            </p>
            {affected && (
              <p>
                <span className="text-tinta-suave">Factura afectada: </span>
                <span className="num">
                  {affected.invoice_number} (ctrl. {affected.control_number})
                </span>
              </p>
            )}
            <p className="num text-tinta-suave">
              Tasa BCV aplicada: {fmtBs(Number(inv.bcv_rate))} / USD
            </p>
          </div>
        </div>

        {/* Renglones */}
        <table className="mt-4 w-full text-[13px]">
          <thead>
            <tr className="border-b border-tinta text-left text-[11px] text-tinta-suave">
              <th className="py-1.5 pr-3 font-medium">Cant.</th>
              <th className="py-1.5 pr-3 font-medium">Descripción</th>
              <th className="py-1.5 pr-3 text-right font-medium">Precio unit. USD</th>
              <th className="py-1.5 pr-3 text-right font-medium">IVA</th>
              <th className="py-1.5 text-right font-medium">Total USD</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-regla">
                <td className="num py-2 pr-3 align-top">{fmtQty(it.quantity)}</td>
                <td className="py-2 pr-3 align-top">
                  <span className="num mr-1.5 text-tinta-suave">{it.product_code}</span>
                  {it.description}
                  {!it.applies_vat && (
                    <span className="ml-1.5 text-[11px] text-verde">Exento</span>
                  )}
                </td>
                <td className="num py-2 pr-3 text-right align-top">
                  {fmtUsd(it.unit_price_usd)}
                </td>
                <td className="num py-2 pr-3 text-right align-top">
                  {it.applies_vat ? `${Number(it.vat_rate ?? 16).toFixed(0)}%` : "—"}
                </td>
                <td className="num py-2 text-right align-top">
                  {fmtUsd(it.total_amount_usd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Desglose fiscal en ambas monedas */}
        <div className="mt-6 flex justify-end">
          <table className="w-full max-w-sm text-[13px]">
            <thead>
              <tr className="border-b border-tinta text-[11px] text-tinta-suave">
                <th className="py-1.5 text-left font-medium">Concepto</th>
                <th className="py-1.5 text-right font-medium">USD</th>
                <th className="py-1.5 text-right font-medium">Bs.</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-regla">
                <td className="py-1.5 text-tinta-suave">Ventas exentas</td>
                <td className="num py-1.5 text-right">{fmtUsd(inv.exempt_amount_usd)}</td>
                <td className="num py-1.5 text-right">{fmtBs(inv.exempt_amount_ves)}</td>
              </tr>
              <tr className="border-b border-regla">
                <td className="py-1.5 text-tinta-suave">Base imponible</td>
                <td className="num py-1.5 text-right">{fmtUsd(inv.taxable_base_usd)}</td>
                <td className="num py-1.5 text-right">{fmtBs(inv.taxable_base_ves)}</td>
              </tr>
              <tr className="border-b border-regla">
                <td className="py-1.5 text-tinta-suave">IVA</td>
                <td className="num py-1.5 text-right">{fmtUsd(inv.vat_amount_usd)}</td>
                <td className="num py-1.5 text-right">{fmtBs(inv.vat_amount_ves)}</td>
              </tr>
              {Number(inv.igtf_amount_ves ?? 0) > 0 && (
                <tr className="border-b border-regla">
                  <td className="py-1.5 text-tinta-suave">IGTF (3%)</td>
                  <td className="num py-1.5 text-right">—</td>
                  <td className="num py-1.5 text-right">{fmtBs(inv.igtf_amount_ves)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-tinta font-semibold">
                <td className="py-2">Total</td>
                <td className="num py-2 text-right">{fmtUsd(inv.total_usd)}</td>
                <td className="num py-2 text-right">{fmtBs(inv.total_ves)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {inv.notes && (
          <p className="mt-6 border-t border-regla pt-3 text-[12px] leading-relaxed text-tinta-suave">
            Observaciones: {inv.notes}
          </p>
        )}

        {/* Pie del documento */}
        <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t-2 border-tinta pt-3 text-[11px] text-tinta-suave">
          <p className="max-w-xs leading-relaxed">
            Documento conforme a SENIAT. Los montos en bolívares se calculan con
            la tasa BCV vigente a la fecha de emisión.
          </p>
          <p className="num text-right">
            {co?.legal_name}
            <br />
            RIF: {co?.tax_id}
          </p>
        </div>
      </article>
    </>
  );
}
