export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { emitCreditNote, emitDebitNote } from "../actions";
import { fmtBs, fmtDate, fmtQty, fmtUsd } from "@/lib/format";

const inp =
  "w-full border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none";

export default async function NuevaNota({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    factura?: string;
    pe?: string;
    alm?: string;
    tipo?: string;
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const params = await searchParams;
  const { ok, error: notice, factura, pe, alm } = params;
  const tipo = params.tipo === "debito" ? "debito" : "credito";
  const sb = supabaseServer();

  const [{ data: invoices }, { data: points }, { data: warehouses }] =
    await Promise.all([
      sb
        .from("invoices")
        .select("id, invoice_number, control_number, issue_date, total_usd, customer:customers(legal_name)")
        .eq("document_type", "invoice")
        .neq("status", "voided")
        .order("issue_date", { ascending: false })
        .limit(100),
      sb.from("emission_points").select("id, name, point_code").eq("is_active", true).order("point_code"),
      sb.from("warehouses").select("id, name, code").eq("is_active", true).order("code"),
    ]);

  if (!invoices || !points || !warehouses) {
    return (
      <>
        <PageHeader title="Nueva nota de crédito" />
        <EmptyState title="No se pudieron cargar los datos" />
      </>
    );
  }

  /* ---------- Paso 1: elegir factura ---------- */
  if (!factura) {
    return (
      <>
        <PageHeader
          title={tipo === "debito" ? "Nueva nota de débito" : "Nueva nota de crédito"}
          subtitle={`Paso 1 de 2 — selecciona la factura a ${tipo === "debito" ? "cargar" : "acreditar"}`}
        />
        {notice && (
          <p role="alert" className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-[14px] text-rojo">
            {notice}
          </p>
        )}
        <form action={async (fd: FormData) => {
          "use server";
          const invoice_id = String(fd.get("invoice_id") ?? "");
          if (!invoice_id) {
            redirect(`/notas/nueva?error=${encodeURIComponent("Selecciona la factura a acreditar.")}`);
          }
          const search = new URLSearchParams({
            factura: invoice_id,
            pe: String(fd.get("pe") ?? ""),
            alm: String(fd.get("alm") ?? ""),
            tipo,
          });
          redirect(`/notas/nueva?${search}`);
        }} className="max-w-xl card p-6">
          <div className="grid gap-4">
            <label className="block text-[13px] text-tinta-suave">
              Tipo de nota
              <select
                name="tipo"
                defaultValue={tipo}
                className={`mt-1.5 ${inp}`}
              >
                <option value="credito">Nota de crédito — devuelve o corrige a favor del cliente</option>
                <option value="debito">Nota de débito — carga adicional a la factura</option>
              </select>
            </label>
            <label className="block text-[13px] text-tinta-suave">
              Factura
              <select name="invoice_id" required className={`num mt-1.5 ${inp}`}>
                <option value="">Selecciona una factura…</option>
                {invoices.map((i) => {
                  const cust = i.customer as unknown as { legal_name: string } | null;
                  return (
                    <option key={i.id} value={i.id}>
                      {i.invoice_number} · {fmtDate(i.issue_date)} · {cust?.legal_name ?? ""} · {fmtUsd(i.total_usd)}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="block text-[13px] text-tinta-suave">
              Punto de emisión
              <select name="pe" required className={`mt-1.5 ${inp}`}>
                {points.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.point_code ? ` — ${p.point_code}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[13px] text-tinta-suave">
              Almacén que recibe la mercancía
              <select name="alm" required className={`mt-1.5 ${inp}`}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="mt-6 bg-tinta px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Continuar
          </button>
        </form>
      </>
    );
  }

  /* ---------- Paso 2: cantidades a acreditar ---------- */
  const { data: src } = await sb
    .from("invoices")
    .select("id, invoice_number, control_number, issue_date, status, bcv_rate, customer:customers(legal_name)")
    .eq("id", factura)
    .maybeSingle();

  if (!src) {
    redirect(`/notas/nueva?error=${encodeURIComponent("No se encontró la factura indicada.")}`);
  }

  const { data: items } = await sb
    .from("invoice_items")
    .select("id, product_id, product_code, description, quantity, unit_price_usd, applies_vat, vat_rate, total_amount_usd")
    .eq("invoice_id", factura);

  const rows = items ?? [];

  // Ya acreditado por producto en notas de crédito no anuladas
  // (solo aplica al flujo de crédito; la ND carga sobre lo facturado).
  let credited = new Map<string, number>();
  if (tipo === "credito") {
    const { data: creditedRows } = await sb
      .from("invoice_items")
      .select("product_id, quantity, invoice:invoices!invoices_affected_invoice_id_fkey(status)")
      .in("invoice_id", (
        await sb
          .from("invoices")
          .select("id")
          .eq("affected_invoice_id", factura)
          .eq("document_type", "credit_note")
          .neq("status", "voided")
      ).data?.map((r) => r.id) ?? ["00000000-0000-0000-0000-000000000000"]);
    for (const r of creditedRows ?? []) {
      credited.set(r.product_id, (credited.get(r.product_id) ?? 0) + Number(r.quantity));
    }
  }

  const cust = src.customer as unknown as { legal_name: string } | null;

  return (
    <>
      <PageHeader
        title={tipo === "debito" ? "Nueva nota de débito" : "Nueva nota de crédito"}
        subtitle={`Paso 2 de 2 — ${tipo === "debito" ? "carga" : "acredita"} los productos de la factura ${src.invoice_number}`}
      />
      {notice && (
        <p role="alert" className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-[14px] text-rojo">
          {notice}
        </p>
      )}

      <p className="mb-8 max-w-prose text-[13px] leading-relaxed text-tinta-suave">
        Factura {src.invoice_number} (control {src.control_number}) de {cust?.legal_name ?? "—"},
        emitida el {fmtDate(src.issue_date)}. Indica cuántas unidades de cada producto
        devuelves; el precio ya está congelado en la factura. La mercancía reingresa
        al almacén seleccionado.
      </p>

      <form
        action={async (fd: FormData) => {
          "use server";
          const itemsToMove = rows
            .map((r) => ({
              product_id: r.product_id as string,
              quantity: Number(fd.get(`q_${r.product_id}`) ?? 0),
            }))
            .filter((r) => r.quantity > 0);

          const res = tipo === "debito"
            ? await emitDebitNote({
                invoice_id: factura,
                emission_point_id: String(pe ?? ""),
                warehouse_id: String(alm ?? "") || undefined,
                items: itemsToMove,
                notes: String(fd.get("motivo") ?? "").trim() || undefined,
              })
            : await emitCreditNote({
                invoice_id: factura,
                emission_point_id: String(pe ?? ""),
                warehouse_id: String(alm ?? ""),
                items: itemsToMove,
                notes: String(fd.get("motivo") ?? "").trim() || undefined,
              });

          if (res.ok) {
            redirect(`/facturas/${res.id ?? factura}`);
          }
          redirect(
            `/notas/nueva?factura=${factura}&pe=${pe}&alm=${alm}&tipo=${tipo}&error=${encodeURIComponent(res.error)}`
          );
        }}
        className="max-w-3xl"
      >
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-tinta text-left text-[12px] text-tinta-suave">
              <th className="py-2 pr-4 font-medium">Producto</th>
              <th className="num py-2 pr-4 font-medium">Facturado</th>
              <th className="num py-2 pr-4 font-medium">Ya acreditado</th>
              <th className="num py-2 pr-4 font-medium">Disponible</th>
              <th className="num py-2 pr-4 font-medium">Precio USD</th>
              <th className="num py-2 font-medium">{tipo === "debito" ? "Cargar" : "Acreditar"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const done = credited.get(r.product_id as string) ?? 0;
              const available = Number(r.quantity) - done;
              return (
                <tr key={r.id} className="border-b border-regla">
                  <td className="py-3 pr-4">
                    <span className="num mr-2 text-tinta-suave">{r.product_code}</span>
                    {r.description}
                    {!r.applies_vat && (
                      <span className="ml-2 text-[12px] text-verde">exento</span>
                    )}
                  </td>
                  <td className="num py-3 pr-4">{fmtQty(r.quantity)}</td>
                  <td className="num py-3 pr-4 text-tinta-suave">{fmtQty(done)}</td>
                  <td className={`num py-3 pr-4 ${available === 0 ? "text-tinta-suave" : "font-medium"}`}>
                    {fmtQty(available)}
                  </td>
                  <td className="num py-3 pr-4">{fmtUsd(r.unit_price_usd)}</td>
                  <td className="num py-3">
                    {available > 0 ? (
                      <input
                        type="number"
                        name={`q_${r.product_id}`}
                        min="0"
                        max={available}
                        step="any"
                        defaultValue="0"
                        className="num w-20 border border-regla px-2 py-1.5 text-right text-[14px] focus:border-verde focus:outline-none"
                      />
                    ) : (
                      <span className="text-tinta-suave">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <label className="mt-8 block max-w-xl text-[13px] text-tinta-suave">
          Motivo de la nota (opcional)
          <input name="motivo" maxLength={300} placeholder={tipo === "debito" ? "Intereses, cargos adicionales…" : "Devolución de mercancía, error de precio…"} className={`mt-1.5 ${inp}`} />
        </label>

        <div className="mt-6 flex items-center gap-4">
          <button
            type="submit"
            className="bg-tinta px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Emitir nota de {tipo === "debito" ? "débito" : "crédito"}
          </button>
          <Link href="/notas" className="text-[13px] text-tinta-suave underline-offset-2 hover:underline">
            Cancelar
          </Link>
        </div>
      </form>
    </>
  );
}
