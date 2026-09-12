import { loginAction } from "@/app/login/actions";

const inputCls =
  "mt-1.5 w-full rounded-none border border-regla bg-white px-3.5 py-2.5 text-[15px] text-tinta placeholder:text-tinta-suave/50 focus:border-verde focus:outline-none focus:ring-1 focus:ring-verde";

/**
 * Formulario de acceso que se envía directo al servidor (server action):
 * funciona incluso si el JavaScript del navegador no carga.
 */
export function LoginForm({ error }: { error?: string }) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="mb-5 flex gap-2.5 border-l-2 border-rojo bg-white px-4 py-3 text-[13.5px] leading-relaxed text-rojo"
        >
          <span aria-hidden className="mt-0.5 font-semibold">✕</span>
          <span>{error}</span>
        </p>
      )}

      <form action={loginAction}>
        <label className="block text-[13px] font-medium text-tinta">
          Correo
          <input
            type="email"
            name="email"
            required
            autoFocus
            autoComplete="email"
            inputMode="email"
            placeholder="nombre@empresa.com"
            defaultValue="demo@factura2026.com"
            className={`num ${inputCls}`}
          />
        </label>

        <label className="mt-5 block text-[13px] font-medium text-tinta">
          Contraseña
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputCls}
          />
        </label>

        <button
          type="submit"
          className="mt-6 min-h-[46px] w-full bg-verde px-6 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-[#174e41] active:bg-[#123f35]"
        >
          Iniciar sesión
        </button>
      </form>

      <div className="my-5 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-tinta-suave/30" />
        <span className="text-[11px] text-tinta-suave">o</span>
        <span className="h-px flex-1 bg-tinta-suave/30" />
      </div>

      <form action={loginAction}>
        <input type="hidden" name="email" value="demo@factura2026.com" />
        <input type="hidden" name="password" value="demo1234" />
        <button
          type="submit"
          className="min-h-[44px] w-full border border-tinta bg-transparent px-6 py-2.5 text-[14px] font-medium text-tinta transition-colors hover:bg-papel-2 active:bg-regla/60"
        >
          Entrar con datos de prueba
        </button>
      </form>
    </>
  );
}
