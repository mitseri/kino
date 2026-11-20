// Supabase Edge Function "kino-admin": статистика для admin.html. Доступ по ключу (в коде только его SHA-256).
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
const KEY_HASH = "b4c61a5dcaaa6504f9b41fb662dd7418b6a3bc905af0e14aa307f3b02cdfdc69";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-admin-key, content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const J = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const key = req.headers.get("x-admin-key") || "";
  if (!key || (await sha(key)) !== KEY_HASH) return J({ error: "forbidden" }, 401);
  try {
    const [totals] = await sql`select
      (select count(*)::int from km_profiles) regs,
      (select count(*)::int from km_profiles where created_at>now()-interval '24 hours') regs_24h,
      (select count(*)::int from km_profiles where created_at>now()-interval '7 days') regs_7d,
      (select count(*)::int from km_profiles where partner is not null) paired,
      (select count(*)::int from km_swipes) swipes,
      (select count(*)::int from km_swipes where at>now()-interval '24 hours') swipes_24h,
      (select count(distinct user_id)::int from km_swipes) swipers,
      (select count(distinct user_id)::int from km_swipes where at>now()-interval '7 days') swipers_7d,
      (select count(distinct sid)::int from km_events where at>now()-interval '24 hours') visits_24h,
      (select count(distinct sid)::int from km_events where at>now()-interval '7 days') visits_7d,
      (select count(distinct sid)::int from km_events) visits_all,
      (select count(distinct sid)::int from km_events where at>now()-interval '7 days' and guest) guests_7d,
      (select count(*)::int from km_errors where at>now()-interval '24 hours') errors_24h`;
    const series = await sql`with d as (select generate_series((now() at time zone 'Europe/Kyiv')::date-13,(now() at time zone 'Europe/Kyiv')::date,'1 day')::date as day)
      select d.day::text as day,
        (select count(distinct sid)::int from km_events where (at at time zone 'Europe/Kyiv')::date=d.day) visits,
        (select count(*)::int from km_profiles where (created_at at time zone 'Europe/Kyiv')::date=d.day) regs,
        (select count(*)::int from km_swipes where (at at time zone 'Europe/Kyiv')::date=d.day) swipes
      from d order by 1`;
    const users = await sql`select p.name, p.username, p.created_at, (p.partner is not null) paired, coalesce(p.lang,'') lang,
        (select count(*)::int from km_swipes s where s.user_id=p.user_id) swipes,
        (select max(at) from km_swipes s where s.user_id=p.user_id) last_swipe
      from km_profiles p order by p.created_at desc limit 50`;
    const visits = await sql`select at, ev, coalesce(dev,'') dev, coalesce(lang,'') lang, guest, coalesce(ref,'') ref, left(sid::text,6) sid
      from km_events order by at desc limit 40`;
    const refs = await sql`select coalesce(nullif(ref,''),'прямой заход') ref, count(distinct sid)::int n from km_events
      where at>now()-interval '7 days' group by 1 order by 2 desc limit 8`;
    const devs = await sql`select coalesce(nullif(dev,''),'?') dev, count(distinct sid)::int n from km_events
      where at>now()-interval '7 days' group by 1 order by 2 desc`;
    const evs = await sql`select ev, count(*)::int n from km_events where at>now()-interval '7 days' group by 1 order by 2 desc limit 10`;
    const errors = await sql`select at, left(msg,160) msg, coalesce(path,'') path from km_errors order by at desc limit 8`;
    return J({ now: new Date().toISOString(), totals, series, users, visits, refs, devs, evs, errors });
  } catch (e) {
    return J({ error: String(e) }, 500);
  }
});
