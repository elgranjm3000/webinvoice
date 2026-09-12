/**
 * Búsqueda de tablas por servidor: form GET con ?q=, funciona incluso
 * si el navegador no ejecuta JavaScript. `count` muestra el total real
 * de la tabla para que nadie confunda "lo que se ve" con "todo".
 */
export function TableSearch({
  action,
  q,
  placeholder,
  shown,
  count,
  noun,
}: {
  action: string;
  q?: string;
  placeholder: string;
  shown: number;
  count: number | null;
  noun: string;
}) {
  const truncated = count !== null && shown < count;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
      <form action={action} method="get" role="search" className="flex min-w-0 flex-1 gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 max-w-sm flex-1 rounded-none border border-regla bg-white px-3 py-2 text-[14px] focus:border-verde focus:outline-none"
        />
        <button
          type="submit"
          className="border border-tinta bg-white px-4 py-2 text-[14px] font-medium transition-colors hover:bg-papel-2"
        >
          Buscar
        </button>
        {q && (
          <a
            href={action}
            className="self-center px-2 text-[13px] text-tinta-suave underline underline-offset-2 hover:text-tinta"
          >
            Limpiar
          </a>
        )}
      </form>
      {count !== null && count > 0 && (
        <p className="num text-[12px] text-tinta-suave">
          {truncated
            ? `Mostrando ${shown} de ${count} ${noun}`
            : `${count} ${noun}`}
        </p>
      )}
    </div>
  );
}
