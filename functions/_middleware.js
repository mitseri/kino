// Cloudflare Pages middleware. Link previews for shared films: /?m=movie-603 gets that film's title, description and poster
// in its <title> and og:* tags, so Telegram / Instagram / Viber show a real card instead of the generic one.
const PROXY = "https://ebswykhozbzobrypderu.supabase.co/functions/v1/kino-tmdb";
const KEY = "sb_publishable_gUTbeq9JD9WOfaVDL5oPIA_8tt__0Us";
const esc = (s) => String(s || "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));

export async function onRequest(context) {
  const req = context.request;
  const url = new URL(req.url);
  const m = url.searchParams.get("m") || "";
  const res = await context.next();
  if (url.pathname !== "/" && url.pathname !== "/index.html") return res;
  // tell the app the visitor's country (for "where to watch")
  const cc = /^[A-Z]{2}$/.test(req.cf?.country || "") ? req.cf.country : "";
  if (!/^(movie|tv)-\d+$/.test(m)) {
    if (!cc) return res;
    const h0 = new Headers(res.headers); h0.delete("content-length");
    return new Response((await res.text()).replace("<head>", `<head><script>window.KM_CC="${cc}"</script>`), {status: res.status, headers: h0});
  }
  try {
    const [kind, id] = m.split("-");
    const lang = (req.headers.get("accept-language") || "").startsWith("uk") ? "uk-UA" : "ru-RU";
    const r = await fetch(`${PROXY}?p=/${kind}/${id}&language=${lang}`, {headers: {apikey: KEY}});
    if (!r.ok) return res;
    const d = await r.json();
    const title = d.title || d.name; if (!title) return res;
    const year = (d.release_date || d.first_air_date || "").slice(0, 4);
    const t = `${title}${year ? ` (${year})` : ""} — Kinomatch`;
    const desc = (d.overview || "Свайпайте фильмы вдвоём — когда понравится обоим, мэтч.").slice(0, 200);
    const img = d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : d.poster_path ? `https://image.tmdb.org/t/p/w780${d.poster_path}` : "";
    let html = await res.text();
    if (cc) html = html.replace("<head>", `<head><script>window.KM_CC="${cc}"</script>`);
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(t)}</title>`)
      .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(t)}">`)
      .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
      .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(url.toString())}">`);
    if (img) html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${img}">`)
      .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${img}">`);
    const h = new Headers(res.headers); h.delete("content-length"); h.set("cache-control", "public, max-age=600");
    return new Response(html, {status: res.status, headers: h});
  } catch (_) { return res; }
}
