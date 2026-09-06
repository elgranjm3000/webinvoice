export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { POSForm } from "@/components/POSForm";
import { fmtBs } from "@/lib/format";

export default async function NuevaFactura() {
  const sb = supabaseServer();
  const [
    { data: customers },
    { data: points },
    { data: warehouses },
    { data: products },
    { data: rates },
  ] = await Promise.all([
    sb.from("customers").select("id, legal_name, tax_id").order("legal_name"),
    sb.from("emission_points").select("id, name, point_code").eq("is_active", true).order("point_code"),
    sb.from("warehouses").select("id, name, code").eq("is_active", true).order("code"),
    sb
      .from("products")
      .select("id, code, description, price_usd, applies_vat, vat_rate")
      .eq("is_active", true)
      .order("description"),
    sb.from("exchange_rates").select("bcv_rate").order("rate_date", { ascending: false }).limit(1),
  ]);

  if (!customers || !points || !warehouses || !products || !rates) {
    return (
      <>
        <PageHeader title="Nueva factura" />
        <EmptyState title="No se pudieron cargar los datos" hint="Verifica la conexión con Supabase y recarga." />
      </>
    );
  }
  if (customers.length === 0 || points.length === 0 || warehouses.length === 0) {
    return (
      <>
        <PageHeader title="Nueva factura" />
        <EmptyState
          title="Faltan datos para facturar"
          hint="Necesitas al menos un cliente, un punto de emisión activo y un almacén."
        />
      </>
    );
  }

  const rate = Number(rates[0]?.bcv_rate ?? 0);

  return (
    <>
      <PageHeader
        title="Nueva factura"
        subtitle={
          rate > 0
            ? `Tasa BCV aplicada: ${fmtBs(rate)} por USD`
            : "Sin tasa BCV registrada"
        }
      />
      <noscript>
        <p role="alert" className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-[14px] text-rojo">
          Este punto de venta necesita JavaScript. Tu navegador lo está bloqueando:
          actívalo o recarga con Ctrl+Shift+R para salir de la versión cacheada.
        </p>
      </noscript>
      <POSForm
        customers={customers.map((c) => ({
          id: c.id,
          label: `${c.legal_name} (${c.tax_id})`,
        }))}
        emissionPoints={points.map((p) => ({
          id: p.id,
          label: `${p.name}${p.point_code ? ` — ${p.point_code}` : ""}`,
        }))}
        warehouses={warehouses.map((w) => ({
          id: w.id,
          label: `${w.name} (${w.code})`,
        }))}
        products={(products ?? []).map((p) => ({
          id: p.id,
          code: p.code,
          description: p.description,
          price_usd: Number(p.price_usd),
          applies_vat: p.applies_vat,
          vat_rate: p.vat_rate,
        }))}
        bcvRate={rate}
      />
    </>
  );
}
