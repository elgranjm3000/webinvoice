export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { PAISES, paisPorCodigo } from "@/lib/paises";
import { companyLocale } from "@/lib/locale";
import { empresaDelUsuario } from "@/lib/empresa";

const inp =
  "mt-1.5 w-full border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none";


export default async function Empresa({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error: notice } = await searchParams;
  const sb = supabaseServer();
  const mía = await empresaDelUsuario();
  const company = mía ? { id: mía.id } : null;

  if (!company) {
    return (
      <>
        <PageHeader title="Mi empresa" />
        <EmptyState title="No hay una empresa registrada" />
      </>
    );
  }

  const cfg = mía?.locale ?? companyLocale(null);

  const companyId = company.id;
  async function guardar(formData: FormData) {
    "use server";
    const pais = paisPorCodigo(String(formData.get("country_code") ?? "VE"));
    const { error } = await supabaseServer()
      .from("companies")
      .update({
        country_code: pais.code,
        currency_code: pais.moneda,
        currency_symbol: pais.simbolo,
        locale: pais.locale,
        tax_name: String(formData.get("tax_name") ?? pais.impuesto),
        tax_id_label: pais.idLabel,
        secondary_currency:
          pais.code === "VE" && formData.get("multimoneda") === "on" ? "VES" : null,
        uses_igtf: pais.code === "VE" && formData.get("multimoneda") === "on",
      })
      .eq("id", companyId);
    revalidatePath("/empresa");
    redirect(
      error
        ? `/empresa?error=${encodeURIComponent(error.message)}`
        : `/empresa?ok=${encodeURIComponent("Configuración guardada.")}`
    );
  }

  return (
    <>
      <PageHeader
        title="Mi empresa"
        subtitle="País, moneda e impuesto principal — define cómo factura el sistema"
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

      <form action={guardar} className="card max-w-2xl p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px] text-tinta-suave">
            País de la empresa
            <select name="country_code" defaultValue={cfg.country_code} className={`mt-1.5 ${inp}`}>
              {PAISES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.nombre} — {p.moneda}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Nombre del impuesto principal
            <input
              name="tax_name"
              maxLength={20}
              defaultValue={cfg.tax_name}
              placeholder="IVA, IGV, GST…"
              className={`mt-1.5 ${inp}`}
            />
          </label>
        </div>

        <div className="mt-6 border-t border-regla pt-5">
          <label className="flex items-start gap-3 text-[13.5px] leading-relaxed">
            <input
              type="checkbox"
              name="multimoneda"
              defaultChecked={cfg.secondary_currency != null}
              className="mt-0.5 h-4 w-4 accent-[#0D1117]"
            />
            <span>
              <span className="font-medium">Manejo multimoneda</span>
              <span className="block text-[12.5px] text-tinta-suave">
                Registra montos en una segunda moneda con conversión al cambio
                del día (Venezuela: USD con tasa BCV y Bs. en cada documento).
                Solo aplica a Venezuela; otros países facturan en su moneda local.
              </span>
            </span>
          </label>
        </div>

        <p className="mt-6 max-w-prose text-[13px] leading-relaxed text-tinta-suave">
          Al elegir país se aplican su moneda, formato numérico y etiqueta de
          identificación fiscal (RIF, NIT, RUC, RFC…). Los requisitos
          regulatorios específicos (n° de control SENIAT, IGTF) quedan activos
          únicamente para Venezuela.
        </p>

        <button
          type="submit"
          className="mt-6 bg-tinta px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#161b22]"
        >
          Guardar configuración
        </button>
      </form>
    </>
  );
}
