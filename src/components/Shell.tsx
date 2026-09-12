"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const NAV: { group: string; items: { href: string; label: string }[] }[] = [
  {
    group: "Operación",
    items: [
      { href: "/", label: "Panel" },
      { href: "/facturas", label: "Facturas" },
      { href: "/notas", label: "Notas" },
      { href: "/compras", label: "Compras" },
      { href: "/retenciones", label: "Retenciones" },
      { href: "/cobrar", label: "Por cobrar" },
      { href: "/cierre", label: "Cierre de caja" },
    ],
  },
  {
    group: "Maestros",
    items: [
      { href: "/clientes", label: "Clientes" },
      { href: "/proveedores", label: "Proveedores" },
      { href: "/productos", label: "Productos" },
      { href: "/unidades", label: "Unidades" },
      { href: "/almacenes", label: "Almacenes" },
    ],
  },
  {
    group: "Consultas",
    items: [
      { href: "/libro-ventas", label: "Libro de ventas" },
      { href: "/kardex", label: "Kardex" },
      { href: "/tasa", label: "Tasa BCV" },
    ],
  },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group block">
      <p className="text-[17px] font-semibold leading-tight tracking-tight text-tinta transition-colors group-hover:text-verde">
        Facturación
        <span className="num ml-1.5 text-[14px] font-medium text-verde">26</span>
      </p>
      {/* Doble regla de la identidad: tinta fina + verde gruesa */}
      <span aria-hidden className="mt-2 block h-px bg-tinta" />
      <span aria-hidden className="mt-px block h-[3px] w-8 bg-verde" />
      {!compact && (
        <span className="mt-2.5 block text-[11.5px] leading-snug text-tinta-suave">
          Libro fiscal y almacén
        </span>
      )}
    </Link>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Secciones del sistema" className="pt-1">
      {NAV.map((section, gi) => (
        <div key={section.group} className={gi > 0 ? "mt-5" : ""}>
          <p className="flex items-center gap-2 px-5 pb-2 text-[11px] font-medium tracking-wide text-tinta-suave/80">
            {section.group}
            <span aria-hidden className="h-px flex-1 bg-regla" />
          </p>
          <ul>
            {section.items.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex min-h-[40px] items-center py-2 pl-5 pr-4 text-[13.5px] leading-none transition-colors ${
                      active
                        ? "bg-papel-2 font-semibold text-tinta"
                        : "text-tinta-suave hover:bg-papel-2/60 hover:text-tinta"
                    }`}
                  >
                    {/* Marca de renglón activo, como folio marcado en el libro */}
                    <span
                      aria-hidden
                      className={`absolute left-0 top-0 h-full w-[3px] ${active ? "bg-verde" : "bg-transparent"}`}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Footer({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  return (
    <div className="shrink-0 px-4 pb-5 pt-4">
      <div className="border border-regla bg-white">
        <span aria-hidden className="block h-[2px] w-full bg-verde" />
        <div className="px-4 py-3.5">
          <p className="text-[11.5px] leading-relaxed text-tinta-suave">
            Documentos conforme a SENIAT
          </p>
          <p className="mt-0.5 text-[11px] text-tinta-suave/70">
            Montos en USD y Bs. según tasa BCV
          </p>
          <button
            type="button"
            onClick={async () => {
              onNavigate?.();
              await supabaseBrowser().auth.signOut();
              router.push("/login");
              router.refresh();
            }}
            className="mt-3 min-h-[36px] border border-regla px-3 py-1.5 text-[12.5px] font-medium text-tinta transition-colors hover:border-tinta hover:bg-papel-2"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // El login se muestra sin el menú
  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Móvil: barra superior con menú desplegable <details> (sin JavaScript) */}
      <header className="sticky top-0 z-10 border-b border-regla bg-papel lg:hidden">
        <details className="group">
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between px-4 [&::-webkit-details-marker]:hidden">
            <Brand compact />
            <span
              aria-hidden
              className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] border border-regla bg-white group-open:border-tinta"
            >
              <span className="h-px w-4 bg-tinta group-open:hidden" />
              <span className="h-px w-4 bg-tinta group-open:hidden" />
              <span className="hidden h-px w-4 bg-tinta group-open:block" />
              <span className="hidden h-px w-4 bg-tinta group-open:block" />
            </span>
          </summary>
          <div className="max-h-[75vh] overflow-y-auto border-t border-regla pb-4 pt-3">
            <NavLinks pathname={pathname} />
            <div className="mt-4 border-t border-regla pt-1">
              <Footer />
            </div>
          </div>
        </details>
      </header>

      {/* Escritorio: menú lateral fijo */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-regla bg-papel lg:flex">
        <div className="px-5 pb-7 pt-7">
          <Brand />
        </div>

        <div className="flex-1 border-t border-regla pt-4">
          <NavLinks pathname={pathname} />
        </div>

        <Footer />
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-12 lg:py-8">
        {children}
      </main>
    </div>
  );
}
