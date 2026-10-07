// POST /api/suscribir · a reader asks for the weekly email (Cloudflare Pages Function, KV binding SUBS).
// Double opt-in: the address is stored as pending for 14 days; the daily job on the PC
// (`gazette newsletter sync`) emails the confirmation link. The answer never says whether an address
// was already on the list.
const LANGS = ["es", "ko"];
const PENDING_TTL = 14 * 24 * 3600;
const EMAIL = /^[^\s@<>()",;:]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

const back = (request, lang, page) =>
  Response.redirect(new URL(`${lang === "ko" ? "/ko" : ""}/suscripcion/${page}`, request.url).toString(), 303);

const token = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");

async function limited(env, request) {
  // at most 5 sign-ups per address per hour
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = "rl:" + ip;
  const n = parseInt((await env.SUBS.get(key)) || "0", 10);
  if (n >= 5) return true;
  await env.SUBS.put(key, String(n + 1), { expirationTtl: 3600 });
  return false;
}

export async function onRequestPost({ request, env }) {
  let form;
  try { form = await request.formData(); } catch { return back(request, "es", "error/"); }
  const lang = LANGS.includes(form.get("lang")) ? form.get("lang") : "es";
  if (form.get("website")) return back(request, lang, "");            // honeypot filled: a bot, act as if done
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return back(request, lang, "error/");
  if (!env.SUBS || await limited(env, request)) return back(request, lang, "error/");
  const key = "s:" + email;
  const { metadata } = await env.SUBS.getWithMetadata(key);
  if (!metadata) {
    const meta = { lang, status: "pending", token: token(), created: new Date().toISOString() };
    await env.SUBS.put(key, "", { metadata: meta, expirationTtl: PENDING_TTL });
  }
  return back(request, lang, "");
}

export const onRequest = ({ request }) => Response.redirect(new URL("/", request.url).toString(), 303);
