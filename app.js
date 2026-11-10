const BRAND="Kinomatch";
const CC=(()=>{const TZ={"Europe/Kiev":"UA","Europe/Kyiv":"UA","Europe/Moscow":"RU","Europe/Minsk":"BY","Europe/London":"GB","Europe/Warsaw":"PL","Europe/Berlin":"DE","Europe/Paris":"FR","Europe/Rome":"IT","Europe/Madrid":"ES","Europe/Prague":"CZ","Europe/Vilnius":"LT","Europe/Riga":"LV","Europe/Tallinn":"EE","Europe/Chisinau":"MD","Asia/Almaty":"KZ","Asia/Tbilisi":"GE","America/New_York":"US","America/Chicago":"US","America/Los_Angeles":"US","America/Toronto":"CA","Europe/Istanbul":"TR"};
  try{const o=localStorage.getItem("km_cc");if(o&&/^[A-Z]{2}$/.test(o))return o}catch(e){}
  if(/^[A-Z]{2}$/.test(window.KM_CC||"")&&window.KM_CC!=="XX")return window.KM_CC;
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";if(TZ[tz])return TZ[tz];
  const l=(navigator.language||"").split("-")[1];return l&&/^[A-Za-z]{2}$/.test(l)?l.toUpperCase():"UA"})();
const CCN=()=>{try{return new Intl.DisplayNames([window.LANG==="en"?"en":window.LANG==="uk"?"uk":"ru"],{type:"region"}).of(CC)}catch(e){return CC}};
const JW=()=>`https://www.justwatch.com/${CC.toLowerCase()}/search?q=`;
