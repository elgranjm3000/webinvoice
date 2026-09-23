import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
console.log("TARJETA_MAX400:", await p.evaluate(() => {
  const c = document.querySelector("main .rounded-lg");
  return c ? getComputedStyle(c).maxWidth : "—";
}));
console.log("OJO_TOGGLE:", await p.locator('button[aria-label="Mostrar contraseña"]').count());
await p.click('button[aria-label="Mostrar contraseña"]');
await p.waitForTimeout(200);
console.log("PASS_VISIBLE:", await p.locator('input[name="password"]').getAttribute("type"));
console.log("CTA_TEAL:", await p.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Iniciar sesión"));
  return btn ? getComputedStyle(btn).backgroundColor : "—";
}));
console.log("OVF:", await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
// flujo completo sigue funcionando
await p.fill('input[name="email"]', "demo@factura2026.com");
await p.fill('input[name="password"]', "demo1234");
await p.click('button:has-text("Iniciar sesión")');
await p.waitForTimeout(4500);
console.log("LOGIN_OK:", p.url().replace("http://localhost:3000", "") || "/");
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
await m.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
console.log("OVF_MOVIL:", await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
await p.screenshot({ path: "/tmp/login-minimal.png" });
await b.close();
