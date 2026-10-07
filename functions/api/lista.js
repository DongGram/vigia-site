// GET /api/lista · the subscriber list for the PC that sends the emails. Bearer token = the Pages secret
// NEWSLETTER_TOKEN (same value as GAZETTE_NEWSLETTER_TOKEN in the PC's .env). Without it: 404.
const same = (a, b) => typeof a === "string" && typeof b === "string" && a.length === b.length &&
  [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

export async function onRequestGet({ request, env }) {
  const secret = env.NEWSLETTER_TOKEN || "";
  const got = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (secret.length < 24 || !env.SUBS || !same(got, secret)) return new Response("not found", { status: 404 });
  const out = [];
  let cursor;
  do {
    const page = await env.SUBS.list({ prefix: "s:", cursor });
    for (const k of page.keys) if (k.metadata) out.push({ email: k.name.slice(2), ...k.metadata });
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return new Response(JSON.stringify(out), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
