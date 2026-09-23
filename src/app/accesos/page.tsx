export const dynamic = "force-dynamic";

import { supabaseServer } from "@/lib/supabase";
import { PageHeader, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/format";

type Acceso = {
  id: string;
  email: string;
  success: boolean;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

/** Nombre corto del navegador a partir del user agent. */
function navegador(ua: string | null): string {
  if (!ua) return "—";
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/bot|crawler|spider/i.test(ua)) return "Robot";
  return "Otro";
}

export default async function Accesos() {
  const { data, error } = await supabaseServer()
    .from("login_audit")
    .select("id, email, success, ip, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <>
        <PageHeader title="Registro de accesos" />
        <EmptyState title="No se pudo leer el registro" hint={error.message} />
      </>
    );
  }

  const rows = (data ?? []) as Acceso[];
  const fallidos = rows.filter((r) => !r.success).length;

  return (
    <>
      <PageHeader
        title="Registro de accesos"
        subtitle="Quién inició sesión, cuándo y desde dónde — incluidos los intentos fallidos"
      />

      {rows.length > 0 && (
        <p className="num mb-6 text-[12px] text-tinta-suave">
          Últimos {rows.length} intentos · {fallidos} fallido(s)
          {fallidos >= 3 && (
            <span className="ml-2 font-semibold text-rojo">
              — revisa si alguien está probando contraseñas
            </span>
          )}
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="Todavía no hay accesos registrados"
          hint="Cada inicio de sesión —exitoso o fallido— quedará anotado aquí."
        />
      ) : (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-regla text-left text-[12px] text-tinta-suave">
              <th className="py-2 pr-4 font-medium">Fecha</th>
              <th className="py-2 pr-4 font-medium">Hora</th>
              <th className="py-2 pr-4 font-medium">Correo</th>
              <th className="py-2 pr-4 font-medium">Resultado</th>
              <th className="py-2 pr-4 font-medium">Navegador</th>
              <th className="py-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-regla">
                <td className="py-3 pr-4 text-tinta-suave">{fmtDate(r.created_at)}</td>
                <td className="num py-3 pr-4">
                  {new Date(r.created_at).toLocaleTimeString("es-VE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-3 pr-4">{r.email}</td>
                <td className="py-3 pr-4">
                  {r.success ? (
                    <span className="text-esmeralda font-medium">Entró</span>
                  ) : (
                    <span className="text-rojo font-medium">Fallido</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-tinta-suave">{navegador(r.user_agent)}</td>
                <td className="num py-3 text-tinta-suave">{r.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-6 max-w-prose text-[13px] leading-relaxed text-tinta-suave">
        El registro guarda los últimos accesos; los intentos fallidos ayudan a
        detectar pruebas de contraseña. La IP puede mostrarse vacía en acceso
        local (localhost).
      </p>
    </>
  );
}
