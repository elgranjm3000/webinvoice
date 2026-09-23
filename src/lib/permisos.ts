import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer } from "@/lib/supabase";

/** Módulos asignables a un rol: prefijos de ruta del sistema. */
export const MODULOS: { href: string; label: string }[] = [
  { href: "/", label: "Panel" },
  { href: "/facturas", label: "Facturas" },
  { href: "/notas", label: "Notas" },
  { href: "/compras", label: "Compras" },
  { href: "/cobrar", label: "Por cobrar" },
  { href: "/retenciones", label: "Retenciones" },
  { href: "/cierre", label: "Cierre de caja" },
  { href: "/clientes", label: "Clientes" },
  { href: "/proveedores", label: "Proveedores" },
  { href: "/productos", label: "Productos" },
  { href: "/almacenes", label: "Almacenes" },
  { href: "/kardex", label: "Kardex" },
  { href: "/libro-ventas", label: "Libro de ventas" },
  { href: "/margenes", label: "Márgenes" },
  { href: "/empresa", label: "Mi empresa" },
  { href: "/unidades", label: "Unidades" },
  { href: "/tasa", label: "Tasa BCV" },
];

export type Permisos = {
  userId: string | null;
  companyId: string | null;
  /** Admin total: ve todo y administra usuarios/roles. */
  esAdmin: boolean;
  /** Nombre del rol asignado. */
  rolNombre: string | null;
  /** Prefijos permitidos; null = todo permitido (admin o sin rol definido). */
  modulos: string[] | null;
};

export async function permisos(): Promise<Permisos> {
  const store = await cookies();
  const anon = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => store.getAll(), setAll: () => {} } }
  );
  const { data: auth } = await anon.auth.getUser();
  if (!auth?.user) {
    return { userId: null, companyId: null, esAdmin: false, rolNombre: null, modulos: null };
  }

  const { data: link } = await supabaseServer()
    .from("company_users")
    .select("company_id, role, role_id")
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle();

  if (!link) {
    // Sin vínculo: acceso heredado de la operación de una sola compañía.
    return { userId: auth.user.id, companyId: null, esAdmin: true, rolNombre: null, modulos: null };
  }

  const legadoAdmin = link.role === "admin";
  if (legadoAdmin || !link.role_id) {
    return { userId: auth.user.id, companyId: link.company_id, esAdmin: legadoAdmin, rolNombre: link.role, modulos: null };
  }

  const { data: rol } = await supabaseServer()
    .from("roles")
    .select("name, modules, is_admin")
    .eq("id", link.role_id)
    .maybeSingle();

  if (!rol) {
    return { userId: auth.user.id, companyId: link.company_id, esAdmin: false, rolNombre: null, modulos: [] };
  }

  return {
    userId: auth.user.id,
    companyId: link.company_id,
    esAdmin: Boolean(rol.is_admin) || legadoAdmin,
    rolNombre: rol.name,
    // El panel siempre está permitido: es la puerta de entrada.
    modulos: Array.from(new Set(["/", ...((rol.modules as string[]) ?? [])])),
  };
}

/** ¿La ruta está permitida según la lista de módulos del rol? */
export function rutaPermitida(pathname: string, modulos: string[] | null): boolean {
  if (modulos === null) return true; // sin restricción
  return modulos.some(
    (m) => pathname === m || (m !== "/" && pathname.startsWith(m + "/"))
  );
}
