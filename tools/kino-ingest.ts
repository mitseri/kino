// Supabase Edge Function "kino-ingest": приём пачек каталога (km_catalog) от скрипта сборки. Доступ — тот же ключ админки (в коде только SHA-256).
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
const KEY_HASH = "b4c61a5dcaaa6504f9b41fb662dd7418b6a3bc905af0e14aa307f3b02cdfdc69";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const H = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const J = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async (req) => {
  const key = req.headers.get("x-admin-key") || "";
  if (!key || (await sha(key)) !== KEY_HASH) return J({ error: "forbidden" }, 401);
  try {
    if (req.method === "GET") {
      const r = await sql`select tag, count(*)::int n from km_catalog group by 1 order by 2 desc`;
      return J({ tags: r, total: r.reduce((a: number, x: { n: number }) => a + x.n, 0) });
    }
    const { rows } = await req.json();
    if (!Array.isArray(rows) || !rows.length || rows.length > 2000) return J({ error: "bad rows" }, 400);
    await sql`insert into km_catalog(id,kind,title,orig,year,poster,rating,votes,pop,lang,genres,country,tag)
      select t.id,t.kind,t.title,t.orig,t.year,t.poster,t.rating,t.votes,t.pop,t.lang,t.genres::int[],t.country,t.tag
      from jsonb_to_recordset(${sql.json(rows)}) as t(id int,kind text,title text,orig text,year smallint,poster text,rating real,votes int,pop real,lang text,genres text,country text,tag text)
      on conflict (kind,id) do update set title=excluded.title,orig=excluded.orig,year=excluded.year,poster=excluded.poster,rating=excluded.rating,votes=excluded.votes,pop=excluded.pop,lang=excluded.lang,genres=excluded.genres,country=excluded.country,tag=excluded.tag`;
    return J({ ok: rows.length });
  } catch (e) {
    return J({ error: String((e as Error).message || e) }, 500);
  }
});
