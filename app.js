// 해방촌 16-11 인터랙티브 마케트 — model.json(라이노 rh_web_export.py) 을 three.js 로 띄운다.
// 좌표: 로컬 (x 신흥로 방향, y 대지 안쪽, z 위, 1F FL=0) → three (x, z, -y)
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { openReport } from "./report.js";

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

const clipMats = [];             // 단면·층 잘라내기를 받는 재질 (건물 + 주변 건물)
const groups = {};
let activePlanes = [];

async function load() {
  const data = await (await fetch("model.json")).json();
  for (const [name, g] of Object.entries(data.groups)) {
    const st = STYLE[name] || { color: 0xdddddd };
    const mat = new THREE.MeshStandardMaterial({ color: st.color, roughness: 0.92, metalness: 0, side: THREE.DoubleSide,
      transparent: st.opacity !== undefined, opacity: st.opacity ?? 1, depthWrite: st.opacity === undefined });
    if (!st.ground) clipMats.push(mat);
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
  street: { cam: [2.2, -7.6, 1.6], tgt: [4.5, 2.0, 4.6], label: "신흥로 가로" },
  court: { cam: [4.1, 4.7, 1.5], tgt: [6.4, 8.4, 5.5], label: "중정" },
  terrace: { cam: [1.6, 0.9, 9.1], tgt: [8.0, 4.5, 8.4], label: "3층 테라스" },
  north: { cam: [-6, 24, 16], tgt: [3.5, 6.0, 5.0], label: "정북 사선" },
};
let tween = null;
function goView(key, instant = false) {
  const v = VIEWS[key]; const c = P(...v.cam), t = P(...v.tgt);
  document.getElementById("crumbSub").textContent = v.label;
  if (instant) { camera.position.copy(c); controls.target.copy(t); controls.update(); return; }
  tween = { c0: camera.position.clone(), t0: controls.target.clone(), c1: c, t1: t, s: performance.now(), d: 1400 };
}
function stepTween(now) {
  if (!tween) return;
  let k = Math.min(1, (now - tween.s) / tween.d); k = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camera.position.lerpVectors(tween.c0, tween.c1, k); controls.target.lerpVectors(tween.t0, tween.t1, k);
  if (k >= 1) tween = null;
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
  for (const { el, p } of labelEls) {
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
$$("[data-view]").forEach((b) => b.addEventListener("click", () => { exclusive($$("[data-view]"), b); goView(b.dataset.view); }));
$$("[data-floor]").forEach((b) => b.addEventListener("click", () => {
  exclusive($$("[data-floor]"), b);
  const f = b.dataset.floor === "all" ? null : b.dataset.floor;
  clip.floor = f; applyClip(); setLabels(f);
  if (groups["주변건물"]) groups["주변건물"].visible = !f && $("#ctxToggle").checked;
  if (f) { const z = LV[f]; tween = { c0: camera.position.clone(), t0: controls.target.clone(), c1: P(-6, -14, z + 22), t1: P(4.0, 5.0, z), s: performance.now(), d: 1200 }; }
  $("#crumbSub").textContent = f ? `${f}F 평면` : "전체";
}));
$$("[data-sec]").forEach((b) => b.addEventListener("click", () => {
  exclusive($$("[data-sec]"), b); clip.sec = b.dataset.sec === "none" ? null : b.dataset.sec; applyClip();
  if (clip.sec === "A") tween = { c0: camera.position.clone(), t0: controls.target.clone(), c1: P(24, 3.0, 6.0), t1: P(3.0, 5.2, 4.6), s: performance.now(), d: 1200 };
  if (clip.sec === "B") tween = { c0: camera.position.clone(), t0: controls.target.clone(), c1: P(4.2, -16, 6.0), t1: P(4.2, 7.0, 4.6), s: performance.now(), d: 1200 };
  $("#crumbSub").textContent = clip.sec ? `단면 ${clip.sec}` : "전체";
}));
$$(".dock-btn").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.action === "gallery") { openGallery(); return; }
  if (b.dataset.action === "report") { openReport(API); return; }
  const id = b.dataset.panel, panel = document.getElementById(id), show = panel.hidden;
  $$(".subpanel").forEach((p) => (p.hidden = true)); $$(".dock-btn").forEach((d) => d.classList.remove("on"));
  panel.hidden = !show; b.classList.toggle("on", show);
}));

const GALLERY = [
  ["walkthrough_clay.mp4", "워크스루 (클레이, 19.5초)"],
  ["A1_iso_general_clay.jpg", "A1 아이소 전경 (클레이)"], ["A1_iso_general_line.jpg", "A1 아이소 전경 (라인)"],
  ["A2_iso_cut_1F.jpg", "A2 아이소 컷 1F"], ["A2_iso_cut_2F.jpg", "A2 아이소 컷 2F"], ["A2_iso_cut_3F.jpg", "A2 아이소 컷 3F"],
  ["S1_section_persp_A.jpg", "S1 단면투시 A"], ["S2_section_persp_B.jpg", "S2 단면투시 B"], ["E1_street_eye.jpg", "E1 신흥로 가로"],
  ["I1_laundromat_to_court.jpg", "I1 빨래방 → 중정"], ["I2_hall_court_stair.jpg", "I2 현관홀 · 중정"], ["I3_2F_gallery_corridor.jpg", "I3 2층 중정 복도"],
  ["I4_3F_living_terrace.jpg", "I4 3층 거실 → 테라스"], ["I5_3F_kitchen_court.jpg", "I5 3층 주방 → 중정"], ["I6_court_lookup.jpg", "I6 중정 올려보기"], ["I7_1F_room_court.jpg", "I7 부모님 방 → 중정"],
];
function media(src, big) {
  if (src.endsWith(".mp4")) return `<video src="assets/${src}" ${big ? "controls autoplay" : "muted loop autoplay playsinline"}></video>`;
  return `<img src="assets/${src}" alt="" loading="lazy">`;
}
function openGallery() {
  const grid = $("#galGrid");
  if (!grid.childElementCount) {
    grid.innerHTML = GALLERY.map(([s, c]) => `<figure data-src="${s}">${media(s)}<figcaption>${c}</figcaption></figure>`).join("");
    grid.querySelectorAll("figure").forEach((f) => f.addEventListener("click", () => { $("#viewerBody").innerHTML = media(f.dataset.src, true); $("#viewer").showModal(); }));
  }
  $("#gallery").showModal();
}
$("#galClose").addEventListener("click", () => $("#gallery").close());
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
};
$("#viewerClose").addEventListener("click", () => { $("#viewer").close(); $("#viewerBody").innerHTML = ""; });

addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
renderer.setAnimationLoop((now) => { stepTween(now); controls.update(); placeLabels(); renderer.render(scene, camera); });

goView("overview", true); updateSun();
document.getElementById("viewPanel").hidden = false;
load().catch((e) => { document.getElementById("loading").textContent = "모델을 불러오지 못했습니다: " + e.message; });
