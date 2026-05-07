// ── Konstanta Fisika ──────────────────────────────────────────────────────
// Gunakan var agar bisa di-override oleh Planet Editor secara runtime
var GM = 1000;

// ── Data Planet (TIDAK DIUBAH) ────────────────────────────────────────────
const BASE_PLANETS = [
  { name:'Merkurius', color:0xaaaaaa, orbitR:28,  speed:1.607, size:0.6,  trailLen:80,  ecc:0.205 },
  { name:'Venus',     color:0xffcc77, orbitR:42,  speed:1.174, size:0.95, trailLen:100, ecc:0.007 },
  { name:'Bumi',      color:0x4488ff, orbitR:58,  speed:1.0,   size:1.0,  trailLen:120, ecc:0.017 },
  { name:'Mars',      color:0xff4422, orbitR:74,  speed:0.802, size:0.72, trailLen:140, ecc:0.093 },
  { name:'Jupiter',   color:0xffaa55, orbitR:98,  speed:0.434, size:2.2,  trailLen:160, ecc:0.049 },
  { name:'Saturnus',  color:0xeecc88, orbitR:124, speed:0.323, size:1.85, trailLen:180, ecc:0.057 },
  { name:'Uranus',    color:0x88eeff, orbitR:148, speed:0.228, size:1.4,  trailLen:200, ecc:0.046 },
  { name:'Neptunus',  color:0x3355ff, orbitR:170, speed:0.182, size:1.35, trailLen:220, ecc:0.010 },
];

// ── Skenario Preset (TIDAK DIUBAH) ───────────────────────────────────────
const PRESETS = [
  {
    id:'default', name:'Tata Surya Normal',
    desc:'Proporsi Keplerian. Semua 8 planet aktif dengan kecepatan sebenarnya.',
    tag:'Default', tagColor:'#ffd700',
    speedMult:1, camDist:220, camPhi:1.0,
    visibleOnly:null, forceVectors:false, highlight:null,
    note:'Hukum III Kepler: T² ∝ r³'
  },
  {
    id:'inner', name:'Planet Dalam',
    desc:'Merkurius–Mars: orbit kecil, gravitasi kuat, percepatan besar.',
    tag:'Gravitasi', tagColor:'#ff8844',
    speedMult:1.5, camDist:110, camPhi:0.85,
    visibleOnly:['Merkurius','Venus','Bumi','Mars'],
    forceVectors:true, highlight:'Bumi',
    note:'|a⃗| = GM/r² — makin dekat makin besar'
  },
  {
    id:'outer', name:'Planet Luar',
    desc:'Jupiter–Neptunus: orbit raksasa, ω kecil, v rendah.',
    tag:'Kepler', tagColor:'#88ccff',
    speedMult:2.5, camDist:320, camPhi:0.8,
    visibleOnly:['Jupiter','Saturnus','Uranus','Neptunus'],
    forceVectors:false, highlight:'Jupiter',
    note:'v = r·ω → makin jauh, ω makin kecil'
  },
  {
    id:'hyperspeed', name:'Hyperspeed',
    desc:'Semua planet dipercepat 6×. Amati ∫|v⃗|dt meningkat drastis.',
    tag:'Integral', tagColor:'#cc88ff',
    speedMult:6, camDist:220, camPhi:1.0,
    visibleOnly:null, forceVectors:false, highlight:null,
    note:'s = ∫|v⃗|dt — makin cepat, jarak makin panjang'
  },
  {
    id:'compare', name:'Bumi vs Mars',
    desc:'Bandingkan vektor r⃗, v⃗, a⃗ Bumi & Mars secara langsung.',
    tag:'Vektor', tagColor:'#00ff88',
    speedMult:1, camDist:140, camPhi:0.75,
    visibleOnly:['Bumi','Mars'],
    forceVectors:true, highlight:'Bumi',
    note:'Δv⃗ menunjukkan selisih kecepatan orbital'
  },
  {
    id:'topdown', name:'Tampak Atas',
    desc:'Pandangan ekliptik atas. v⃗ selalu tegak lurus r⃗ pada orbit lingkaran.',
    tag:'Tampilan', tagColor:'#44ddff',
    speedMult:1, camDist:270, camPhi:0.06,
    visibleOnly:null, forceVectors:true, highlight:null,
    note:'v⃗ ⊥ r⃗ pada setiap titik orbit melingkar'
  },
];

// ── State Global ──────────────────────────────────────────────────────────
let scene, camera, renderer, raycaster, mouse;
let paused = false, showVectors = false, speedMult = 1;
let selectedPlanet = null, lastTime = 0;
let currentYear = 0; // Year counter for the simulation
const planetObjs = [];
let sunGlow;
let camTheta = 0.5, camPhi = 1.0, camDist = 220;
let isDragging = false, lastMX = 0, lastMY = 0;
let scenarioPanelOpen = false;
let toastTimer = null;
