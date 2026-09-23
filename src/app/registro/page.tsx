import Link from "next/link";
import { registroAction } from "./actions";
import { PAISES } from "@/lib/paises";

const inputCls =
  "mt-1.5 w-full border border-regla bg-white px-3.5 py-2.5 text-[15px] text-tinta placeholder:text-tinta-suave/50 focus:border-verde focus:outline-none focus:ring-1 focus:ring-verde";

export default async function Registro({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* Portada: la misma tinta del login */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-tinta px-7 pb-9 pt-10 text-papel sm:px-10 sm:pb-12 sm:pt-14 lg:w-[42%] lg:max-w-[560px]">
        <div>
          <p className="text-[30px] font-semibold leading-none tracking-tight sm:text-[38px]">
            Facturación
            <span className="num ml-2 align-top text-[18px] font-medium text-verde-claro sm:text-[20px]">
              2026
            </span>
          </p>
          <span aria-hidden className="mt-5 block h-px w-full bg-papel/30" />
          <span aria-hidden className="mt-px block h-[3px] w-14 bg-verde-claro" />
          <p className="mt-5 max-w-[30ch] text-[14px] leading-relaxed text-papel/70">
            Registra tu empresa y empieza a facturar en minutos. Tu país
            define la moneda, el formato y el impuesto principal.
          </p>
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-papel/20 pt-6 text-[12.5px] lg:mt-auto lg:grid-cols-1 lg:gap-y-5 xl:grid-cols-2">
          <div>
            <dt className="text-papel/50">Multi-país</dt>
            <dd className="mt-1 font-medium text-papel/90">
              9 países con su moneda e impuesto
            </dd>
          </div>
          <div>
            <dt className="text-papel/50">Venezuela</dt>
            <dd className="mt-1 font-medium text-papel/90">
              SENIAT completo · USD y Bs. a tasa BCV
            </dd>
          </div>
        </dl>
      </section>

      {/* Formulario de registro */}
      <section className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="card-lift mx-auto w-full max-w-[460px] border border-regla bg-white p-7 sm:p-8">
          <header className="mb-7">
            <p className="text-[12.5px] text-tinta-suave">Nueva cuenta</p>
            <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight">
              Registra tu empresa
            </h1>
            <span aria-hidden className="mt-4 block h-px w-full bg-tinta" />
            <span aria-hidden className="mt-px block h-[3px] w-10 bg-verde" />
          </header>

          {error && (
            <p
              role="alert"
              className="mb-5 flex gap-2.5 border-l-2 border-rojo bg-white px-4 py-3 text-[13.5px] leading-relaxed text-rojo"
            >
              <span aria-hidden className="mt-0.5 font-semibold">✕</span>
              <span>{error}</span>
            </p>
          )}

          <form action={registroAction}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-medium text-tinta sm:col-span-2">
                Razón social
                <input
                  name="legal_name"
                  required
                  maxLength={200}
                  autoFocus
                  placeholder="Inversiones Tu Empresa, C.A."
                  className={`mt-1.5 ${inputCls}`}
                />
              </label>

              <label className="block text-[13px] font-medium text-tinta">
                País
                <select name="country_code" defaultValue="VE" className={`mt-1.5 ${inputCls}`}>
                  {PAISES.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.nombre} — {p.moneda}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[13px] font-medium text-tinta">
                Identificación fiscal
                <input
                  name="tax_id"
                  required
                  maxLength={20}
                  placeholder="J-30698765-4"
                  className={`num ${inputCls}`}
                />
              </label>

              <label className="block text-[13px] font-medium text-tinta sm:col-span-2">
                Dirección fiscal
                <input
                  name="fiscal_address"
                  required
                  maxLength={300}
                  placeholder="Av. Principal, edif. X, piso 1"
                  className={`mt-1.5 ${inputCls}`}
                />
              </label>
            </div>

            <div className="my-5 h-px bg-regla" aria-hidden />

            <label className="block text-[13px] font-medium text-tinta">
              Correo de acceso
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="nombre@empresa.com"
                className={`num ${inputCls}`}
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-[13px] font-medium text-tinta">
                Contraseña
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className={inputCls}
                />
              </label>
              <label className="block text-[13px] font-medium text-tinta">
                Repítela
                <input
                  type="password"
                  name="confirm"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={inputCls}
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-7 min-h-[46px] w-full bg-tinta px-6 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-[#1f2937] active:bg-[#374151]"
            >
              Crear cuenta
            </button>
          </form>

          <p className="mt-6 border-t border-regla pt-4 text-[13px] text-tinta-suave">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-verde underline underline-offset-2">
              Inicia sesión
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
