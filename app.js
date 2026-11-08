// 해방촌 16-11 인터랙티브 마케트 — model.json(라이노 rh_web_export.py) 을 three.js 로 띄운다.
// 좌표: 로컬 (x 신흥로 방향, y 대지 안쪽, z 위, 1F FL=0) → three (x, z, -y)
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { openReport } from "./report.js";
import { RENDERS, CHAPTERS, FILM, img, byView, byFloor, bySec } from "./renders.js";
import { SHEETS, sheetImg, sheetsFor } from "./sheets.js";

const P = (x, y, z) => new THREE.Vector3(x, z, -y);
const NORTH = [-0.7155, 0.6986], EAST = [0.6986, 0.7155];   // 로컬 평면에서 정북·정동 (지적 기준)
const LAT = 37.5429;
const LV = { 1: 0.0, 2: 3.8, 3: 7.5 };
const ROOMS = [  // spec.py v3
  [1, "필로티 주차", 2.45, 2.6], [1, "동네 빨래방", 6.4, 2.4, 12.0], [1, "현관홀", 2.85, 6.4], [1, "중정", 5.6, 5.85, 12.3], [1, "부모님 방", 3.5, 8.25, 6.4], [1, "욕실", 6.0, 8.75, 2.9],
  [2, "안방", 2.6, 2.4, 9.0], [2, "아이방 1", 6.4, 2.4, 9.8], [2, "복도", 6.6, 3.96], [2, "욕실·세탁", 0.95, 4.5, 3.7], [2, "가족실", 2.85, 6.4, 4.6], [2, "아이방 2", 4.4, 8.4, 8.0],
  [3, "전면 테라스", 4.6, 1.3], [3, "거실·식당", 4.6, 3.3, 17.5], [3, "화장실", 0.95, 4.75, 2.6], [3, "주방", 4.4, 8.3, 8.0],
];
const STYLE = {
  "콘크리트": { color: 0xeeebe4, edges: 0x5a5f66 }, "유리": { color: 0x9fc3d8, opacity: 0.32 }, "창호프레임": { color: 0x3c3c3a },
  "내벽": { color: 0xf6f4ef, edges: 0x8a9096 }, "문": { color: 0xb08d62 }, "계단": { color: 0xa3a3a3 }, "난간": { color: 0x555555 },
  "가구": { color: 0xd6c3a2 }, "식재": { color: 0x6f9a5a }, "외부": { color: 0xd3cec4 }, "지붕리브": { color: 0xdcd8d0 },
  "주변건물": { color: 0xf0eee9, edges: 0xc4c1bb, ctx: true }, "대지": { color: 0xefece5, ground: true }, "도로": { color: 0xc4c0b8, ground: true },
  "법규볼륨": { color: 0xd7263d, opacity: 0.16, legal: true },
};

// ---------------------------------------------------------------- 장면
const stage = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9e7e2);
scene.fog = new THREE.Fog(0xe9e7e2, 70, 160);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 600);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 2; controls.maxDistance = 140;
scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b2a6, 0.85));
const sun = new THREE.DirectionalLight(0xfff4e2, 2.2);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target); sun.target.position.copy(P(4.5, 5, 0));

const clipMats = [];
// ---- 가림 건물 투명화: 카메라와 집 사이(또는 카메라를 감싼) 주변 건물은 반투명으로 — 둘러보기에서 집이 벽에 가리지 않게
let ctxMat = null;
const fadeMat = new THREE.MeshStandardMaterial({ color: 0xf0eee9, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
clipMats.push(fadeMat);
const ray = new THREE.Raycaster(); let lastOcc = 0;
const PROBES = [[4.5, 5, 0.8], [4.5, 5, 5], [4.5, 5, 9.5], [0.5, 0.8, 4], [8.5, 0.8, 4], [0.5, 9.5, 4], [8.5, 9.5, 4], [4.5, 0.6, 1.5]];
function updateOccluders(now) {
  if (now - lastOcc < 120) return; lastOcc = now;
  const ctx = groups["주변건물"]; if (!ctx || !ctxMat) return;
  const meshes = ctx.children.filter((o) => o.isMesh), hit = new Set();
  for (const q of PROBES) {
    const p = new THREE.Vector3(q[0], q[2], -q[1]), d = p.sub(camera.position), len = d.length();
    ray.set(camera.position, d.normalize()); ray.far = len;
    for (const h of ray.intersectObjects(meshes, false)) hit.add(h.object);
  }
  for (const m of meshes) { const f = hit.has(m); if ((m.material === fadeMat) !== f) { m.material = f ? fadeMat : ctxMat; m.castShadow = !f; } }
}             // 단면·층 잘라내기를 받는 재질 (건물 + 주변 건물)
const groups = {};
let activePlanes = [];

async function load() {
  const data = await (await fetch("model.json")).json();
  for (const [name, g] of Object.entries(data.groups)) {
    const st = STYLE[name] || { color: 0xdddddd };
    const mat = new THREE.MeshStandardMaterial({ color: st.color, roughness: 0.92, metalness: 0, side: THREE.DoubleSide,
      transparent: st.opacity !== undefined, opacity: st.opacity ?? 1, depthWrite: st.opacity === undefined });
    if (!st.ground) clipMats.push(mat);
    if (st.ctx) ctxMat = mat;
    const root = new THREE.Group(); root.name = name;
    for (const m of g.meshes) {
      const geo = new THREE.BufferGeometry();
      const v = new Float32Array(m.v.length);
      for (let i = 0; i < m.v.length; i += 3) { v[i] = m.v[i]; v[i + 1] = m.v[i + 2]; v[i + 2] = -m.v[i + 1]; }
      geo.setAttribute("position", new THREE.BufferAttribute(v, 3)); geo.setIndex(m.i); geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = !st.opacity && !st.ground; mesh.receiveShadow = true;
      root.add(mesh);
      if (st.edges) {
        const lm = new THREE.LineBasicMaterial({ color: st.edges, transparent: true, opacity: st.ctx ? 0.6 : 0.9 }); clipMats.push(lm);
        root.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), lm));
      }
    }
    if (st.legal) root.visible = false;
    scene.add(root); groups[name] = root;
  }
  document.getElementById("loading").style.opacity = 0;
  setTimeout(() => document.getElementById("loading").remove(), 450);
}

// ---------------------------------------------------------------- 태양 (단순 태양위치식, 지방태양시)
function sunDir(hour, day) {
  const r = Math.PI / 180, phi = LAT * r;
  const dec = 23.44 * r * Math.sin(2 * Math.PI * (284 + day) / 365);
  const H = (hour - 12) * 15 * r;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(H)); // 북=0, 시계방향
  const ca = Math.cos(alt);
  const lx = ca * (Math.cos(az) * NORTH[0] + Math.sin(az) * EAST[0]);
  const ly = ca * (Math.cos(az) * NORTH[1] + Math.sin(az) * EAST[1]);
  return { v: P(lx, ly, Math.sin(alt)).normalize(), alt: alt / r, az: ((az / r) + 360) % 360 };
}
const state = { hour: 14, day: 172 };
function updateSun() {
  const s = sunDir(state.hour, state.day);
  sun.position.copy(sun.target.position).addScaledVector(s.v, 90);
  sun.intensity = s.alt > 0 ? 2.2 * Math.min(1, s.alt / 15 + 0.2) : 0;
  const hh = Math.floor(state.hour), mm = Math.round((state.hour - hh) * 60);
  document.getElementById("timeOut").textContent = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  document.getElementById("sunInfo").textContent = s.alt > 0 ? `태양고도 ${s.alt.toFixed(0)}° · 방위 ${s.az.toFixed(0)}° (북=0)` : "해가 진 시간";
}

// ---------------------------------------------------------------- 잘라내기 (층 · 단면)
const clip = { floor: null, sec: null };
function applyClip() {
  activePlanes = [];
  if (clip.floor) activePlanes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), LV[clip.floor] + 1.3));
  if (clip.sec === "A") activePlanes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), 5.6));
  if (clip.sec === "B") activePlanes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), -6.2));
  for (const m of clipMats) { m.clippingPlanes = activePlanes; m.needsUpdate = true; }
}

// ---------------------------------------------------------------- 시점 이동
const VIEWS = {
  overview: { cam: [-16, -44, 50], tgt: [4.5, 5.0, 2.0], label: "조감" },
  street: { cam: [2.2, -7.6, 1.6], tgt: [4.5, 2.0, 4.6], label: "신흥로 가로", fov: 62 },
  court: { cam: [4.1, 4.7, 1.5], tgt: [6.4, 8.4, 5.5], label: "중정", fov: 72 },
  terrace: { cam: [1.6, 0.9, 9.1], tgt: [8.0, 4.5, 8.4], label: "3층 테라스", fov: 62 },
  north: { cam: [-6, 24, 16], tgt: [3.5, 6.0, 5.0], label: "정북 사선" },
};
let tween = null;
function goView(key, instant = false) {
  closeRender(false);
  const v = VIEWS[key]; const c = P(...v.cam), t = P(...v.tgt);
  document.getElementById("crumbSub").textContent = v.label;
  if (instant) { camera.position.copy(c); controls.target.copy(t); controls.update(); return; }
  tween = { c0: camera.position.clone(), t0: controls.target.clone(), c1: c, t1: t, s: performance.now(), d: 1400, f0: camera.fov, f1: v.fov || 35 };
}
function stepTween(now) {
  if (!tween) return;
  let k = Math.min(1, (now - tween.s) / tween.d); k = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camera.position.lerpVectors(tween.c0, tween.c1, k); controls.target.lerpVectors(tween.t0, tween.t1, k);
  if (tween.f1 !== undefined) { camera.fov = tween.f0 + (tween.f1 - tween.f0) * k; camera.updateProjectionMatrix(); }
  if (k >= 1) { const done = tween.done; tween = null; if (done) done(); }
}

// ---------------------------------------------------------------- 실 이름 라벨 (층 선택 시)
const labelsEl = document.getElementById("labels");
let labelEls = [];
function setLabels(floor) {
  labelsEl.innerHTML = ""; labelEls = [];
  if (!floor) return;
  for (const [f, name, x, y, a] of ROOMS) {
    if (f !== +floor) continue;
    const el = document.createElement("div"); el.className = "lab";
    el.innerHTML = `<b>${name}</b>${a ? `<small>${a}㎡</small>` : ""}`;
    labelsEl.appendChild(el); labelEls.push({ el, p: P(x, y, LV[f] + 0.4) });
  }
}
function placeLabels() {
  for (const { el, p } of [...labelEls, ...(galleryOn && !cur ? pinEls : [])]) {
    const s = p.clone().project(camera);
    el.style.display = s.z < 1 ? "" : "none";
    el.style.left = `${(s.x * 0.5 + 0.5) * innerWidth}px`; el.style.top = `${(-s.y * 0.5 + 0.5) * innerHeight}px`;
  }
}

// ---------------------------------------------------------------- UI
const $ = (q) => document.querySelector(q), $$ = (q) => [...document.querySelectorAll(q)];
function exclusive(btns, on) { btns.forEach((b) => b.classList.toggle("on", b === on)); }
$("#time").addEventListener("input", (e) => { state.hour = +e.target.value; updateSun(); });
$$("[data-season]").forEach((b) => b.addEventListener("click", () => { state.day = +b.dataset.season; exclusive($$("[data-season]"), b); updateSun(); }));
$("#ctxToggle").addEventListener("change", (e) => { if (groups["주변건물"]) groups["주변건물"].visible = e.target.checked; });
$("#legalToggle").addEventListener("change", (e) => { if (groups["법규볼륨"]) groups["법규볼륨"].visible = e.target.checked; });
$$("[data-view]").forEach((b) => b.addEventListener("click", () => { exclusive($$("[data-view]"), b); goView(b.dataset.view); thumbs("#viewThumbs", byView(b.dataset.view), { view: b.dataset.view }); }));
$$("[data-floor]").forEach((b) => b.addEventListener("click", () => {
  exclusive($$("[data-floor]"), b); closeRender(false); thumbs("#floorThumbs", byFloor(b.dataset.floor), b.dataset.floor === "all" ? null : { floor: b.dataset.floor });
  const f = b.dataset.floor === "all" ? null : b.dataset.floor;
  clip.floor = f; applyClip(); setLabels(f);
  if (groups["주변건물"]) groups["주변건물"].visible = !f && $("#ctxToggle").checked;
  if (f) { const z = LV[f]; tween = { c0: camera.position.clone(), t0: controls.target.clone(), c1: P(-6, -14, z + 22), t1: P(4.0, 5.0, z), s: performance.now(), d: 1200 }; }
  $("#crumbSub").textContent = f ? `${f}F 평면` : "전체";
}));
$$("[data-sec]").forEach((b) => b.addEventListener("click", () => {
  exclusive($$("[data-sec]"), b); closeRender(false); thumbs("#secThumbs", bySec(b.dataset.sec), b.dataset.sec === "none" ? null : { sec: b.dataset.sec }); clip.sec = b.dataset.sec === "none" ? null : b.dataset.sec; applyClip();
  if (clip.sec === "A") tween = { c0: camera.position.clone(), t0: controls.target.clone(), c1: P(24, 3.0, 6.0), t1: P(3.0, 5.2, 4.6), s: performance.now(), d: 1200 };
  if (clip.sec === "B") tween = { c0: camera.position.clone(), t0: controls.target.clone(), c1: P(4.2, -16, 6.0), t1: P(4.2, 7.0, 4.6), s: performance.now(), d: 1200 };
  $("#crumbSub").textContent = clip.sec ? `단면 ${clip.sec}` : "전체";
}));
$$(".dock-btn").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.action === "gallery") { setGallery(!galleryOn); return; }
  if (b.dataset.action === "report") { openReport(API); return; }
  if (b.dataset.action === "sheets") { openSheets(); return; }
  if (!b.dataset.panel) return;   // 링크(렌더 프롬프트 페이지)
  const id = b.dataset.panel, panel = document.getElementById(id), show = panel.hidden;
  setGallery(false); $$(".subpanel").forEach((p) => (p.hidden = true)); $$(".dock-btn").forEach((d) => d.classList.remove("on"));
  panel.hidden = !show; b.classList.toggle("on", show);
}));

// ---------------------------------------------------------------- 렌더 ↔ 3D (갤러리 = 3D 안의 카메라 자리들)
const RMAP = Object.fromEntries(RENDERS.map((r) => [r.id, r]));
const ORDER = CHAPTERS.flatMap(([k]) => RENDERS.filter((r) => r.ch === k));
function media(src, big) {
  if (src.endsWith(".mp4")) return `<video src="assets/${src}" ${big ? "controls autoplay" : "muted loop autoplay playsinline"}></video>`;
  return `<img src="assets/${src}" alt="" loading="lazy">`;
}
function thumbs(sel, list, sheetKey) {
  const sh = sheetKey ? sheetsFor(sheetKey) : [];
  $(sel).innerHTML = (list.length ? `<p class="rt-h">렌더 — 눌러서 그 자리로</p>` + list.map((r) => `<button class="rt" data-r="${r.id}"><img src="${img(r.id)}" alt="" loading="lazy"><span>${r.t}</span></button>`).join("") : "")
    + (sh.length ? `<p class="rt-h">도면</p>` + sh.map((d) => `<button class="rt" data-sheet="${d.dwg}"><img src="${sheetImg(d.dwg, true)}" alt="" loading="lazy"><span>${d.dwg} ${d.name}</span></button>`).join("") : "");
}
// 라이노 렌즈: 화면의 짧은 변(16:9 캡처에서는 세로) = 24mm → 세로 화각 2·atan(12/L) (GetFrustum 으로 확인)
// 렌더가 창을 cover 로 덮으므로, 창이 16:9 보다 넓으면 가로를 맞추고 아니면 세로를 그대로 쓴다
function fovFor(lens) {
  const v = 2 * Math.atan(12 / lens), a = innerWidth / innerHeight;
  const out = a > 16 / 9 ? 2 * Math.atan((Math.tan(v / 2) * 16 / 9) / a) : v;
  return (out * 180) / Math.PI;
}
const rov = $("#rov"), rovImg = $("#rovImg"), rcard = $("#rcard"), rmix = $("#rmix");
let cur = null;
function openRender(id) {
  const r = RMAP[id]; if (!r) return;
  cur = r; setPanelsFor(r); pinEls.forEach(({ el }) => (el.style.display = "none"));
  const fc = r.lens > 60 ? r.floor : null;   // 층 잘라내기는 아이소 컷만 (실내 컷은 천장이 있어야 함)
  clip.floor = fc || null; clip.sec = r.sec || null; applyClip(); setLabels(null);
  if (groups["주변건물"]) groups["주변건물"].visible = !fc && $("#ctxToggle").checked;
  rov.classList.remove("show"); rovImg.src = img(id);
  const ch = CHAPTERS.find(([k]) => k === r.ch);
  $("#rcTag").textContent = `${ch[1]} — ${ch[2]}`; $("#rcTitle").textContent = r.t; $("#rcNote").textContent = r.n;
  $("#rcIdx").textContent = `${ORDER.indexOf(r) + 1} / ${ORDER.length}`;
  rcard.hidden = false; rmix.value = 1; rov.style.opacity = "";
  controls.minDistance = 0.3; controls.maxPolarAngle = Math.PI;   // 중정 올려보기 같은 아래→위 시점 허용
  tween = { c0: camera.position.clone(), t0: controls.target.clone(), c1: P(...r.cam), t1: P(...r.tgt), s: performance.now(), d: 1500,
    f0: camera.fov, f1: fovFor(r.lens), done: () => { if (cur === r) rov.classList.add("show"); } };
  $("#crumbSub").textContent = r.t;
  $$("[data-r]").forEach((b) => b.classList.toggle("on", b.dataset.r === id));
  const st = $(`#strip [data-r="${id}"]`); if (st) st.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}
function closeRender(back = true) {
  if (!cur) return;
  cur = null; rov.classList.remove("show"); rov.style.opacity = ""; rcard.hidden = true; controls.minDistance = 2; controls.maxPolarAngle = Math.PI * 0.495; pinEls.forEach(({ el }) => (el.style.display = ""));
  $$("[data-r]").forEach((b) => b.classList.remove("on"));
  if (back) tween = { c0: camera.position.clone(), t0: controls.target.clone(), c1: camera.position.clone(), t1: controls.target.clone(), s: performance.now(), d: 600, f0: camera.fov, f1: 35 };
  else { camera.fov = 35; camera.updateProjectionMatrix(); }
}
function step(d) { if (!cur) return; const i = ORDER.indexOf(cur); openRender(ORDER[(i + d + ORDER.length) % ORDER.length].id); }
// 렌더가 속한 층·단면 칩도 같이 맞춘다
function setPanelsFor(r) {
  exclusive($$("[data-floor]"), $(`[data-floor="${(r.lens > 60 && r.floor) || "all"}"]`));
  exclusive($$("[data-sec]"), $(`[data-sec="${r.sec || "none"}"]`));
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-r]"); if (b) { openRender(b.dataset.r); return; }
  const sb = e.target.closest("[data-sheet]"); if (sb) { openSheets(sb.dataset.sheet); return; }
  if (e.target.closest("[data-film]")) { $("#viewerBody").innerHTML = media(FILM.src, true); $("#viewer").showModal(); }
});
rmix.addEventListener("input", () => { rov.style.opacity = rmix.value; });
$("#rcPrev").addEventListener("click", () => step(-1));
$("#rcNext").addEventListener("click", () => step(1));
$("#rcClose").addEventListener("click", () => closeRender());
$("#rcZoom").addEventListener("click", () => { if (cur) API.zoom(`render/${cur.id}.jpg`); });
controls.addEventListener("start", () => { if (cur && !tween) { rmix.value = 0; rov.style.opacity = 0; } });   // 드래그하면 3D 로
addEventListener("keydown", (e) => {
  if (!cur || document.querySelector("dialog[open]")) return;
  if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1); else if (e.key === "Escape") closeRender();
});
// 갤러리 모드: 3D 에 카메라 핀 + 아래 필름 스트립
let galleryOn = false; const pinEls = [];
function buildGallery() {
  $("#strip").innerHTML = `<button class="film" data-film><span>▶</span>${FILM.t}</button>` + CHAPTERS.map(([k, name, sub]) => {
    const list = RENDERS.filter((r) => r.ch === k);
    return `<section><h3>${name}<small>${sub}</small></h3><div>${list.map((r) => `<button class="rt" data-r="${r.id}"><img src="${img(r.id)}" alt="" loading="lazy"><span>${r.t}</span></button>`).join("")}</div></section>`;
  }).join("");
  ORDER.forEach((r, i) => {
    if (RENDERS.some((q, j) => j < RENDERS.indexOf(r) && q.cam.join() === r.cam.join())) return;   // 같은 자리 핀은 하나만
    const el = document.createElement("button"); el.className = "pin"; el.dataset.r = r.id; el.title = r.t; el.textContent = i + 1;
    $("#pins").appendChild(el); pinEls.push({ el, p: P(...r.cam) });
  });
}
function setGallery(on) {
  if (on && !$("#strip").childElementCount) buildGallery();
  galleryOn = on; document.body.classList.toggle("gal", on);
  $("#strip").hidden = !on; $("#pins").hidden = !on;
  $('[data-action="gallery"]').classList.toggle("on", on);
  if (on) { $$(".subpanel").forEach((p) => (p.hidden = true)); $$(".dock-btn[data-panel]").forEach((d) => d.classList.remove("on")); goView("overview"); }
}
thumbs("#viewThumbs", byView("overview"), { view: "overview" }); thumbs("#floorThumbs", byFloor("all")); thumbs("#secThumbs", bySec("none"));
// ---------------------------------------------------------------- 도면집 뷰어 (도면 ↔ 3D)
let curSheet = null;
function openSheets(dwg) {
  const nav = $("#sheets .sh-nav");
  if (!nav.childElementCount) {
    let g = "";
    nav.innerHTML = SHEETS.map((d) => (d.g !== g ? `<h4>${(g = d.g)}</h4>` : "") + `<button class="sh-it" data-sh="${d.dwg}"><img src="${sheetImg(d.dwg, true)}" alt="" loading="lazy"><span><b>${d.dwg}</b> ${d.name}</span></button>`).join("");
    nav.addEventListener("click", (e) => { const b = e.target.closest("[data-sh]"); if (b) showSheet(b.dataset.sh); });
  }
  showSheet(dwg || curSheet || SHEETS[0].dwg);
  if (!$("#sheets").open) $("#sheets").showModal();
}
function showSheet(dwg) {
  const d = SHEETS.find((x) => x.dwg === dwg); curSheet = dwg;
  $("#shImg").src = sheetImg(dwg); $("#shImg").alt = `${d.dwg} ${d.name}`; $("#shFull").href = sheetImg(dwg);
  $("#shCap").textContent = `${d.dwg} — ${d.name}`; $("#sh3d").hidden = !d.link;
  $$("#sheets [data-sh]").forEach((b) => b.classList.toggle("on", b.dataset.sh === dwg));
  const it = $(`#sheets [data-sh="${dwg}"]`); if (it) it.scrollIntoView({ block: "nearest" });
}
function sheetTo3D() {
  const l = (SHEETS.find((x) => x.dwg === curSheet) || {}).link; if (!l) return;
  $("#sheets").close();
  if (l.r) return openRender(l.r);
  if (l.legal) return API.legal(true);
  const panel = l.floor ? "floorPanel" : l.sec ? "sectionPanel" : "viewPanel";
  const btn = $(`[data-panel="${panel}"]`); if ($(`#${panel}`).hidden) btn.click();
  if (l.floor) $(`[data-floor="${l.floor}"]`).click();
  if (l.sec) $(`[data-sec="${l.sec}"]`).click();
  if (l.view) $(`[data-view="${l.view}"]`).click();
}
$("#sh3d").addEventListener("click", sheetTo3D);
$("#shClose").addEventListener("click", () => $("#sheets").close());
addEventListener("keydown", (e) => {
  if (!$("#sheets").open || !curSheet) return;
  const i = SHEETS.findIndex((x) => x.dwg === curSheet);
  if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); showSheet(SHEETS[Math.min(i + 1, SHEETS.length - 1)].dwg); }
  if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); showSheet(SHEETS[Math.max(i - 1, 0)].dwg); }
});
$("#repClose").addEventListener("click", () => $("#report").close());
$("#repPrint").addEventListener("click", () => print());
// 리포트 → 3D 연결
const API = {
  season(day, hour) {
    state.day = day; state.hour = hour; $("#time").value = hour;
    exclusive($$("[data-season]"), $(`[data-season="${day}"]`)); updateSun(); goView("overview");
  },
  legal(on) { $("#legalToggle").checked = on; if (groups["법규볼륨"]) groups["법규볼륨"].visible = on; goView("north"); },
  view(key) { exclusive($$("[data-view]"), $(`[data-view="${key}"]`)); goView(key); },
  zoom(src) { $("#viewerBody").innerHTML = media(src, true); $("#viewer").showModal(); },
  render(id) { openRender(id); },
  sheet(dwg) { openSheets(dwg); },
};
$("#viewerClose").addEventListener("click", () => { $("#viewer").close(); $("#viewerBody").innerHTML = ""; });

addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
renderer.setAnimationLoop((now) => { stepTween(now); controls.update(); updateOccluders(now); placeLabels(); renderer.render(scene, camera); });

goView("overview", true); updateSun();
document.getElementById("viewPanel").hidden = false;
load().catch((e) => { document.getElementById("loading").textContent = "모델을 불러오지 못했습니다: " + e.message; });
