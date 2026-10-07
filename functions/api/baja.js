// /api/baja?e=<email>&t=<token> · unsubscribe. GET from the link in every email; POST is the one-click
// unsubscribe mail apps send (RFC 8058). The address is deleted from the list.
const same = (a, b) => typeof a === "string" && typeof b === "string" && a.length === b.length &&
  [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

async function remove(request, env) {
  const url = new URL(request.url);
  const email = (url.searchParams.get("e") || "").trim().toLowerCase(), t = url.searchParams.get("t") || "";
  if (!env.SUBS || !email) return null;
  const { metadata } = await env.SUBS.getWithMetadata("s:" + email);
  if (!metadata || !same(metadata.token, t)) return null;
  await env.SUBS.delete("s:" + email);
  return metadata.lang || "es";
}

export async function onRequestGet({ request, env }) {
  const lang = await remove(request, env);
  const page = lang ? "baja/" : "error/";
  return Response.redirect(new URL(`${lang === "ko" ? "/ko" : ""}/suscripcion/${page}`, request.url).toString(), 303);
}

export async function onRequestPost({ request, env }) {
  const lang = await remove(request, env);
  return new Response(lang ? "ok" : "not found", { status: lang ? 200 : 404 });
}
