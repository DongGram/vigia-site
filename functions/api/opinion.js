// GET /api/opinion?e=<email>&t=<token>&w=<week>&v=<up|down|t:topic> · one click in the weekly email: did it help,
// and which topics the reader wants. Kept on the subscriber's own entry (metadata), so the list the sender reads
// (/api/lista) carries it and nothing else is stored. Only the last 8 weeks' votes and 8 topics are kept.
const same = (a, b) => typeof a === "string" && typeof b === "string" && a.length === b.length &&
  [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;
const TOPICS = ["pensiones", "impuestos", "trabajo", "salud", "vivienda", "escuelas", "tramites", "empresas"];
const WEEK = /^\d{4}-W\d{2}$/;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const email = (url.searchParams.get("e") || "").trim().toLowerCase(), t = url.searchParams.get("t") || "";
  const week = url.searchParams.get("w") || "", v = url.searchParams.get("v") || "";
  const go = (lang, page) => Response.redirect(new URL(`${lang === "ko" ? "/ko" : ""}/suscripcion/${page}`, url).toString(), 303);
  if (!env.SUBS || !email) return go("es", "error/");
  const { metadata } = await env.SUBS.getWithMetadata("s:" + email);
  if (!metadata || metadata.status !== "active" || !same(metadata.token, t)) return go("es", "error/");
  const meta = { ...metadata };
  if ((v === "up" || v === "down") && WEEK.test(week)) {
    const votes = { ...(meta.votes || {}), [week]: v };
    meta.votes = Object.fromEntries(Object.entries(votes).sort().slice(-8));
  } else if (v.startsWith("t:") && TOPICS.includes(v.slice(2))) {
    meta.topics = [...new Set([...(meta.topics || []), v.slice(2)])].slice(-8);
  } else {
    return go(meta.lang, "error/");
  }
  await env.SUBS.put("s:" + email, "", { metadata: meta });
  return go(meta.lang, "gracias/");
}
