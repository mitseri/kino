#!/usr/bin/env python3
"""Сборка каталога km_catalog: TMDB discover (окна дат <=10000 результатов) -> фильтр качества -> kino-ingest (Supabase).
Запуск: python build_catalog.py [movie|tv|all] [--years 2019-2020] [--no-plan-cache]
Повторный запуск безопасен (upsert). Прогресс: tools/_catalog_state/progress.json
"""
import json, sys, time, datetime as dt, threading, os, re
from concurrent.futures import ThreadPoolExecutor
import requests

SEC = r"C:\Users\legio\.claude\secrets"
TMDB = json.load(open(SEC + r"\tmdb_kinomatch.json"))["api_key"]
ADM = json.load(open(SEC + r"\kinomatch_admin.json"))["admin_key"]
INGEST = "https://ebswykhozbzobrypderu.supabase.co/functions/v1/kino-ingest"
HERE = os.path.dirname(os.path.abspath(__file__))
ST = os.path.join(HERE, "_catalog_state"); os.makedirs(ST, exist_ok=True)
# ключевые слова TMDB: откровенный/порно-контент (обычное 18+ кино остаётся)
BAD_KW = "155477,256466,325693,10053,335048,375524,385955,155139,445,302868,298666"
SKIP_TV_GENRES = {10767, 10763, 10764, 10766}
local = threading.local()
lock = threading.Lock()
stats = {"pages": 0, "seen": 0, "kept": 0, "posted": 0, "err": 0}


def sess():
    if not hasattr(local, "s"):
        local.s = requests.Session()
    return local.s


def tmdb(kind, win, page=1):
    f = "primary_release_date" if kind == "movie" else "first_air_date"
    q = {"api_key": TMDB, "language": "ru-RU", "include_adult": "false", "sort_by": "popularity.desc", "page": page,
         "without_keywords": BAD_KW, f + ".gte": win[0], f + ".lte": win[1]}
    for a in range(8):
        try:
            r = sess().get(f"https://api.themoviedb.org/3/discover/{kind}", params=q, timeout=30)
            if r.status_code == 429:
                time.sleep(int(r.headers.get("Retry-After", "2")) + 1); continue
            if r.status_code >= 500:
                time.sleep(2 + a); continue
            r.raise_for_status()
            return r.json()
        except requests.RequestException:
            time.sleep(1 + a)
    raise RuntimeError(f"tmdb fail {kind} {win} p{page}")


def d(s): return dt.date.fromisoformat(s)


def split(win):
    a, b = d(win[0]), d(win[1]); m = a + (b - a) // 2
    return [(a.isoformat(), m.isoformat()), ((m + dt.timedelta(days=1)).isoformat(), b.isoformat())]


def plan(kind, y0, y1):
    wins = [(f"{y}-01-01", f"{y}-12-31") for y in range(y0, y1 + 1)]
    out = []
    with ThreadPoolExecutor(12) as ex:
        while wins:
            res = list(ex.map(lambda w: (w, tmdb(kind, w)["total_results"]), wins))
            wins = []
            for w, n in res:
                if n == 0: continue
                if n > 9900 and w[0] != w[1]: wins += split(w)
                else: out.append((w, n))
    return out


def row(kind, r):
    title = (r.get("title") or r.get("name") or "").strip()
    orig = (r.get("original_title") or r.get("original_name") or "").strip()
    date = r.get("release_date") or r.get("first_air_date") or ""
    if not r.get("poster_path") or not title or len(date) < 4: return None
    year = int(date[:4])
    if year < 1890 or year > 2028: return None
    votes = r.get("vote_count") or 0
    if votes < 1 and len((r.get("overview") or "")) < 40: return None
    g = r.get("genre_ids") or []
    if kind == "tv" and SKIP_TV_GENRES & set(g): return None
    lang = r.get("original_language") or ""
    if 16 in g and lang == "ja": tag = "anime"
    elif kind == "tv" and lang == "ko": tag = "kr"
    elif kind == "tv": tag = "series"
    else: tag = "film"
    oc = r.get("origin_country") or []
    return {"id": r["id"], "kind": kind, "title": title[:200], "orig": orig[:200], "year": year, "poster": r["poster_path"],
            "rating": round(r.get("vote_average") or 0, 1), "votes": votes, "pop": round(r.get("popularity") or 0, 2),
            "lang": lang, "genres": "{" + ",".join(map(str, g)) + "}", "country": (oc[0] if oc else ""), "tag": tag}


def post(rows):
    for a in range(8):
        try:
            r = requests.post(INGEST, json={"rows": rows}, headers={"x-admin-key": ADM}, timeout=120)
            if r.status_code == 200: return True
            time.sleep(2 + a * 2)
        except requests.RequestException:
            time.sleep(2 + a * 2)
    return False


def do_window(kind, win_n):
    win, n = win_n
    rows, pages = {}, min(500, (n + 19) // 20)
    for p in range(1, pages + 1):
        j = tmdb(kind, win, p)
        with lock: stats["pages"] += 1
        for r in j.get("results", []):
            with lock: stats["seen"] += 1
            x = row(kind, r)
            if x: rows[x["id"]] = x
        if p >= j.get("total_pages", 1): break
    rows = list(rows.values())
    for i in range(0, len(rows), 1000):
        if post(rows[i:i + 1000]):
            with lock: stats["posted"] += len(rows[i:i + 1000])
        else:
            with lock: stats["err"] += 1
    with lock: stats["kept"] += len(rows)
    return win


def main():
    kinds = ["movie", "tv"]; y0, y1 = 1890, 2028
    for a in sys.argv[1:]:
        if a in ("movie", "tv"): kinds = [a]
        if re.match(r"^\d{4}-\d{4}$", a): y0, y1 = map(int, a.split("-"))
    prog = os.path.join(ST, "progress.json")
    for kind in kinds:
        t0 = time.time()
        pf = os.path.join(ST, f"plan_{kind}_{y0}_{y1}.json")
        if os.path.exists(pf) and "--no-plan-cache" not in sys.argv: wins = [((w[0][0], w[0][1]), w[1]) for w in json.load(open(pf))]
        else:
            wins = plan(kind, y0, y1); json.dump(wins, open(pf, "w"))
        done_f = os.path.join(ST, f"done_{kind}_{y0}_{y1}.txt")
        done = set(open(done_f).read().split("\n")) if os.path.exists(done_f) else set()
        todo = [w for w in wins if f"{w[0][0]}|{w[0][1]}" not in done]
        print(kind, "окон:", len(wins), "осталось:", len(todo), "ожидаемо строк:", sum(w[1] for w in todo), flush=True)
        with ThreadPoolExecutor(10) as ex, open(done_f, "a") as df:
            for win in ex.map(lambda w: do_window(kind, w), todo):
                df.write(f"{win[0]}|{win[1]}\n"); df.flush()
                json.dump({"kind": kind, **stats, "t": int(time.time() - t0)}, open(prog, "w"))
        print(kind, "готово", stats, flush=True)
    print("ВСЁ ГОТОВО", stats, flush=True)


if __name__ == "__main__":
    main()
