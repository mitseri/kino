// Builds static, Google-indexable pages for Kinomatch: collections (/podborki/) and film pages (/film/),
// in Russian and Ukrainian, plus sitemap.xml. Data comes from TMDB through the site's public read-only proxy.
// Run: node tools/build-seo.mjs   (GitHub Action runs it weekly and commits the result)
import fs from "node:fs/promises";
import path from "node:path";

const SITE = "https://kinomatch-ua.pages.dev";
const PROXY = "https://ebswykhozbzobrypderu.supabase.co/functions/v1/kino-tmdb";
const KEY = "sb_publishable_gUTbeq9JD9WOfaVDL5oPIA_8tt__0Us";
const IMG = "https://image.tmdb.org/t/p/";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const MAXF = Number(process.env.MAXF || 3200);
const LANGS = {ru: {tmdb: "ru-RU", dir: "", name: "Русский"}, uk: {tmdb: "uk-UA", dir: "uk/", name: "Українська"}};

const COLLS = [
  {s: "chto-posmotret-vdvoem", ru: ["Что посмотреть вдвоём", "Фильмы на вечер для пары: романтика, комедии и сильные истории, которые нравятся обоим."], uk: ["Що подивитися удвох", "Фільми на вечір для пари: романтика, комедії та сильні історії, які подобаються обом."], p: "/discover/movie", q: {with_genres: "10749|35", "vote_count.gte": "1500", sort_by: "vote_average.desc"}},
  {s: "trendy-nedeli", ru: ["Тренды недели", "Самые обсуждаемые фильмы и сериалы этой недели."], uk: ["Тренди тижня", "Найобговорюваніші фільми та серіали цього тижня."], p: "/trending/all/week"},
  {s: "luchshie-filmy", ru: ["Лучшие фильмы всех времён", "Фильмы с самым высоким рейтингом зрителей."], uk: ["Найкращі фільми всіх часів", "Фільми з найвищим рейтингом глядачів."], p: "/movie/top_rated"},
  {s: "luchshie-serialy", ru: ["Лучшие сериалы", "Сериалы, которые стоит посмотреть хотя бы раз."], uk: ["Найкращі серіали", "Серіали, які варто подивитися хоча б раз."], p: "/tv/top_rated"},
  {s: "horror-vecher", ru: ["Хоррор-вечер", "Лучшие фильмы ужасов для тех, кто не из пугливых."], uk: ["Вечір жахів", "Найкращі фільми жахів для тих, хто не з лякливих."], p: "/discover/movie", q: {with_genres: "27", "vote_count.gte": "1500", sort_by: "vote_average.desc"}},
  {s: "komedii", ru: ["Лёгкие комедии", "Смешные фильмы, чтобы отдохнуть и посмеяться."], uk: ["Легкі комедії", "Смішні фільми, щоб відпочити й посміятися."], p: "/discover/movie", q: {with_genres: "35", without_genres: "18,27,53", "vote_count.gte": "1500", sort_by: "popularity.desc"}},
  {s: "anime-dlya-novichkov", ru: ["Аниме для новичков", "С каких аниме начать: самые любимые сериалы."], uk: ["Аніме для новачків", "З яких аніме почати: найулюбленіші серіали."], p: "/discover/tv", q: {with_genres: "16", with_original_language: "ja", "vote_count.gte": "500", sort_by: "vote_average.desc"}},
  {s: "luchshie-doramy", ru: ["Лучшие дорамы", "Корейские сериалы с самым высоким рейтингом."], uk: ["Найкращі дорами", "Корейські серіали з найвищим рейтингом."], p: "/discover/tv", q: {with_original_language: "ko", "vote_count.gte": "200", sort_by: "vote_average.desc", without_genres: "16,10764,10767"}},
  {s: "vzorvet-mozg", ru: ["Фильмы, которые взорвут мозг", "Фантастика и детективы с неожиданными поворотами."], uk: ["Фільми, що підірвуть мозок", "Фантастика й детективи з несподіваними поворотами."], p: "/discover/movie", q: {with_genres: "878|9648", "vote_count.gte": "3000", sort_by: "vote_average.desc"}},
  {s: "semeynye", ru: ["Фильмы для всей семьи", "Что посмотреть с детьми и родителями."], uk: ["Фільми для всієї родини", "Що подивитися з дітьми та батьками."], p: "/discover/movie", q: {with_genres: "10751", "vote_count.gte": "1000", sort_by: "vote_average.desc"}},
  {s: "ukrainskoe-kino", ru: ["Украинское кино", "Популярные украинские фильмы."], uk: ["Українське кіно", "Популярні українські фільми."], p: "/discover/movie", q: {with_origin_country: "UA", "vote_count.gte": "10", sort_by: "popularity.desc"}},
  {s: "korotkie-filmy", ru: ["Фильмы до полутора часов", "Отличное кино, когда времени мало."], uk: ["Фільми до півтори години", "Чудове кіно, коли часу мало."], p: "/discover/movie", q: {"with_runtime.lte": "95", "vote_count.gte": "2000", sort_by: "vote_average.desc"}},
  {s: "detektivnye-serialy", ru: ["Детективные сериалы", "Запутанные расследования и криминальные истории."], uk: ["Детективні серіали", "Заплутані розслідування та кримінальні історії."], p: "/discover/tv", q: {with_genres: "9648|80", "vote_count.gte": "500", sort_by: "vote_average.desc", without_genres: "16"}},
  {s: "novinki", ru: ["Новинки в хорошем качестве", "Фильмы, которые недавно вышли в цифровом релизе."], uk: ["Новинки в хорошій якості", "Фільми, що нещодавно вийшли в цифровому релізі."], p: "/discover/movie", q: {sort_by: "popularity.desc", "vote_count.gte": "15", with_release_type: "4|5", "release_date.gte": daysAgo(150), "release_date.lte": daysAgo(0)}}];

const T = {
  ru: {home: "Главная", colls: "Подборки", cta: "Свайпать в Kinomatch", ctaFilm: "Добавить на полку в Kinomatch", where: "Где смотреть в Украине", none: "Пока не найдено в украинских сервисах", plot: "О чём", cast: "В ролях", dir: "Режиссёр", creators: "Создатели", genres: "Жанры", year: "Год", runtime: "Длительность", seasons: "Сезоны", rating: "Рейтинг TMDB", trailer: "Смотреть трейлер на YouTube", similar: "Похожие", film: "Фильм", series: "Сериал", min: "мин", allColls: "Все подборки", about: "Kinomatch — тиндер для фильмов: свайпайте фильмы и сериалы вдвоём, а когда понравится обоим — мэтч.", hubT: "Подборки фильмов и сериалов — Kinomatch", hubD: "Готовые подборки: что посмотреть вдвоём, лучшие сериалы, аниме, дорамы, хорроры и комедии. Свайпайте их вместе в Kinomatch.", lang: "Українською", simT: "Похожие на", simL: "Если понравился этот фильм, посмотрите и эти — подобрано по оценкам зрителей.", allSim: "Все похожие", actors: "Актёры", actorFilms: "Фильмы и сериалы", bio: "Биография", born: "Родился(ась)", actHubT: "Популярные актёры — фильмы и сериалы | Kinomatch", actHubD: "Актёры и актрисы с лучшими фильмами и сериалами: биография и где смотреть в Украине.", subscr: "подписка", buy: "покупка или аренда", watch: "смотреть", tmdb: "Данные о фильмах — TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB."},
  uk: {home: "Головна", colls: "Добірки", cta: "Свайпати в Kinomatch", ctaFilm: "Додати на полицю в Kinomatch", where: "Де дивитися в Україні", none: "Поки не знайдено в українських сервісах", plot: "Про що", cast: "У ролях", dir: "Режисер", creators: "Творці", genres: "Жанри", year: "Рік", runtime: "Тривалість", seasons: "Сезони", rating: "Рейтинг TMDB", trailer: "Дивитися трейлер на YouTube", similar: "Схожі", film: "Фільм", series: "Серіал", min: "хв", allColls: "Усі добірки", about: "Kinomatch — тіндер для фільмів: свайпайте фільми й серіали удвох, а коли сподобається обом — метч.", hubT: "Добірки фільмів і серіалів — Kinomatch", hubD: "Готові добірки: що подивитися удвох, найкращі серіали, аніме, дорами, жахи й комедії. Свайпайте їх разом у Kinomatch.", lang: "По-русски", simT: "Схожі на", simL: "Якщо сподобався цей фільм, подивіться й ці — дібрано за оцінками глядачів.", allSim: "Усі схожі", actors: "Актори", actorFilms: "Фільми та серіали", bio: "Біографія", born: "Народився(лася)", actHubT: "Популярні актори — фільми та серіали | Kinomatch", actHubD: "Актори й акторки з найкращими фільмами та серіалами: біографія і де дивитися в Україні.", subscr: "підписка", buy: "купівля або оренда", watch: "дивитися", tmdb: "Дані про фільми — TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB."}};

function daysAgo(n) { return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10); }
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const TR = {а:"a",б:"b",в:"v",г:"g",ґ:"g",д:"d",е:"e",є:"ye",ё:"e",ж:"zh",з:"z",и:"i",і:"i",ї:"yi",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"};
const slug = (s, fb = "film") => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split("").map(c => TR[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || fb;

async function tmdb(p, q = {}, lang = "ru-RU", tries = 3) {
  const u = new URL(PROXY); u.searchParams.set("p", p); u.searchParams.set("language", lang);
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(u, {headers: {apikey: KEY}}); if (r.ok) return await r.json(); } catch (e) {}
    await new Promise(r => setTimeout(r, 800 * (i + 1)));
  }
  return null;
}
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({length: n}, async () => { while (i < items.length) { const j = i++; await fn(items[j], j); } })); }

const filmUrl = (lang, f) => `/${LANGS[lang].dir}film/${f.kind}-${f.id}-${slug(f.titleEn || f.title)}.html`;
const appUrl = f => `/?m=${f.kind}-${f.id}`;

function page(lang, {title, desc, canon, alt, body, ld, img}) {
  const t = T[lang];
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}${canon}">
${alt ? Object.entries(alt).map(([l, h]) => `<link rel="alternate" hreflang="${l}" href="${SITE}${h}">`).join("") + `<link rel="alternate" hreflang="x-default" href="${SITE}${alt.ru}">` : ""}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}${canon}"><meta property="og:type" content="website"><meta property="og:site_name" content="Kinomatch">
<meta property="og:image" content="${esc(img || SITE + "/og.jpg")}"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0b0b0d"><link rel="icon" href="/logo.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="preconnect" href="https://image.tmdb.org">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Unbounded:wght@800&display=swap">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : ""}
<style>:root{--bg:#0b0b0d;--s:#16161b;--s2:#202027;--ink:#f3f1ee;--mu:#a19fa9;--line:#2a2a33;--red:#ff2d3f;--red2:#ff7a3c;--gold:#ffc93c;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:500 16px/1.55 Manrope,system-ui,sans-serif}a{color:inherit}
.w{max-width:1040px;margin:0 auto;padding:0 max(16px,env(safe-area-inset-left,0px))}
header{display:flex;align-items:center;gap:14px;padding:16px 0}header .logo{font:800 1.1rem Unbounded,system-ui;text-decoration:none;display:flex;align-items:center;gap:8px}
header .logo i{width:28px;height:28px;border-radius:8px;background:var(--red);display:inline-block}header nav{margin-left:auto;display:flex;gap:14px;font-weight:700;font-size:.9rem;color:var(--mu)}header nav a{text-decoration:none}
.cta{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--red),var(--red2));color:#fff;text-decoration:none;font-weight:800;padding:13px 20px;border-radius:999px;box-shadow:0 10px 26px rgb(255 45 63/.35)}
h1{font:800 clamp(1.6rem,5vw,2.6rem)/1.12 Unbounded,system-ui;margin:12px 0 10px;text-wrap:balance}h2{font:800 1.15rem Unbounded,system-ui;margin:28px 0 10px}
.lead{color:var(--mu);max-width:65ch;margin:0 0 18px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;margin:18px 0}
.card{text-decoration:none;display:grid;gap:6px}.card img{width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:14px;background:var(--s2)}.card b{font-size:.92rem;line-height:1.25}.card span{font-size:.8rem;color:var(--mu)}
.film{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:28px;margin:10px 0 20px}.film img.p{width:100%;border-radius:18px;aspect-ratio:2/3;object-fit:cover;background:var(--s2)}
.facts{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:14px 0;font-size:.95rem}.facts dt{color:var(--mu)}.facts dd{margin:0}
.chips{display:flex;flex-wrap:wrap;gap:8px}.chip{background:var(--s);border:1px solid var(--line);padding:6px 12px;border-radius:999px;font-weight:700;font-size:.85rem;text-decoration:none}
.links{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}.ghost{display:inline-flex;padding:12px 18px;border-radius:999px;border:1px solid var(--line);text-decoration:none;font-weight:800}
footer{border-top:1px solid var(--line);margin-top:40px;padding:22px 0 40px;color:var(--mu);font-size:.82rem}footer a{color:var(--mu)}
.film img.p,.card img{height:auto}header .cta{white-space:nowrap;padding:10px 15px;font-size:.85rem;margin-left:auto}header nav+.cta{margin-left:0}
@media(max-width:700px){.film{grid-template-columns:1fr}.film img.p{max-width:220px}header nav{display:none}}</style></head>
<body><div class="w"><header><a class="logo" href="/"><img src="/logo.svg" alt="" width="28" height="28">Kinomatch</a><nav><a href="/${LANGS[lang].dir}podborki/">${t.colls}</a><a href="/${LANGS[lang].dir}aktery/">${t.actors}</a><a href="${alt ? (lang === "ru" ? alt.uk : alt.ru) : "/"}">${t.lang}</a></nav><a class="cta" href="/">${t.cta}</a></header>
${body}
<footer><p>${t.about}</p><p><a href="/${LANGS[lang].dir}podborki/">${t.allColls}</a> · <a href="/privacy.html">Privacy</a></p><p>${t.tmdb}</p></footer></div></body></html>`;
}

const BUILT = new Set();
function cardHTML(lang, f) {
  return `<a class="card" href="${BUILT.has(f.kind + "-" + f.id) ? filmUrl(lang, f) : appUrl(f)}"><img src="${IMG}w342${f.poster}" alt="${esc(f.title)}" loading="lazy" width="342" height="513"><b>${esc(f.title)}</b><span>${f.year || ""}${f.rating ? " · ★ " + f.rating : ""}</span></a>`;
}

function norm(x, kind) {
  const k = kind || x.media_type; if (k !== "movie" && k !== "tv") return null; if (!x.poster_path) return null;
  return {id: x.id, kind: k, title: x.title || x.name, titleEn: x.original_title || x.original_name, poster: x.poster_path, year: (x.release_date || x.first_air_date || "").slice(0, 4), rating: x.vote_average ? x.vote_average.toFixed(1) : "", overview: x.overview || ""};
}

async function main() {
  const films = new Map(); // key -> {ru, uk}
  const collData = {ru: [], uk: []};
  for (const lang of Object.keys(LANGS)) {
    for (const c of COLLS) {
      const kind = c.p.includes("/tv") ? "tv" : c.p.includes("/movie") ? "movie" : null;
      const pages = await Promise.all([1, 2].map(pg => tmdb(c.p, {...(c.q || {}), page: String(pg)}, LANGS[lang].tmdb)));
      const list = pages.flatMap(r => r?.results || []).map(x => norm(x, kind)).filter(Boolean).filter((x, i, a) => a.findIndex(y => y.kind === x.kind && y.id === x.id) === i).slice(0, 36);
      collData[lang].push({c, list});
      for (const f of list) { const k = f.kind + "-" + f.id; films.set(k, {...(films.get(k) || {}), base: f}); }
    }
  }
  console.log("collections done, films:", films.size);
  // wide pool so Google has thousands of film pages to index
  const SRC = [["/movie/top_rated", {}, 60, "movie"], ["/movie/popular", {}, 40, "movie"], ["/tv/top_rated", {}, 30, "tv"], ["/tv/popular", {}, 25, "tv"],
    ["/discover/tv", {with_genres: "16", with_original_language: "ja", sort_by: "vote_count.desc"}, 10, "tv"], ["/discover/tv", {with_original_language: "ko", sort_by: "vote_count.desc", without_genres: "16,10764,10767"}, 10, "tv"],
    ["/discover/movie", {with_origin_country: "UA", sort_by: "vote_count.desc", "vote_count.gte": "5"}, 3, "movie"]];
  const jobs = SRC.flatMap(([p, q, n, kind]) => Array.from({length: n}, (_, i) => [p, {...q, page: String(i + 1)}, kind]));
  await pool(jobs, 8, async ([p, q, kind]) => { const r = await tmdb(p, q); for (const x of r?.results || []) { const f = norm(x, kind); if (f && !films.has(f.kind + "-" + f.id) && films.size < MAXF) films.set(f.kind + "-" + f.id, {base: f}); } });
  console.log("pool done, films:", films.size);
  // details for every film in every language
  const keys = [...films.keys()];
  await pool(keys, 10, async k => {
    const [kind, id] = k.split("-");
    for (const lang of Object.keys(LANGS)) {
      const d = await tmdb(`/${kind}/${id}`, {append_to_response: kind === "movie" ? "credits,watch/providers,videos,recommendations" : "credits,watch/providers,videos,recommendations,external_ids"}, LANGS[lang].tmdb);
      if (d) films.get(k)[lang] = d;
    }
  });
  for (const k of keys) if (films.get(k).ru && films.get(k).uk) BUILT.add(k);
  console.log("details done", BUILT.size);
  // actors: people who appear in several of our films
  const people = new Map();
  for (const k of BUILT) for (const c of (films.get(k).ru.credits?.cast || []).slice(0, 8)) {
    if (!c.profile_path) continue; const p = people.get(c.id) || {id: c.id, name: c.name, prof: c.profile_path, films: []}; p.films.push(k); people.set(c.id, p);
  }
  const actors = [...people.values()].filter(p => p.films.length >= 4).sort((a, b) => b.films.length - a.films.length).slice(0, Number(process.env.MAXA || 500));
  await pool(actors, 10, async p => { for (const lang of Object.keys(LANGS)) p[lang] = await tmdb(`/person/${p.id}`, {}, LANGS[lang].tmdb); });
  const ACT = new Map(actors.filter(p => p.ru && p.uk).map(p => [p.id, p]));
  for (const p of ACT.values()) p.slug = slug(p.name, "akter");
  const actUrl = (lang, p) => `/${LANGS[lang].dir}aktery/${p.id}-${p.slug}.html`;
  // "similar to X" pages for the most popular titles
  const SIM = new Set([...BUILT].sort((a, b) => (films.get(b).ru.popularity || 0) - (films.get(a).ru.popularity || 0)).slice(0, Number(process.env.MAXS || 400)).filter(k => (films.get(k).ru.recommendations?.results || []).length >= 6));
  const simUrl = (lang, f) => `/${LANGS[lang].dir}pohozhie/${f.kind}-${f.id}-${slug(f.titleEn || f.title)}.html`;
  console.log("actors", ACT.size, "similar", SIM.size);
  const urls = [];
  const out = async (rel, html) => { const p = path.join(ROOT, rel); await fs.mkdir(path.dirname(p), {recursive: true}); await fs.writeFile(p, html); urls.push(rel.replace(/index\.html$/, "")); };
  // clean old generated folders
  for (const d of ["film", "podborki", "uk", "aktery", "pohozhie"]) await fs.rm(path.join(ROOT, d), {recursive: true, force: true});

  for (const lang of Object.keys(LANGS)) {
    const t = T[lang], dir = LANGS[lang].dir;
    // hub
    const hubBody = `<h1>${lang === "ru" ? "Подборки фильмов и сериалов" : "Добірки фільмів і серіалів"}</h1><p class="lead">${esc(t.hubD)}</p>
      ${collData[lang].map(({c, list}) => `<h2><a href="/${dir}podborki/${c.s}.html">${esc(c[lang][0])}</a></h2><div class="grid">${list.slice(0, 6).map(f => cardHTML(lang, f)).join("")}</div>`).join("")}`;
    await out(`${dir}podborki/index.html`, page(lang, {title: t.hubT, desc: t.hubD, canon: `/${dir}podborki/`, alt: {ru: "/podborki/", uk: "/uk/podborki/"}, body: hubBody}));
    for (const {c, list} of collData[lang]) {
      const [h, lead] = c[lang], year = new Date().getFullYear();
      const body = `<h1>${esc(h)}</h1><p class="lead">${esc(lead)} ${lang === "ru" ? `Список обновляется каждую неделю (${year}). Откройте любой фильм — трейлер, рейтинг и где смотреть в Украине.` : `Список оновлюється щотижня (${year}). Відкрийте будь-який фільм — трейлер, рейтинг і де дивитися в Україні.`}</p>
        <p><a class="cta" href="/">${t.cta}</a></p><div class="grid">${list.map(f => cardHTML(lang, f)).join("")}</div>
        <h2>${t.allColls}</h2><div class="chips">${COLLS.filter(x => x !== c).map(x => `<a class="chip" href="/${dir}podborki/${x.s}.html">${esc(x[lang][0])}</a>`).join("")}</div>`;
      await out(`${dir}podborki/${c.s}.html`, page(lang, {title: `${h} — ${year} | Kinomatch`, desc: `${lead} ${list.slice(0, 5).map(f => f.title).join(", ")} ${lang === "ru" ? "и другие" : "та інші"}.`.slice(0, 300), canon: `/${dir}podborki/${c.s}.html`, alt: {ru: `/podborki/${c.s}.html`, uk: `/uk/podborki/${c.s}.html`}, body, img: list[0] ? IMG + "w780" + list[0].poster : null}));
    }
    // film pages
    for (const k of BUILT) {
      const e = films.get(k), d = e[lang]; if (!d) continue;
      const kind = k.split("-")[0], f = {...e.base, ...norm({...d, poster_path: d.poster_path || e.base.poster}, kind)};
      f.titleEn = e.base.titleEn;
      const tv = kind === "tv", year = f.year;
      const dirs = tv ? (d.created_by || []).map(x => x.name) : (d.credits?.crew || []).filter(x => x.job === "Director").map(x => x.name);
      const castP = (d.credits?.cast || []).slice(0, 10), cast = castP.map(x => x.name);
      const ua = d["watch/providers"]?.results?.UA, prov = [...(ua?.flatrate || []).map(p => [p.provider_name, t.subscr]), ...(ua?.rent || ua?.buy || []).map(p => [p.provider_name, t.buy])].filter((x, i, a) => a.findIndex(y => y[0] === x[0]) === i).slice(0, 8);
      const vid = (d.videos?.results || []).find(v => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));
      const rt = tv ? (d.episode_run_time || [])[0] : d.runtime;
      const recs = (d.recommendations?.results || []).map(x => norm(x, x.media_type || kind)).filter(Boolean);
      const sim = [...recs.filter(x => BUILT.has(x.kind + "-" + x.id)), ...recs.filter(x => !BUILT.has(x.kind + "-" + x.id))].slice(0, 6);
      const genres = (d.genres || []).map(g => g.name);
      const typeWord = tv ? t.series : t.film;
      const titleFull = `${f.title}${year ? ` (${year})` : ""}`;
      const title = lang === "ru" ? `${titleFull} — смотреть трейлер, описание, где смотреть в Украине | Kinomatch` : `${titleFull} — трейлер, опис, де дивитися в Україні | Kinomatch`;
      const desc = `${typeWord} «${f.title}»${year ? `, ${year}` : ""}${genres.length ? `, ${genres.slice(0, 3).join(", ")}` : ""}. ${(d.overview || "").slice(0, 200)}`.trim();
      const alt = {ru: filmUrl("ru", f), uk: filmUrl("uk", f)};
      const ld = {"@context": "https://schema.org", "@type": tv ? "TVSeries" : "Movie", name: f.title, alternateName: f.titleEn !== f.title ? f.titleEn : undefined, image: IMG + "w500" + f.poster, description: d.overview || undefined, datePublished: d.release_date || d.first_air_date || undefined, genre: genres, director: !tv && dirs.length ? dirs.map(n => ({"@type": "Person", name: n})) : undefined, actor: cast.slice(0, 6).map(n => ({"@type": "Person", name: n})), aggregateRating: d.vote_count > 20 ? {"@type": "AggregateRating", ratingValue: d.vote_average.toFixed(1), bestRating: "10", ratingCount: d.vote_count} : undefined, url: SITE + alt[lang]};
      const body = `<div class="film"><img class="p" src="${IMG}w500${f.poster}" alt="${esc(f.title)} — ${lang === "ru" ? "постер" : "постер"}" width="500" height="750"><div>
        <div style="color:var(--mu);font-weight:700">${typeWord}${year ? " · " + year : ""}${f.rating ? ` · ★ ${f.rating}` : ""}</div><h1>${esc(f.title)}</h1>${f.titleEn && f.titleEn !== f.title ? `<div style="color:var(--mu)">${esc(f.titleEn)}</div>` : ""}
        <div class="links"><a class="cta" href="${appUrl(f)}">${t.ctaFilm}</a>${vid ? `<a class="ghost" href="https://www.youtube.com/watch?v=${esc(vid.key)}" rel="nofollow noopener" target="_blank">▶ ${t.trailer}</a>` : ""}</div>
        ${d.overview ? `<h2>${t.plot}</h2><p>${esc(d.overview)}</p>` : ""}
        <dl class="facts">${genres.length ? `<dt>${t.genres}</dt><dd>${esc(genres.join(", "))}</dd>` : ""}${year ? `<dt>${t.year}</dt><dd>${year}</dd>` : ""}${rt ? `<dt>${t.runtime}</dt><dd>${rt} ${t.min}</dd>` : ""}${tv && d.number_of_seasons ? `<dt>${t.seasons}</dt><dd>${d.number_of_seasons}</dd>` : ""}${dirs.length ? `<dt>${tv ? t.creators : t.dir}</dt><dd>${esc(dirs.slice(0, 3).join(", "))}</dd>` : ""}${cast.length ? `<dt>${t.cast}</dt><dd>${castP.map(x => ACT.has(x.id) ? `<a href="${actUrl(lang, ACT.get(x.id))}">${esc(x.name)}</a>` : esc(x.name)).join(", ")}</dd>` : ""}${f.rating ? `<dt>${t.rating}</dt><dd>${f.rating} / 10</dd>` : ""}</dl>
        <h2>${t.where}</h2>${prov.length ? `<div class="chips">${prov.map(([n, w]) => `<span class="chip">${esc(n)} · ${w}</span>`).join("")}</div>` : `<p style="color:var(--mu)">${t.none}</p>`}
      </div></div>${sim.length ? `<h2>${t.similar}</h2><div class="grid">${sim.map(x => cardHTML(lang, x)).join("")}</div>${SIM.has(k) ? `<p><a class="ghost" href="${simUrl(lang, f)}">${t.allSim}: «${esc(f.title)}» →</a></p>` : ""}` : ""}`;
      await out(alt[lang].slice(1), page(lang, {title, desc, canon: alt[lang], alt, body, ld, img: d.backdrop_path ? IMG + "w1280" + d.backdrop_path : IMG + "w780" + f.poster}));
      if (SIM.has(k)) {
        const salt = {ru: simUrl("ru", f), uk: simUrl("uk", f)}, list = recs.slice(0, 20);
        const h = `${tv ? (lang === "ru" ? "Сериалы" : "Серіали") : (lang === "ru" ? "Фильмы" : "Фільми")}, ${lang === "ru" ? "похожие на" : "схожі на"} «${f.title}»`;
        const sb = `<h1>${esc(h)}</h1><p class="lead">${t.simL} <a href="${alt[lang]}">«${esc(f.title)}»${year ? ` (${year})` : ""}</a></p><p><a class="cta" href="/">${t.cta}</a></p><div class="grid">${list.map(x => cardHTML(lang, x)).join("")}</div>`;
        await out(salt[lang].slice(1), page(lang, {title: `${h} — ${list.length} ${lang === "ru" ? "вариантов" : "варіантів"} | Kinomatch`, desc: `${h}: ${list.slice(0, 6).map(x => x.title).join(", ")}${lang === "ru" ? " и другие" : " та інші"}.`, canon: salt[lang], alt: salt, body: sb, img: IMG + "w780" + f.poster}));
      }
    }
  }
  // actor pages + hub
  for (const lang of Object.keys(LANGS)) {
    const t = T[lang], dir = LANGS[lang].dir;
    const name = p => p[lang]?.name || p.name;
    const hub = `<h1>${t.actors}</h1><p class="lead">${esc(t.actHubD)}</p><div class="grid">${[...ACT.values()].map(p => `<a class="card" href="${actUrl(lang, p)}"><img src="${IMG}w185${p.prof}" alt="${esc(name(p))}" loading="lazy" width="185" height="278"><b>${esc(name(p))}</b><span>${p.films.length}</span></a>`).join("")}</div>`;
    await out(`${dir}aktery/index.html`, page(lang, {title: t.actHubT, desc: t.actHubD, canon: `/${dir}aktery/`, alt: {ru: "/aktery/", uk: "/uk/aktery/"}, body: hub}));
    for (const p of ACT.values()) {
      const d = p[lang], n = name(p), aalt = {ru: actUrl("ru", p), uk: actUrl("uk", p)};
      const list = p.films.map(k => { const e = films.get(k); return {...e.base, ...norm({...e[lang], poster_path: e[lang].poster_path || e.base.poster}, k.split("-")[0]), titleEn: e.base.titleEn}; }).sort((a, b) => (b.year || 0) - (a.year || 0));
      const bio = (d.biography || "").trim();
      const body = `<div class="film"><img class="p" src="${IMG}w500${d.profile_path || p.prof}" alt="${esc(n)}" width="500" height="750"><div><h1>${esc(n)}</h1>
        <dl class="facts">${d.birthday ? `<dt>${t.born}</dt><dd>${esc(d.birthday)}${d.place_of_birth ? ", " + esc(d.place_of_birth) : ""}</dd>` : ""}<dt>${t.actorFilms}</dt><dd>${list.length}</dd></dl>
        ${bio ? `<h2>${t.bio}</h2><p>${esc(bio.slice(0, 1500))}${bio.length > 1500 ? "…" : ""}</p>` : ""}<p><a class="cta" href="/">${t.cta}</a></p></div></div>
        <h2>${t.actorFilms}</h2><div class="grid">${list.map(f => cardHTML(lang, f)).join("")}</div>`;
      const ld = {"@context": "https://schema.org", "@type": "Person", name: n, image: IMG + "w500" + (d.profile_path || p.prof), birthDate: d.birthday || undefined, description: bio.slice(0, 300) || undefined, url: SITE + aalt[lang]};
      await out(aalt[lang].slice(1), page(lang, {title: `${n} — ${lang === "ru" ? "фильмы и сериалы" : "фільми та серіали"} | Kinomatch`, desc: `${n}: ${list.slice(0, 6).map(f => f.title).join(", ")}. ${bio.slice(0, 120)}`.trim(), canon: aalt[lang], alt: aalt, body, ld, img: IMG + "w500" + (d.profile_path || p.prof)}));
    }
  }
  // sitemap
  const today = new Date().toISOString().slice(0, 10);
  const all = ["", "privacy.html", ...urls];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all.map(u => `  <url><loc>${SITE}/${u}</loc><lastmod>${today}</lastmod><changefreq>${u.includes("podborki") || u.includes("aktery/") && !u.endsWith(".html") || u === "" ? "weekly" : "monthly"}</changefreq><priority>${u === "" ? "1.0" : u.includes("podborki") ? "0.8" : "0.6"}</priority></url>`).join("\n")}\n</urlset>\n`;
  await fs.writeFile(path.join(ROOT, "sitemap.xml"), xml);
  console.log("pages:", urls.length);
}
main().catch(e => { console.error(e); process.exit(1); });
