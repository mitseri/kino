// Rarely used Kinomatch features, loaded on first use (see rare() in app.js).
async function _openYear(){const y=new Date().getFullYear(),done=[...mine.shelf.values()].filter(r=>r.status==="done"&&String(r.watched_at||r.updated_at||"").startsWith(String(y)));
  sheet(`<h2>🎬 Мой кино-${y}</h2><div class="swempty"><div class="spin"></div></div>`);let mins=0;
  await Promise.all(done.slice(0,80).map(async r=>{if(!r.data?.kind)return;try{const d=await details(r.data);const rt=r.data.kind==="tv"?((d.episode_run_time||[])[0]||40)*(d.number_of_episodes||8):d.runtime||110;mins+=rt*(1+(r.rewatch||0))}catch(e){}}));
  const g={};done.forEach(r=>(r.data?.g||[]).forEach(x=>g[x]=(g[x]||0)+1));const topG=Object.entries(g).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const best=done.filter(r=>r.rating).sort((a,b)=>b.rating-a.rating)[0],hours=Math.round(mins/60),sw=[...mine.swipes.values()].filter(r=>String(r.at||"").startsWith(String(y))).length,mt=matchesList().length;
  const Y={y,n:done.length,hours,sw,mt,topG:topG.map(x=>x[0]),best:best?.data?.t,bestP:best?.data?.poster};
  const s=$(".sheet");if(!s)return;s.innerHTML=`<h2>🎬 Мой кино-${y}</h2><div class="year">
    <div><b>${done.length}</b>${RN(done.length,"фильм и сериал","фильма и сериала","фильмов и сериалов").replace(/^\d+ /,"")}</div><div><b>${hours}</b>${RN(hours,"час","часа","часов").replace(/^\d+ /,"")} перед экраном</div>
    <div><b>${sw}</b>свайпов</div><div><b>${mt}</b>мэтчей с парой</div></div>
    ${topG.length?`<p class="sub" style="margin:4px 0">Любимые жанры: <b style="color:var(--ink)">${esc(topG.map(x=>x[0]).join(", "))}</b></p>`:""}${best?`<p class="sub" style="margin:0">Лучший фильм года: <b style="color:var(--ink)">${esc(best.data?.t||"")}</b> — ★ ${best.rating}</p>`:""}
    ${done.length?"":`<p class="sub">Отмечайте просмотренное на полке — и тут появится ваша статистика.</p>`}
    <div class="sticky"><button class="btn red" id="yrImg" style="flex:1">📸 Картинка для сторис</button></div>`;
  $("#yrImg").onclick=()=>_yearImage(Y)}

async function _yearImage(Y){const c=document.createElement("canvas");c.width=1080;c.height=1920;const g=c.getContext("2d");
  const bg=g.createLinearGradient(0,0,1080,1920);bg.addColorStop(0,"#1a0508");bg.addColorStop(.5,"#0b0b0d");bg.addColorStop(1,"#22060c");g.fillStyle=bg;g.fillRect(0,0,1080,1920);
  const load=src=>new Promise(ok=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=src});
  if(Y.bestP){const im=await load(IMG+"w500"+Y.bestP);if(im){g.save();g.globalAlpha=.9;const w=520,h=780,x=(1080-w)/2,yy=980;g.beginPath();g.roundRect(x,yy,w,h,36);g.clip();g.drawImage(im,x,yy,w,h);g.restore()}}
  g.fillStyle="#ff2d3f";g.font="800 44px Unbounded, Manrope, sans-serif";g.fillText("KINOMATCH",80,140);g.fillStyle="#fff";g.font="900 120px Unbounded, Manrope, sans-serif";g.fillText("Мой кино-",80,330);g.fillText(String(Y.y),80,470);
  const st=[[Y.n,"просмотрено"],[Y.hours,"часов кино"],[Y.sw,"свайпов"],[Y.mt,"мэтчей"]];st.forEach(([v,l],i)=>{const x=80+(i%2)*480,y=620+Math.floor(i/2)*170;g.fillStyle="#ffc93c";g.font="900 96px Unbounded, Manrope, sans-serif";g.fillText(String(v),x,y);g.fillStyle="#c9c7cf";g.font="700 38px Manrope, sans-serif";g.fillText(l,x,y+52)});
  if(Y.topG.length){g.fillStyle="#fff";g.font="800 40px Manrope, sans-serif";g.fillText("Любимое: "+Y.topG.join(", "),80,930)}
  if(Y.best){g.fillStyle="#fff";g.font="800 42px Manrope, sans-serif";g.fillText("Фильм года: "+Y.best,80,1840)}
  c.toBlob(async b=>{const f=new File([b],`kinomatch-${Y.y}.png`,{type:"image/png"});if(navigator.canShare?.({files:[f]})){try{await navigator.share({files:[f],title:"Мой кино-год"});return}catch(e){}}
    const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=f.name;document.body.appendChild(a);a.click();a.remove();toast("Картинка сохранена")},"image/png")}

/* ---------- "you wanted to watch this" ---------- */

function parseCSV(t){const rows=[];let row=[],f="",q=false;for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;else if(c===","||c===";"||c==="\t"){row.push(f);f=""}else if(c==="\n"||c==="\r"){if(c==="\r"&&t[i+1]==="\n")i++;row.push(f);f="";if(row.some(x=>x.trim()))rows.push(row);row=[]}else f+=c}
  row.push(f);if(row.some(x=>x.trim()))rows.push(row);return rows}

async function _runImport(file){if(!file)return;const st=$("#impS"),rows=parseCSV(await file.text());if(rows.length<2){st.textContent="Не нашёл строк в файле";return}
  const h=rows[0].map(x=>x.trim().toLowerCase().replace(/^\ufeff/,"")),col=(...n)=>h.findIndex(x=>n.some(k=>x===k||x.includes(k)));
  const ci=col("const","imdb id","imdbid"),ct=col("title","name","название","фильм"),cy=col("year","год","release year"),cr=col("your rating","rating","оценка","моя оценка");
  if(ct<0&&ci<0){st.textContent="Нужна колонка Title / Name / Название";return}
  const lb=/letterboxd/i.test(rows[0].join(","))||h.includes("letterboxd uri");const list=rows.slice(1,1001);let done=0,ok=0,miss=[];const out=[];
  st.textContent=`Ищу ${list.length} фильмов…`;
  const one=async r=>{const tt=ci>=0?(r[ci]||"").trim():"",title=ct>=0?(r[ct]||"").trim():"",year=cy>=0?(r[cy]||"").trim().slice(0,4):"";let raw=cr>=0?parseFloat((r[cr]||"").replace(",",".")):0;
    let it=null;try{if(/^tt\d+$/.test(tt)){const f=await tmdb("/find/"+tt,{external_source:"imdb_id"});const m=f.movie_results?.[0],v=f.tv_results?.[0];it=m?itemFrom(m,"movie"):v?itemFrom(v,"tv"):null}
      if(!it&&title){const s=await tmdb("/search/multi",{query:title});const c=(s.results||[]).filter(x=>x.media_type==="movie"||x.media_type==="tv");
        const best=c.find(x=>year&&(x.release_date||x.first_air_date||"").startsWith(year))||c[0];if(best)it=itemFrom(best)}}catch(e){}
    done++;if(it&&!mine.shelf.has(it.k)){ok++;const rating=raw?Math.max(0,Math.min(10,Math.round(lb||raw<=5&&h.some(x=>x.includes("letterboxd"))?raw*2:raw))):0;
      out.push({user_id:me.user_id,tmdb:it.k,data:slim(it),status:"done",rating,note:"",updated_at:new Date().toISOString()});mine.shelf.set(it.k,{...out[out.length-1],added_at:out[out.length-1].updated_at})}else if(!it)miss.push(title||tt);
    if(done%5===0)st.textContent=`Обработано ${done} из ${list.length} · найдено ${ok}`};
  let i=0;await Promise.all([0,1,2,3].map(async()=>{while(i<list.length)await one(list[i++])}));
  for(let j=0;j<out.length;j+=100){const {error}=await sb.from("km_shelf").upsert(out.slice(j,j+100),{ignoreDuplicates:true});if(error){st.textContent="Сохранено не всё: "+error.message;break}}
  st.innerHTML=`Готово ✅ Добавлено ${ok}${miss.length?`. Не нашёл: ${esc(miss.slice(0,8).join(", "))}${miss.length>8?" и ещё "+(miss.length-8):""}`:""}`;toast(`Импортировано ${ok} фильмов`);if(view==="shelf")renderShelf()}

async function _matchImage(it,sup){const c=document.createElement("canvas");c.width=1080;c.height=1920;const g=c.getContext("2d");
  const bg=g.createLinearGradient(0,0,1080,1920);bg.addColorStop(0,sup?"#2a1a02":"#1a0508");bg.addColorStop(.5,"#0b0b0d");bg.addColorStop(1,"#22060c");g.fillStyle=bg;g.fillRect(0,0,1080,1920);
  const load=src=>new Promise(ok=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=src});
  g.fillStyle="#ff2d3f";g.font="800 44px Unbounded, Manrope, sans-serif";g.fillText("KINOMATCH",80,140);
  g.fillStyle="#fff";g.font="900 104px Unbounded, Manrope, sans-serif";g.fillText(sup?"Супер-мэтч!":"Мэтч!",80,300);
  g.fillStyle="#c9c7cf";g.font="700 44px Manrope, sans-serif";g.fillText("Мы оба хотим это посмотреть",80,380);
  const av=(x,ch,col)=>{g.fillStyle=col;g.beginPath();g.arc(x,520,80,0,7);g.fill();g.fillStyle="#fff";g.font="900 80px Manrope, sans-serif";g.textAlign="center";g.fillText(ch,x,548);g.textAlign="left"};
  av(460,((me?.name||"Я")[0]||"Я").toUpperCase(),"#ff2d3f");av(620,((ptName()||"?")[0]||"?").toUpperCase(),"#6b5cff");
  if(it.poster){const im=await load(IMG+"w500"+it.poster);if(im){const w=600,h=900,x=(1080-w)/2,y=660;g.save();g.beginPath();g.roundRect(x,y,w,h,40);g.clip();g.drawImage(im,x,y,w,h);g.restore()}}
  g.fillStyle="#fff";g.font="800 54px Manrope, sans-serif";g.textAlign="center";g.fillText(String(it.t||"").slice(0,32),540,1660);g.fillStyle="#ffc93c";g.font="700 40px Manrope, sans-serif";g.fillText("kinomatch-ua.pages.dev",540,1800);g.textAlign="left";
  c.toBlob(async b=>{const f=new File([b],"kinomatch-match.png",{type:"image/png"});if(navigator.canShare?.({files:[f]})){try{await navigator.share({files:[f],title:"Наш мэтч в Kinomatch"});return}catch(e){}}
    const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=f.name;document.body.appendChild(a);a.click();a.remove();toast("Картинка сохранена")},"image/png")}
