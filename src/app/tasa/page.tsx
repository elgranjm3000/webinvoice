export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { createRate, deleteRate } from "./actions";
import { fmtDate } from "@/lib/format";

type Rate = {
  id: string;
  rate_date: string;
  bcv_rate: number;
  source_currency: string;
  target_currency: string;
};

export default async function Tasa({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error: notice } = await searchParams;
  const { data, error } = await supabaseServer()
    .from("exchange_rates")
    .select("*")
    .order("rate_date", { ascending: false })
    .limit(30);

  if (error) {
    return (
      <>
        <PageHeader title="Tasa BCV" />
        <EmptyState
          title="No se pudo cargar el historial"
          hint={error.message}
        />
      </>
    );
  }

  const rows = (data ?? []) as Rate[];

  const inp =
    "w-full rounded-none border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none";

  return (
    <>
      <PageHeader
        title="Tasa BCV"
        subtitle="Historial de tasas de cambio USD → Bs. usadas en la facturación"
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

      <p className="mb-8 max-w-prose text-[13px] leading-relaxed text-tinta-suave">
        Las tasas se registran manualmente con el valor publicado por el Banco
        Central de Venezuela. Las facturas guardan la tasa vigente del día en
        que se emiten; cambiarla no altera facturas pasadas.
      </p>

      <form action={createRate} className="mb-12 border border-regla bg-white p-6">
        <h2 className="mb-5 border-b border-regla pb-3 text-[15px] font-semibold tracking-tight">
          Registrar tasa
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px] text-tinta-suave">
            Fecha
            <input
              name="rate_date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={`num mt-1.5 ${inp}`}
            />
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Bs. por USD
            <input
              name="bcv_rate"
              type="number"
              min="0.0001"
              step="0.0001"
              required
              placeholder="236.5000"
              className={`num mt-1.5 ${inp}`}
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-6 bg-verde px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Guardar tasa
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="Sin tasas registradas"
          hint="Registra la tasa del día del Banco Central de Venezuela antes de facturar."
        />
      ) : (
        <>
          <p className="mb-8">
            <span className="num block text-[34px] font-semibold leading-none tracking-tight">
              Bs. {Number(rows[0].bcv_rate).toFixed(4)}
            </span>
            <span className="mt-2 block text-[13px] text-tinta-suave">
              Vigente desde el {fmtDate(rows[0].rate_date)}
            </span>
          </p>
          <table className="w-full max-w-md text-[14px]">
            <thead>
              <tr className="border-b border-tinta text-left text-[12px] text-tinta-suave">
                <th className="py-2 pr-4 font-medium">Fecha</th>
                <th className="num py-2 pr-4 font-medium">Bs. por USD</th>
                <th className="py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-regla">
                  <td className="py-2.5 pr-4 whitespace-nowrap">
                    {fmtDate(r.rate_date)}
                  </td>
                  <td className="num py-2.5 pr-4">
                    {Number(r.bcv_rate).toFixed(4)}
                  </td>
                  <td className="py-2.5 text-right">
                    <form action={deleteRate}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="rate_date" value={r.rate_date} />
                      <DeleteButton name={`la tasa del ${fmtDate(r.rate_date)}`} />
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
