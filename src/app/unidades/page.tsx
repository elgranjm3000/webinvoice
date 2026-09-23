export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState, RowMenu, Modal } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { createUnit, updateUnit, deleteUnit } from "./actions";

type Unit = {
  id: string;
  code: string;
  name: string;
};

export default async function Unidades({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; edit?: string; nuevo?: string }>;
}) {
  const { ok, error: notice, edit, nuevo } = await searchParams;
  const { data, error } = await supabaseServer()
    .from("units_of_measure")
    .select("id, code, name")
    .order("code")
    .limit(200);

  if (error) {
    return (
      <>
        <PageHeader title="Unidades" />
        <EmptyState
          title="No se pudieron cargar las unidades"
          hint={error.message}
        />
      </>
    );
  }

  const rows = (data ?? []) as Unit[];
  const editing = edit ? rows.find((r) => r.id === edit) ?? null : null;

  const inp =
    "w-full border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none";

  return (
    <>
      <PageHeader
        title="Unidades"
        subtitle="Unidades de medida del catálogo de productos"
        action={
          <a href="/unidades?nuevo=1" className="bg-verde px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#0d5f58]">
            Registrar unidad
          </a>
        }
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

      <Modal
        open={Boolean(editing) || nuevo === "1"}
        title={editing ? `Editar unidad: ${editing.name}` : "Registrar unidad"}
        onCloseHref="/unidades"
      >
      <form action={editing ? updateUnit : createUnit}>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px] text-tinta-suave">
            Código
            <input
              name="code"
              required
              maxLength={10}
              autoFocus
              placeholder="UND"
              defaultValue={editing?.code ?? ""}
              className={`num mt-1.5 ${inp}`}
            />
          </label>
          <label className="block text-[13px] text-tinta-suave">
            Nombre
            <input
              name="name"
              required
              maxLength={80}
              placeholder="Unidad"
              defaultValue={editing?.name ?? ""}
              className={`mt-1.5 ${inp}`}
            />
          </label>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <button
            type="submit"
            className="bg-tinta px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            {editing ? "Guardar cambios" : "Guardar unidad"}
          </button>
          {editing && (
            <a href="/unidades" className="text-[13px] text-tinta-suave underline-offset-2 hover:underline">
              Cancelar
            </a>
          )}
        </div>
      </form>
      </Modal>

      {rows.length === 0 ? (
        <EmptyState
          title="No hay unidades registradas"
          hint="Agrega unidades como UND, KG o LT para usarlas en tus productos."
        />
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-regla text-left text-[12px] text-tinta-suave">
              <th className="py-2 pr-4 font-medium">Código</th>
              <th className="py-2 pr-4 font-medium">Nombre</th>
              <th className="py-2 pl-4 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-regla">
                <td className="num py-3 pr-4">{r.code}</td>
                <td className="py-3 pr-4 font-medium">{r.name}</td>
                <td className="py-3 pl-4 text-right">
                  <RowMenu editHref={`/unidades?edit=${r.id}`}>
                    <form action={deleteUnit}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="name" value={r.name} />
                      <input type="hidden" name="code" value={r.code} />
                      <DeleteButton name={r.name} />
                    </form>
                  </RowMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
