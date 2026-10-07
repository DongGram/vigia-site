// GET /api/confirmar?e=<email>&t=<token> · the link in the confirmation email turns a pending address active.
const same = (a, b) => typeof a === "string" && typeof b === "string" && a.length === b.length &&
  [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const email = (url.searchParams.get("e") || "").trim().toLowerCase(), t = url.searchParams.get("t") || "";
  const go = (lang, page) => Response.redirect(new URL(`${lang === "ko" ? "/ko" : ""}/suscripcion/${page}`, url).toString(), 303);
  if (!env.SUBS || !email) return go("es", "error/");
  const { metadata } = await env.SUBS.getWithMetadata("s:" + email);
  if (!metadata || !same(metadata.token, t)) return go("es", "error/");
  if (metadata.status !== "active") {
    const meta = { ...metadata, status: "active", confirmed: new Date().toISOString() };
    await env.SUBS.put("s:" + email, "", { metadata: meta });          // no expiry once confirmed
  }
  return go(metadata.lang, "confirmada/");
}
