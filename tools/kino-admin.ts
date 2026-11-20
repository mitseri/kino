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
    if (req.method === "POST") {
      const b = await req.json();
      if (b.action === "hide") { await sql`update km_reviews set hidden=true where user_id=${b.user_id} and tmdb=${b.tmdb}`; return J({ ok: true }); }
      if (b.action === "unhide") { await sql`update km_reviews set hidden=false where user_id=${b.user_id} and tmdb=${b.tmdb}`; return J({ ok: true }); }
      return J({ error: "bad action" }, 400);
    }
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
        coalesce(au.email,'') email, coalesce(au.raw_app_meta_data->>'provider','') prov, au.last_sign_in_at,
        (select ip from km_events e where e.user_id=p.user_id and e.ip is not null order by e.at desc limit 1) ip,
        (select cc from km_events e where e.user_id=p.user_id and e.cc is not null order by e.at desc limit 1) cc,
        (select count(*)::int from km_swipes s where s.user_id=p.user_id) swipes,
        (select max(at) from km_swipes s where s.user_id=p.user_id) last_swipe
      from km_profiles p left join auth.users au on au.id=p.user_id order by p.created_at desc limit 300`;
    const visits = await sql`select e.at, e.ev, coalesce(e.dev,'') dev, coalesce(e.lang,'') lang, e.guest, coalesce(e.ref,'') ref, left(e.sid::text,6) sid,
        coalesce(e.ip,'') ip, coalesce(e.cc,'') cc, coalesce(pp.name,'') uname, coalesce(pp.username,'') uuser, coalesce(au.email,'') email
      from km_events e left join km_profiles pp on pp.user_id=e.user_id left join auth.users au on au.id=e.user_id
      order by e.at desc limit 60`;
    const refs = await sql`select coalesce(nullif(ref,''),'прямой заход') ref, count(distinct sid)::int n from km_events
      where at>now()-interval '7 days' group by 1 order by 2 desc limit 8`;
    const devs = await sql`select coalesce(nullif(dev,''),'?') dev, count(distinct sid)::int n from km_events
      where at>now()-interval '7 days' group by 1 order by 2 desc`;
    const evs = await sql`select ev, count(*)::int n from km_events where at>now()-interval '7 days' group by 1 order by 2 desc limit 10`;
    const errors = await sql`select at, left(msg,160) msg, coalesce(path,'') path from km_errors order by at desc limit 8`;
    const reps = await sql`select r.at, 'review' kind, r.author::text author, coalesce(ap.name,'') aname, r.tmdb, left(coalesce(v.text,''),300) text, coalesce(v.hidden,false) hidden, coalesce(rp.name,'') rname
      from km_review_reports r left join km_profiles ap on ap.user_id=r.author left join km_profiles rp on rp.user_id=r.reporter left join km_reviews v on v.user_id=r.author and v.tmdb=r.tmdb
      union all select u.at, 'profile', u.target::text, coalesce(tp.name,''), '', coalesce(tp.avatar_url,''), false, coalesce(rp.name,'')
      from km_user_reports u left join km_profiles tp on tp.user_id=u.target left join km_profiles rp on rp.user_id=u.reporter
      order by 1 desc limit 50`;
    return J({ now: new Date().toISOString(), totals, series, users, visits, refs, devs, evs, errors, reps });
  } catch (e) {
    return J({ error: String(e) }, 500);
  }
});
