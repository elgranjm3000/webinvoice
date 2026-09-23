"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/app/login/actions";

const labelCls = "block text-[13px] font-medium text-tinta-suave";
const inputCls =
  "mt-1.5 w-full rounded-md border border-regla bg-white px-3.5 py-2.5 text-[15px] text-tinta placeholder:text-tinta-suave/60 focus:border-verde focus:outline-none focus:ring-1 focus:ring-verde";

/**
 * Formulario de acceso con server action (funciona sin JavaScript en
 * su envío) y alternancia de visibilidad de contraseña.
 */
export function LoginForm({ error }: { error?: string }) {
  const [show, setShow] = useState(false);

  return (
    <>
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-md border border-rojo/20 bg-rojo/5 px-4 py-3 text-[13px] leading-relaxed text-rojo"
        >
          {error}
        </p>
      )}

      <form action={loginAction}>
        <label className={`block ${labelCls}`}>
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

        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className={labelCls}>
              Contraseña
            </label>
            {/* Sin flujo de recuperación aún: se muestra como ayuda contextual
                solo si existe cuenta demo; el enlace real llega con usuarios. */}
          </div>
          <div className="relative mt-1.5">
            <input
              id="password"
              type={show ? "text" : "password"}
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={`${inputCls} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-tinta-suave transition-colors hover:text-tinta"
            >
              {show ? <EyeOff size={17} strokeWidth={1.5} /> : <Eye size={17} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 min-h-[46px] w-full rounded-md bg-verde px-6 py-2.5 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-[#0d5f58] active:bg-[#0a4d47]"
        >
          Iniciar sesión
        </button>
      </form>

      <form action={loginAction} className="mt-3">
        <input type="hidden" name="email" value="demo@factura2026.com" />
        <input type="hidden" name="password" value="demo1234" />
        <button
          type="submit"
          className="min-h-[40px] w-full rounded-md px-6 py-2 text-[13px] font-medium text-tinta-suave transition-colors hover:bg-papel-2 hover:text-verde"
        >
          Entrar con datos de prueba
        </button>
      </form>
    </>
  );
}
