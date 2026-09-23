"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer } from "@/lib/supabase";
import { companyLocale, type CompanyLocale } from "@/lib/locale";

/**
 * Resuelve la empresa del usuario en sesión (vía company_users) con su
 * configuración de localización. Sin sesión devuelve la primera empresa
 * —comportamiento heredado de la operación de una sola compañía—.
 */
export async function empresaDelUsuario(): Promise<{
  id: string;
  locale: CompanyLocale;
} | null> {
  const store = await cookies();
  const anon = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data } = await anon.auth.getUser();

  let query = supabaseServer().from("companies").select("*").limit(1);
  if (data?.user) {
    const { data: link } = await supabaseServer()
      .from("company_users")
      .select("company_id")
      .eq("user_id", data.user.id)
      .limit(1);
    if (link?.[0]?.company_id) {
      query = supabaseServer()
        .from("companies")
        .select("*")
        .eq("id", link[0].company_id)
        .limit(1);
    }
  }

  const { data: company } = await query.maybeSingle();
  if (!company) return null;
  return { id: company.id, locale: companyLocale(company) };
}
