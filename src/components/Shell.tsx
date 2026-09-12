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

function Brand() {
  return (
    <Link href="/" className="group block px-5">
      <p className="text-[16px] font-semibold leading-tight tracking-tight text-tinta transition-colors group-hover:text-verde">
        Facturación
        <span className="num ml-1.5 text-[13px] font-medium text-verde">26</span>
      </p>
      <span aria-hidden className="mt-2 block h-px bg-tinta/70" />
      <span aria-hidden className="mt-px block h-[2.5px] w-7 bg-verde" />
    </Link>
  );
}

function NavGroup({
  group,
  items,
  pathname,
  onNavigate,
}: {
  group: string;
  items: { href: string; label: string }[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasActive = items.some((i) =>
    i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)
  );

  return (
    <details open={hasActive} className="group/nav">
      <summary className="flex min-h-[38px] cursor-pointer list-none items-center justify-between px-5 py-2 text-[11px] font-medium tracking-wide text-tinta-suave transition-colors hover:text-tinta [&::-webkit-details-marker]:hidden">
        {group}
        {/* Indicador de pliegue: un guion que se convierte en + */}
        <span
          aria-hidden
          className="relative h-3 w-3 shrink-0 self-center before:absolute before:left-1/2 before:top-[6px] before:h-px before:w-3 before:-translate-x-1/2 before:bg-tinta-suave/60 after:absolute after:left-1/2 after:top-0 after:h-3 after:w-px after:-translate-x-1/2 after:bg-tinta-suave/60 group-open/nav:after:hidden"
        />
      </summary>
      <ul className="pb-1">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[36px] items-center py-2 pl-8 pr-5 text-[13px] leading-none transition-colors ${
                  active
                    ? "bg-papel-2 font-semibold text-tinta"
                    : "text-tinta-suave hover:text-tinta"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute left-0 top-0 h-full w-[2.5px] ${active ? "bg-verde" : "bg-transparent"}`}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function Nav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Secciones del sistema" className="divide-y divide-regla/70">
      {NAV.map((section) => (
        <div key={section.group} className="py-1.5">
          <NavGroup
            group={section.group}
            items={section.items}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        </div>
      ))}
    </nav>
  );
}

function SignOut({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        onNavigate?.();
        await supabaseBrowser().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="min-h-[36px] w-full px-5 py-2 text-left text-[13px] text-tinta-suave transition-colors hover:text-tinta"
    >
      Cerrar sesión
    </button>
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
            <Brand />
            <span
              aria-hidden
              className="relative h-4 w-4 shrink-0 before:absolute before:left-1/2 before:top-1/2 before:h-px before:w-4 before:-translate-x-1/2 before:-translate-y-1/2 before:bg-tinta after:absolute after:left-1/2 after:top-1/2 after:h-4 after:w-px after:-translate-x-1/2 after:-translate-y-1/2 after:bg-tinta group-open:after:rotate-90 group-open:after:transition-transform"
            />
          </summary>
          <div className="max-h-[75vh] overflow-y-auto border-t border-regla pt-1">
            <Nav pathname={pathname} />
            <div className="mt-2 border-t border-regla/70 pb-4 pt-2">
              <SignOut />
              <p className="px-5 pt-1.5 text-[11px] text-tinta-suave/70">
                Documentos conforme a SENIAT
              </p>
            </div>
          </div>
        </details>
      </header>

      {/* Escritorio: menú lateral fijo */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-regla bg-papel lg:flex">
        <div className="pb-6 pt-7">
          <Brand />
        </div>

        <div className="flex-1 border-t border-regla/70 pt-2">
          <Nav pathname={pathname} />
        </div>

        <div className="shrink-0 border-t border-regla/70 pb-6 pt-3">
          <SignOut />
          <p className="px-5 pt-1.5 text-[11px] leading-relaxed text-tinta-suave/70">
            Documentos conforme a SENIAT
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-12 lg:py-8">
        {children}
      </main>
    </div>
  );
}
