// Smoke test for Kinomatch: opens the site like a phone (Android Chrome + iPhone Safari), with the backend stubbed,
// goes through the main screens and fails if anything throws or a key element is missing.
// Run: node tools/smoke.mjs   (needs: npm i playwright && npx playwright install chromium webkit)
import { chromium, webkit, devices } from "playwright";
import path from "node:path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SB_STUB = `window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){},signInWithOAuth:async()=>({}),signUp:async()=>({})},rpc:async()=>({data:null}),
  from(){const q={select(){return q},eq(){return q},order(){return q},in(){return q},match(){return q},maybeSingle:async()=>({data:null}),single:async()=>({data:null}),upsert:async()=>({}),insert(){return q},update(){return q},delete(){return q},then(ok){return Promise.resolve({data:[]}).then(ok)}};return q},
  channel(){return{on(){return this},subscribe(){return this}}},removeChannel(){}})}`;
function film(i) { return {id: 1000 + i, title: "Фильм " + i, overview: "Описание фильма " + i, poster_path: "/p.jpg", backdrop_path: "/b.jpg", genre_ids: [35, 18], vote_average: 7.9, release_date: "2015-05-05"}; }
async function stub(page) {
  await page.route("**/*", async r => {
    const u = r.request().url();
    if (u.startsWith("file:")) return r.continue();
    if (u.includes("supabase-js")) return r.fulfill({contentType: "application/javascript", body: SB_STUB});
    if (u.includes("kino-tmdb")) {
      const p = new URL(u).searchParams.get("p");
      const J = b => r.fulfill({contentType: "application/json", body: JSON.stringify(b)});
      if (p.includes("genre")) return J({genres: [{id: 35, name: "комедия"}, {id: 18, name: "драма"}, {id: 27, name: "ужасы"}, {id: 28, name: "боевик"}]});
      if (p === "/omdb") return J({imdb: "8.1"});
      if (p.startsWith("/watch/providers")) return J({results: [{provider_id: 8, provider_name: "Netflix", logo_path: "/n.jpg"}]});
      if (/^\/(movie|tv)\/\d+$/.test(p)) return J({...film(1), runtime: 120, imdb_id: "tt0133093", genres: [{name: "комедия"}], credits: {cast: [{id: 1, name: "Актёр", profile_path: "/a.jpg", character: "Герой"}], crew: [{id: 2, job: "Director", name: "Реж"}]}, videos: {results: [{site: "YouTube", type: "Trailer", key: "x"}]}, images: {backdrops: [{file_path: "/b2.jpg"}]}, "watch/providers": {results: {UA: {flatrate: [{provider_name: "Netflix"}]}}}, release_dates: {results: []}});
      return J({results: Array.from({length: 20}, (_, i) => film(i + Math.floor(Math.random() * 1e5))), total_pages: 3});
    }
    return r.fulfill({status: 204, body: ""});
  });
}
const steps = [];
async function run(name, launcher, device) {
  const b = await launcher.launch(); const ctx = await b.newContext({...device, locale: "ru-RU"}); const page = await ctx.newPage();
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  await stub(page);
  const must = async (sel, what) => { const el = await page.waitForSelector(sel, {timeout: 6000}).catch(() => null); if (!el) throw new Error(`${name}: не найдено — ${what} (${sel})`); steps.push(`${name}: ${what} ✓`); };
  await page.goto("file://" + ROOT + "/index.html");
  await must("[data-guest]", "кнопка «Свайпать без регистрации»");
  await must("#hp1", "постеры на главной");
  await page.click("[data-guest]");
  await must("#onb", "онбординг с жанрами");
  for (const g of ["комедия", "драма", "ужасы"]) await page.click(`[data-g="${g}"]`);
  await page.click("#onbGo");
  await must(".tour", "обучение"); await page.click(".tour [data-skip]");
  await must("#stack .sc.front", "карточка в свайпе");
  for (let i = 0; i < 3; i++) { await page.click("#bY"); await page.waitForTimeout(400); }
  await page.click("#bN"); await page.waitForTimeout(400);
  await page.click("#bU"); await page.waitForTimeout(400);
  await must("#stack .sc.front .kf span", "факты на постере");
  await page.click('#nav [data-v="likes"]'); await must(".view", "вкладка «Лайки»");
  await page.click('#nav [data-v="shelf"]'); await must("#stt", "вкладка «Полка»");
  await page.click('#nav [data-v="search"]'); await must(".colls button", "подборки в поиске");
  await page.click('#nav [data-v="swipe"]'); await page.click("#flt"); await must("#pP", "фильтр по сервисам");
  await page.evaluate(() => closeSheet());
  await page.evaluate(() => openDetail(deck[0])); await must("#dRev", "карточка фильма с отзывами");
  if (errs.length) throw new Error(`${name}: ошибки JavaScript — ${errs.join(" | ")}`);
  await b.close();
}
try {
  await run("Android", chromium, devices["Pixel 7"]);
  await run("iPhone", webkit, devices["iPhone 14"]);
  console.log(steps.join("\n")); console.log("SMOKE OK");
} catch (e) { console.log(steps.join("\n")); console.error("SMOKE FAILED:", e.message); process.exit(1); }
