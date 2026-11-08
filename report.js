// 사이트 분석 리포트 (광역 분석 + 현장·도면 조사). openReport(api) — api: { season(day,hour), legal(on), view(key) }
const AM = "광역 분석 (반경 약 350m · 0.384㎢), 2026.11.07 · 기후·대기 원자료 ECMWF ERA5-Land · ERA5 · CAMS";
const MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const C = { ink: "#1f2328", mute: "#6b7783", red: "#d7263d", navy: "#2e4a62", gold: "#c99a2e", green: "#4f7a5a", slate: "#8a97a3", grid: "#e3e8ed" };

// ---------------------------------------------------------------- 작은 차트들 (SVG/HTML, 의존성 없음)
function bars(rows, { unit = "%", color = C.navy, max } = {}) {
  const m = max ?? Math.max(...rows.map((r) => r[1]));
  return `<div class="bars">${rows.map(([l, v, x]) => `<div class="bar-row"><span class="bl">${l}</span>
    <span class="bt"><i style="width:${(v / m) * 100}%;background:${color}"></i></span><span class="bv">${v}${unit}${x ? ` <small>${x}</small>` : ""}</span></div>`).join("")}</div>`;
}
function stack(parts, colors) {
  return `<div class="stack">${parts.map(([l, v], i) => `<i style="flex:${v};background:${colors[i]}" title="${l} ${v}%"></i>`).join("")}</div>
  <div class="legend">${parts.map(([l, v], i) => `<span><b style="background:${colors[i]}"></b>${l} ${v}%</span>`).join("")}</div>`;
}
function lines(series, { min, max, w = 560, h = 230, unit = "" }) {
  const L = 34, B = 24, X = (i) => L + (i * (w - L - 8)) / 11, Y = (v) => 8 + ((max - v) / (max - min)) * (h - B - 8);
  let g = "";
  for (let v = min; v <= max; v += (max - min) / 5) g += `<line x1="${L}" x2="${w - 8}" y1="${Y(v)}" y2="${Y(v)}" stroke="${C.grid}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`;
  MONTHS.forEach((m, i) => (g += `<text x="${X(i)}" y="${h - 6}" text-anchor="middle">${m}월</text>`));
  for (const s of series) {
    g += `<polyline fill="none" stroke="${s.color}" stroke-width="2" points="${s.v.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}"/>`;
    g += s.v.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="2.6" fill="${s.color}"><title>${s.name} ${MONTHS[i]}월 ${v}${unit}</title></circle>`).join("");
  }
  const leg = series.map((s) => `<span><b style="background:${s.color}"></b>${s.name}</span>`).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img">${g}</svg><div class="legend">${leg}</div>`;
}
function columns(v, { color, unit, w = 560, h = 180, label }) {
  const L = 34, B = 24, max = Math.max(...v), bw = (w - L - 8) / 12;
  let g = "";
  v.forEach((x, i) => {
    const bh = (x / max) * (h - B - 14);
    g += `<rect x="${L + i * bw + 4}" y="${h - B - bh}" width="${bw - 8}" height="${bh}" fill="${color}"><title>${MONTHS[i]}월 ${x}${unit}</title></rect>`;
    g += `<text x="${L + i * bw + bw / 2}" y="${h - B - bh - 4}" text-anchor="middle">${x}</text><text x="${L + i * bw + bw / 2}" y="${h - 6}" text-anchor="middle">${MONTHS[i]}월</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${g}</svg>`;
}
function radar(vals, labels, { size = 300, color = C.gold }) {
  const c = size / 2, R = c - 30, max = Math.max(...vals), n = vals.length;
  const pt = (i, r) => [c + r * Math.sin((2 * Math.PI * i) / n), c - r * Math.cos((2 * Math.PI * i) / n)];
  let g = "";
  for (const k of [0.25, 0.5, 0.75, 1]) g += `<polygon fill="none" stroke="${C.grid}" points="${vals.map((_, i) => pt(i, R * k).join(",")).join(" ")}"/>`;
  labels.forEach((l, i) => { const [x, y] = pt(i, R + 16); g += `<line x1="${c}" y1="${c}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" stroke="${C.grid}"/><text x="${x}" y="${y + 4}" text-anchor="middle">${l}</text>`; });
  g += `<polygon fill="${color}" fill-opacity=".55" stroke="${color}" points="${vals.map((v, i) => pt(i, (R * v) / max).join(",")).join(" ")}"/>`;
  vals.forEach((v, i) => { const [x, y] = pt(i, (R * v) / max); g += `<circle cx="${x}" cy="${y}" r="3" fill="${color}"><title>${labels[i]} ${v} kWh/㎡</title></circle>`; });
  return `<svg class="chart radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="방위별 수직면 일사">${g}</svg>`;
}
const stat = (big, small) => `<div class="stat"><b>${big}</b><span>${small}</span></div>`;
const img = (src, cap) => `<figure class="fig" data-src="site/${src}"><img src="assets/site/${src}" alt="${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
const act = (key, label) => `<button class="act" data-act="${key}">${label} →</button>`;

// ---------------------------------------------------------------- 페이지
const PAGES = [
  ["01", "위치", "남산 아래 경사 주거지, 해방촌", () => `
    <div class="cols"><div>${img("aerial_full.jpg", "2km × 2km 항공영상 (위가 북쪽) · 붉은 원 = 대상지")}</div>
    <div><ul class="pts"><li>용산구 용산2가동, 남산 남쪽 경사면</li><li>평균 경사 8.9° — 북쪽 남산으로 오른다</li><li>대상지는 순환도로 신흥로(폭 8.1m)에 9.5m 접한다</li><li>37.5429°N · 126.9861°E</li></ul>
    ${img("aerial_zoom.jpg", "확대 (약 760 × 430m)")}</div></div>`, "Stura3D 항공영상"],
  ["02", "광역 레이어", "반경 350m의 대지 조건", () => `
    <div class="cols"><div>${img("layers_explode.jpg", "레이어 분해 — Trees · Site · Building · Transport · Water · Green")}</div>
    <div><div class="stats">${stat("3.2시간", "평균 일조 (맑은 날)")}${stat("8.9°", "평균 경사도")}${stat("43%", "평균 천공률")}${stat("66dB", "평균 교통소음")}
    ${stat("13,015", "인구밀도 명/㎢")}${stat("76%", "5분 보행권")}${stat("2.1%", "녹지 비율")}${stat("603만", "지가 중앙값 원/㎡")}</div>
    <h4>토지 이용 (0.384㎢)</h4>${stack([["건물", 34.1], ["도로", 19.7], ["녹지", 2.1], ["공지", 44.1]], [C.navy, C.slate, C.green, "#d9dee3"])}
    <p class="note">녹지는 2.1%뿐 — 숲은 남산에 몰려 있고 동네 안은 비어 있다.</p></div></div>`, AM],
  ["03", "도시 조직", "낮고 오래된 벽돌 주거지", () => `
    <div class="grid2"><div><h4>건물 용도 (1,157동)</h4>${bars([["주거", 77.6, "898동"], ["상업", 10.7, "124동"], ["공공", 2.0], ["공업", 0.1], ["기타", 9.6]])}</div>
    <div><h4>층수</h4>${bars([["1–2.8층", 62.8, "727동"], ["2.8–4.5층", 35.2, "407동"], ["4.5–6.3층", 1.7], ["6.3–8층", 0.3]], { color: C.slate })}</div>
    <div><h4>준공연도</h4>${bars([["1900–1969", 5.4], ["1970–1999", 79.1, "820동"], ["2000–2022", 15.5]], { color: C.gold })}</div>
    <div><h4>건폐율</h4>${bars([["0–24%", 5.1], ["25–49%", 17.3], ["50–74%", 53.5], ["75–100%", 24.1]], { color: C.red })}</div></div>
    <p class="note">79%가 1970~90년대 집 — 2035년이면 대부분 40~65년. 건폐율 50% 이상이 78%로 필지가 꽉 차 있다.</p>`, AM],
  ["04", "주변 조직", "곡선 도로가 감싼 촘촘한 필지", () => `
    ${img("figure_ground.jpg", "Stura3D 지형·건물 (위가 북쪽, 가로 약 220m) · 굵은 붉은 선 = 대상지 · 가는 붉은 선 = 등고선")}
    <ul class="pts"><li>신흥로 곡선 구간, 골목이 갈라지는 교차점 옆</li><li>주변 필지는 대부분 100㎡ 안팎, 건물 사이 0.5~1m</li><li>대지 남서쪽 면이 도로를 향한다</li></ul>`, "Stura3D"],
  ["05", "생활권 · 교통", "걸어서 다 닿는 동네, 의료·공공은 멀다", () => `
    <div class="cols"><div><h4>15분 안 시설 (614곳 · 9종 모두)</h4>${bars([["음식점", 250, "1분"], ["카페·술집", 216, "1분"], ["소매", 75, "2분"], ["여가", 23, "2분"], ["공공", 20, "5분"], ["교육", 14, "2분"], ["문화", 8, "5분"], ["금융·부동산", 5, "2분"], ["의료", 3, "9분"]], { unit: "", color: C.green })}</div>
    <div><h4>가까운 버스정류장 (도보 10분 안 20곳)</h4><table class="tbl">${[["용암한신아파트", "140m · 2분"], ["우리들가정의원", "150m · 2분"], ["남산교회입구", "200m · 3분"], ["용암경로당입구", "290m · 4분"], ["해방촌오거리", "350m · 4분"], ["신흥교회앞", "360m · 4분"], ["용산2가동주민센터·보성여중고", "420m · 5분"]].map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table></div></div>`, AM],
  ["06", "기후", "덥고 습한 여름, 1년 내내 미세먼지", () => `
    <div class="cols"><div><h4>월별 기온 (°C)</h4>${lines([{ name: "일 최고", color: C.red, v: [2.2, 4.3, 11.5, 17.6, 21.6, 26.6, 29.0, 29.2, 26.1, 18.8, 12.0, 2.9] }, { name: "월 평균", color: C.ink, v: [-2.3, -0.5, 5.7, 11.9, 16.5, 22.0, 25.6, 26.0, 22.2, 14.5, 7.2, -1.3] }, { name: "일 최저", color: C.navy, v: [-6.1, -4.7, 0.2, 6.6, 11.4, 17.8, 22.7, 23.2, 18.8, 10.5, 2.7, -5.0] }], { min: -10, max: 40, unit: "°C" })}
    <h4>강수량 (mm, 연 1,343)</h4>${columns([22, 18, 44, 66, 87, 164, 301, 268, 206, 92, 41, 35], { color: C.navy, unit: "mm", label: "월별 강수량" })}</div>
    <div><div class="stats">${stat("12.3°C", "연평균 기온")}${stat("35.4°C", "연교차")}${stat("86%", "7월 습도 (연 73%)")}${stat("37%", "쾌적 시간 9~26°C")}</div>
    <h4>연간 체감 구간</h4>${stack([["추위", 19], ["서늘", 14], ["쾌적", 37], ["더위", 15], ["폭염", 15]], [C.navy, "#8fb3cc", C.green, C.gold, C.red])}
    <h4>대기질 (PM2.5 연평균 29.7µg/㎥ · 권고 초과 293일)</h4>${stack([["좋음", 4], ["양호", 35], ["보통", 12], ["나쁨", 33], ["매우 나쁨", 11], ["극도로 나쁨", 4]], ["#4f7a5a", "#97bc62", "#e5c36b", "#e08a3c", C.red, "#7a1220"])}
    <p class="note">4월이 가장 쾌적(76%), 8월이 가장 나쁨(5%) → 봄·가을은 중정·테라스에서, 여름은 통풍·제습, 겨울은 햇빛.</p></div></div>`, AM],
  ["07", "태양 · 바람", "빛은 남쪽에서, 바람은 서쪽에서", () => `
    <div class="cols"><div><h4>방위별 연간 수직면 일사 (kWh/㎡)</h4>${radar([276, 342, 495, 679, 831, 925, 950, 926, 833, 681, 496, 343], ["N", "30°", "60°", "E", "120°", "150°", "S", "210°", "240°", "W", "300°", "330°"], {})}
    <p class="note">남향 950 vs 북향 276 (×3.4). 대지 정면(신흥로)은 남서향 225° — 정면이 가장 밝다.</p></div>
    <div><h4>태양 남중고도</h4><div class="stats three">${stat("76°", "하지 · 낮 14h30m")}${stat("52°", "춘·추분 · 12h")}${stat("29°", "동지 · 9h30m")}</div>
    <h4>바람 (연평균 2.5m/s · 무풍 2%)</h4><div class="stats">${stat("WSW", "봄 2.8 · 여름 2.3 m/s")}${stat("E", "가을 2.3 m/s")}${stat("WNW", "겨울 2.7 m/s (찬 북서풍)")}${stat("10.9%", "최대 방위 빈도")}</div>
    <p class="note">동지 29°: 길 건너 3층(약 9m)의 그림자가 약 16m → 겨울 1층은 그늘. 중정으로 위에서 빛을 내려야 한다.</p>
    <div class="acts">${act("winter", "3D에서 동지 정오 그림자 보기")}${act("summer", "하지 오후 2시 보기")}</div></div></div>`, AM + " · 방위 0° = 북"],
  ["08", "대지 현황", "98.84㎡, 기울어진 사다리꼴", () => `
    <div class="cols"><div>${img("figure_ground_zoom.jpg", "대상지 확대 (위 = 북)")}</div>
    <div><table class="tbl kv">${[["지번", "용산동2가 16-11 (신흥로 82-1)"], ["면적", "98.84㎡ (공부 98.9㎡ · 29.9평)"], ["형상", "도로 9.51 · 좌 9.77 · 뒤 9.21 · 우 11.58m"], ["접도", "남서측 신흥로 폭 8.1m, 9.5m 접함"], ["지반", "84.93 ~ 86.69m (고저차 1.77m), 평균 85.82m"], ["노면", "신흥로 85.30 ~ 85.34m"], ["기존", "1985 연와조 지하1 · 지상2층, 1층 진양세탁"], ["이웃", "16-12 3층 · 16-9 2층 · 16-10 2층"]].map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join("")}</table></div></div>`, "서울도시공간포털 지적·건축물대장 (2026.11.07 조회) · Stura3D 지형 0.1m 격자"],
  ["09", "법규", "법규가 정한 최대 볼륨", () => `
    <div class="cols"><div>${img("legal3d.jpg", "붉은 볼륨 = 정북일조 · 고도 12m 안에서 지을 수 있는 최대 범위")}</div>
    <div><div class="stats">${stat("60%", "건폐율 · 최대 59.3㎡")}${stat("150%", "용적률 · 최대 148.3㎡")}${stat("12m", "고도지구 (평균지반 85.82)")}${stat("1.5m", "정북일조 이격 (10m 이하)")}</div>
    <ul class="pts"><li>제1종일반주거지역 · 정북일조 기준지반 86.30m (대지·북측 대지 평균의 중간)</li><li>건축선 안 최대 영역 70.55㎡ 중 59.3㎡만 덮을 수 있다 → 빈 땅 11㎡ 이상은 반드시 남는다</li><li>주차 1대 (단독주택 시설면적 50~150㎡)</li></ul>
    <div class="acts">${act("legal", "3D에서 법규 볼륨 켜기")}</div></div></div>`, "서울도시공간포털 토지이용계획 · 건축법 61조 · 시행령 86조 · 학습용 검토, 인허가 판단 아님"],
  ["10", "종합", "사이트가 정한 네 가지 설계 조건", () => `
    <div class="cards">${[["남서 도로면이 가장 밝다", "일사 S 950 kWh/㎡", "전면 아치 + 3층 테라스로 거리를 향해 연다"], ["겨울 1층은 그늘", "동지 29° · 앞 건물 그림자 16m", "중정으로 위에서 빛을 내려 보낸다"], ["꽉 찬 노후 벽돌 조직", "건폐율 50%↑ 78% · 79%가 1970~90년대", "법정 최대로 짓고 남는 11㎡를 중정 하나로 모은다"], ["세탁소였던 1층, 걸어서 사는 동네", "15분 안 시설 614곳", "1층은 동네 빨래방 + 필로티 주차 1대"]]
      .map(([h, d, r], i) => `<div class="card"><em>0${i + 1}</em><h4>${h}</h4><small>${d}</small><p>→ ${r}</p></div>`).join("")}</div>
    <p class="note big">결론: 중정형 최대 볼륨 — 연면적 140.99㎡ · 용적률 142.65% · 높이 10.13m</p>
    <div class="acts">${act("court", "3D에서 중정 보기")}</div>`, "설계안 v3 · 근거 수치는 앞 장들"],
];

export function openReport(api) {
  const dlg = document.getElementById("report");
  const body = dlg.querySelector(".rep-body"), nav = dlg.querySelector(".rep-nav");
  if (!body.childElementCount) {
    body.innerHTML = PAGES.map(([no, short, title, html, src], i) => `<section class="rep-page" id="rp${i}"><header><span>${no} — ${short}</span><h3>${title}</h3></header>${html()}<footer>자료: ${src}</footer></section>`).join("");
    nav.innerHTML = PAGES.map(([no, short], i) => `<a href="#rp${i}" data-i="${i}">${no} ${short}</a>`).join("");
    nav.addEventListener("click", (e) => { const a = e.target.closest("a"); if (!a) return; e.preventDefault(); body.querySelector(a.getAttribute("href")).scrollIntoView({ behavior: "smooth" }); });
    const obs = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) nav.querySelectorAll("a").forEach((a) => a.classList.toggle("on", a.dataset.i === en.target.id.slice(2))); }), { root: body, rootMargin: "-30% 0px -65% 0px" });
    body.querySelectorAll(".rep-page").forEach((p) => obs.observe(p));
    body.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (b) { dlg.close(); ({ winter: () => api.season(355, 12), summer: () => api.season(172, 14), legal: () => api.legal(true), court: () => api.view("court") })[b.dataset.act](); return; }
      const f = e.target.closest(".fig"); if (f) api.zoom(f.dataset.src);
    });
  }
  dlg.showModal();
}
