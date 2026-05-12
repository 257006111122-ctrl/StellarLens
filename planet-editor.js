let editorPanelOpen = false;
let _editorReady = false;

// ── Snapshot data asli planet 
let _originalPlanetData = null;
let _originalGM = 1000;

function snapshotOriginalData() {
  _originalGM = window.GM || GM || 1000;
  _originalPlanetData = BASE_PLANETS.map(p => ({ ...p }));
}

// ── Reset satu planet ke data aslinya ────────────────────────────────────
function resetSinglePlanetToOriginal(idx) {
  const obj = planetObjs[idx];
  if (!obj || idx >= BASE_PLANETS.length) return; // hanya planet bawaan
  const orig = _originalPlanetData[idx];
  if (!orig) return;

  // Kembalikan semua field data
  obj.data.speed    = orig.speed;
  obj.data.orbitR   = orig.orbitR;
  obj.data.size     = orig.size;
  obj.data.ecc      = orig.ecc;
  obj.data.trailLen = orig.trailLen;

  // Reset skala mesh
  if (obj.mesh && obj._origSize) {
    obj.mesh.scale.setScalar(orig.size / obj._origSize);
  }
  obj.data.size = orig.size;

  // Rebuild orbit line
  if (obj.orbitLine && obj.orbitLine.geometry) {
    const pts = [];
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * orig.orbitR, 0, Math.sin(a) * orig.orbitR));
    }
    obj.orbitLine.geometry.setFromPoints(pts);
    obj.orbitLine.geometry.attributes.position.needsUpdate = true;
  }

  // Clear trail
  obj.trailPts = []; obj.distTraveled = 0; obj.prevPos = null;
  const pa = obj.trail.geometry.attributes.position;
  pa.array.fill(0); pa.needsUpdate = true;
  obj.trail.geometry.setDrawRange(0, 0);
}

// ── Reset semua planet editor ke kondisi semula ───────────────────────────
function resetAllEditorSettings() {
  // Reset GM
  window.GM = _originalGM;
  const gmSlider = document.getElementById('ed-gm');
  const gmValEl  = document.getElementById('ed-gm-val');
  if (gmSlider) gmSlider.value = _originalGM;
  if (gmValEl)  gmValEl.textContent = _originalGM;

  // Reset semua planet bawaan ke nilai aslinya
  BASE_PLANETS.forEach((_, i) => resetSinglePlanetToOriginal(i));

  // Hapus planet kustom sepenuhnya: scene + legend + planetObjs array
  const customObjs = planetObjs.splice(BASE_PLANETS.length);
  customObjs.forEach(obj => {
    ['mesh', 'label', 'orbitLine', 'trail', 'vecGroup'].forEach(k => {
      if (obj[k]) scene.remove(obj[k]);
    });
    const legRow = document.getElementById('leg-' + obj.data.name);
    if (legRow) legRow.remove();
  });

  // Hapus opsi kustom dari dropdown editor
  const sel = document.getElementById('ed-planet-select');
  if (sel) {
    sel.querySelectorAll('option').forEach(opt => {
      if (parseInt(opt.value) >= BASE_PLANETS.length) opt.remove();
    });
    if (parseInt(sel.value) >= BASE_PLANETS.length) sel.value = 0;
    editorSelectPlanet(parseInt(sel.value) || 0);
  }

  // Hapus vis-btn kustom dari editor Global tab
  const visList = document.getElementById('ed-visibility-list');
  if (visList) {
    visList.querySelectorAll('.ed-vis-btn').forEach(btn => {
      if (parseInt(btn.dataset.idx) >= BASE_PLANETS.length) btn.remove();
    });
  }

  // Update custom planet list
  updateCustomPlanetList();

  // Sync vis buttons planet bawaan
  planetObjs.forEach((obj, i) => {
    const btn = document.getElementById('ed-vis-' + i);
    if (btn) btn.classList.toggle('active', !!obj.visible);
  });

  setTimeout(syncGlobalButtons, 60);
  showToast('\u21ba Planet Editor direset ke kondisi awal');
}


// ── Entry point ───────────────────────────────────────────────────────────
function initEditor() {
  if (_editorReady) return;
  _editorReady = true;
  snapshotOriginalData();
  injectEditorStyles();
  buildEditorPanel();
}

// ── Helpers ───────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}
function colorIntToHex(colorInt) {
  return '#' + colorInt.toString(16).padStart(6, '0');
}

// ── Buat Panel Editor ─────────────────────────────────────────────────────
function buildEditorPanel() {
  const old = document.getElementById('editor-panel');
  if (old) old.remove();

  const panel = document.createElement('div');
  panel.id = 'editor-panel';
  panel.style.cssText = `
    position:fixed;top:50%;left:50%;
    transform:translate(-50%,-50%);
    width:440px;max-height:84vh;
    display:none;z-index:900;overflow:hidden;
    border:1px solid rgba(0,229,255,0.40);
    background:rgba(4,10,24,0.98);
    border-radius:12px;
    box-shadow:0 0 50px rgba(0,180,255,0.20),0 0 0 1px rgba(0,229,255,0.08);
    font-family:'DM Sans',system-ui,sans-serif;
  `;

  panel.innerHTML = buildEditorHTML();
  document.body.appendChild(panel);

  // Close button
  panel.querySelector('#editor-close-btn').addEventListener('click', () => {
    editorPanelOpen = false;
    panel.style.display = 'none';
    const btn = document.getElementById('planet-editor-btn');
    if (btn) btn.classList.remove('active');
  });

  // Tabs
  panel.querySelectorAll('.ed-tab').forEach(btn => {
    btn.addEventListener('click', () => editorSwitchTab(btn.dataset.tab));
  });

  // Draggable
  makeDraggable(panel, panel.querySelector('#editor-drag-handle'));

  // Planet select dropdown
  panel.querySelector('#ed-planet-select').addEventListener('change', function() {
    editorSelectPlanet(parseInt(this.value));
  });

  // Render first planet controls
  editorSelectPlanet(0);

  // Wire global & add-planet tabs
  wireGlobalTab();
  wireAddPlanetTab();

  // Live sync every 350ms
  setInterval(editorSyncLiveValues, 350);
}

// ── HTML Template ─────────────────────────────────────────────────────────
function buildEditorHTML() {
  const opts = planetObjs.map((o,i) =>
    `<option value="${i}">${o.data.name}</option>`
  ).join('');

  const visBtns = planetObjs.map((o,i) => {
    const hex = colorIntToHex(o.data.color);
    return `<button class="ed-vis-btn active" id="ed-vis-${i}" data-idx="${i}" style="border-color:${hex}70;">
      <span class="ed-vis-dot" style="background:${hex};"></span>${o.data.name}
    </button>`;
  }).join('');

  return `
    <div id="editor-drag-handle" style="
      background:linear-gradient(90deg,rgba(0,60,130,0.90),rgba(0,30,70,0.90));
      padding:10px 14px;display:flex;align-items:center;justify-content:space-between;
      cursor:move;border-bottom:1px solid rgba(0,229,255,0.22);user-select:none;">
      <span style="font-size:12px;font-weight:700;letter-spacing:2px;color:#00e5ff;text-transform:uppercase;">
        ⚙ Planet Editor
      </span>
      <div style="display:flex;gap:10px;align-items:center;">
        <span style="font-size:10px;color:#00ff8890;letter-spacing:1px;font-family:monospace;">● LIVE</span>
        <button id="editor-close-btn" style="
          background:rgba(255,51,102,0.15);border:1px solid rgba(255,51,102,0.45);
          color:#ff3366;border-radius:5px;width:24px;height:24px;cursor:pointer;
          font-size:14px;display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>
      </div>
    </div>

    <div style="display:flex;gap:2px;padding:8px 10px 0;
      background:rgba(0,10,30,0.6);border-bottom:1px solid rgba(0,229,255,0.12);">
      <button class="ed-tab active" data-tab="per-planet">Per Planet</button>
      <button class="ed-tab" data-tab="global">Global Sim</button>
      <button class="ed-tab" data-tab="add-planet">+ Tambah</button>
    </div>

    <div id="editor-body">

      <!-- TAB: Per Planet -->
      <div id="tab-per-planet" class="ed-tab-content">
        <div class="ed-row">
          <label class="ed-label">Pilih Planet</label>
          <select id="ed-planet-select" class="ed-select">${opts}</select>
        </div>
        <div id="ed-planet-controls"></div>
      </div>

      <!-- TAB: Global Sim -->
      <div id="tab-global" class="ed-tab-content" style="display:none;">
        <div class="ed-section-title">Gravitasi & Fisika</div>
        <div class="ed-row">
          <label class="ed-label">GM — Konstanta Gravitasi <span style="color:#ffffff35;font-size:9px;">(default 1000)</span></label>
          <div class="ed-slider-wrap">
            <input type="range" class="ed-slider" id="ed-gm" min="100" max="5000" step="50" value="1000">
            <span class="ed-val" id="ed-gm-val">1000</span>
          </div>
          <div style="font-size:9px;color:#ffffff30;margin-top:3px;">Mengubah |a&#x20D7;| = GM/r² secara real-time</div>
        </div>
        <div class="ed-row">
          <label class="ed-label">Kecepatan Simulasi Global</label>
          <div class="ed-slider-wrap">
            <input type="range" class="ed-slider" id="ed-speed-global" min="0.1" max="20" step="0.1" value="1">
            <span class="ed-val" id="ed-speed-global-val">1.0×</span>
          </div>
        </div>

        <div class="ed-section-title" style="margin-top:16px;">Visibilitas Planet</div>
        <div id="ed-visibility-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
          ${visBtns}
        </div>

        <div class="ed-section-title" style="margin-top:18px;">Kontrol Simulasi</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="ed-action-btn" id="ed-vec-toggle" style="flex:1;">Vektor: OFF</button>
          <button class="ed-action-btn" id="ed-pause-toggle" style="flex:1;">&#9208; Pause</button>
        </div>
        <div style="margin-top:8px;display:flex;gap:8px;">
          <button class="ed-action-btn" id="ed-reset-all"
            style="flex:1;border-color:rgba(255,100,100,0.4);color:#ff7777;">
            &#8635; Reset Semua Planet
          </button>
          <button class="ed-action-btn" id="ed-reset-editor"
            style="flex:1;border-color:rgba(255,140,0,0.4);color:#ffaa44;">
            &#8635; Reset Editor
          </button>
        </div>
      </div>

      <!-- TAB: Tambah Planet -->
      <div id="tab-add-planet" class="ed-tab-content" style="display:none;">
        <div class="ed-section-title">Buat Planet Kustom</div>
        <div class="ed-row">
          <label class="ed-label">Nama</label>
          <input type="text" class="ed-input" id="ed-new-name" placeholder="PlanetKu" maxlength="16" value="PlanetKu">
        </div>
        <div class="ed-row">
          <label class="ed-label">Warna</label>
          <input type="color" id="ed-new-color" value="#ff88cc"
            style="width:100%;height:38px;border:1px solid rgba(0,229,255,0.25);
            border-radius:6px;cursor:pointer;background:transparent;">
        </div>
        <div class="ed-row">
          <label class="ed-label">Radius Orbit (u)</label>
          <div class="ed-slider-wrap">
            <input type="range" class="ed-slider" id="ed-new-orbitR" min="20" max="200" step="2" value="90">
            <span class="ed-val" id="ed-new-orbitR-val">90</span>
          </div>
        </div>
        <div class="ed-row">
          <label class="ed-label">Kecepatan Orbit</label>
          <div class="ed-slider-wrap">
            <input type="range" class="ed-slider" id="ed-new-speed" min="0.05" max="3" step="0.05" value="0.8">
            <span class="ed-val" id="ed-new-speed-val">0.80</span>
          </div>
        </div>
        <div class="ed-row">
          <label class="ed-label">Ukuran Planet</label>
          <div class="ed-slider-wrap">
            <input type="range" class="ed-slider" id="ed-new-size" min="0.3" max="4" step="0.1" value="1">
            <span class="ed-val" id="ed-new-size-val">1.0</span>
          </div>
        </div>
        <div class="ed-row">
          <label class="ed-label">Eksentrisitas (0 = lingkaran)</label>
          <div class="ed-slider-wrap">
            <input type="range" class="ed-slider" id="ed-new-ecc" min="0" max="0.9" step="0.01" value="0">
            <span class="ed-val" id="ed-new-ecc-val">0.00</span>
          </div>
        </div>
        <div class="ed-row">
          <label class="ed-label">Panjang Trail</label>
          <div class="ed-slider-wrap">
            <input type="range" class="ed-slider" id="ed-new-trail" min="20" max="300" step="10" value="100">
            <span class="ed-val" id="ed-new-trail-val">100</span>
          </div>
        </div>
        <button class="ed-action-btn" id="ed-add-btn" style="width:100%;margin-top:6px;">
          &#10022; Tambahkan ke Simulasi
        </button>
        <div id="ed-add-status" style="font-size:11px;color:#00ff88;margin-top:8px;
          min-height:16px;text-align:center;font-family:monospace;"></div>
        <div class="ed-section-title" style="margin-top:18px;">Planet Kustom Aktif</div>
        <div id="ed-custom-planet-list" style="margin-top:6px;">
          <div style="font-size:11px;color:#ffffff35;text-align:center;padding:10px;">Belum ada planet kustom</div>
        </div>
      </div>

    </div>
  `;
}

// ── Wire Global Tab
function wireGlobalTab() {
  // GM slider
  const gmSlider = document.getElementById('ed-gm');
  const gmValEl  = document.getElementById('ed-gm-val');
  gmSlider.addEventListener('input', () => {
    const v = parseFloat(gmSlider.value);
    window.GM = v;
    gmValEl.textContent = v;
  });

  // Global speed
  const gsSlider = document.getElementById('ed-speed-global');
  const gsValEl  = document.getElementById('ed-speed-global-val');
  gsSlider.addEventListener('input', () => {
    const v = parseFloat(gsSlider.value);
    speedMult = v;
    gsValEl.textContent = v.toFixed(1) + '×';
    document.querySelectorAll('.speed-btn').forEach(btn =>
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === v)
    );
  });

  // Visibility toggle
  document.getElementById('ed-visibility-list').addEventListener('click', e => {
    const btn = e.target.closest('.ed-vis-btn');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx);
    const obj = planetObjs[idx];
    if (!obj) return;
    setPlanetVisible(obj, !obj.visible);
    btn.classList.toggle('active', obj.visible);
  });

  // Vector toggle
  document.getElementById('ed-vec-toggle').addEventListener('click', () => {
    document.getElementById('vector-btn').click();
    setTimeout(syncGlobalButtons, 60);
  });

  // Pause toggle
  document.getElementById('ed-pause-toggle').addEventListener('click', () => {
    document.getElementById('pause-btn').click();
    setTimeout(syncGlobalButtons, 60);
  });

  // Reset all (simulasi + editor)
  document.getElementById('ed-reset-all').addEventListener('click', () => {
    document.getElementById('reset-btn').click();
    resetAllEditorSettings();
    setTimeout(syncGlobalButtons, 60);
  });

  // Reset editor only
  document.getElementById('ed-reset-editor').addEventListener('click', () => {
    resetAllEditorSettings();
  });
}

function syncGlobalButtons() {
  const v = document.getElementById('ed-vec-toggle');
  const p = document.getElementById('ed-pause-toggle');
  if (v) v.textContent = 'Vektor: ' + (showVectors ? 'ON' : 'OFF');
  if (p) p.textContent = paused ? '▶ Play' : '⏸ Pause';
}

// ── Wire Add-Planet Tab ───────────────────────────────────────────────────
function wireAddPlanetTab() {
  [
    ['ed-new-orbitR', 'ed-new-orbitR-val', v => Math.round(v)],
    ['ed-new-speed',  'ed-new-speed-val',  v => parseFloat(v).toFixed(2)],
    ['ed-new-size',   'ed-new-size-val',   v => parseFloat(v).toFixed(1)],
    ['ed-new-ecc',    'ed-new-ecc-val',    v => parseFloat(v).toFixed(2)],
    ['ed-new-trail',  'ed-new-trail-val',  v => Math.round(v)],
  ].forEach(([sId, vId, fmt]) => {
    const s = document.getElementById(sId);
    const e = document.getElementById(vId);
    if (s && e) s.addEventListener('input', () => { e.textContent = fmt(s.value); });
  });

  document.getElementById('ed-add-btn').addEventListener('click', editorAddPlanet);
}

// ── Render Per-Planet Controls ────────────────────────────────────────────
function editorSelectPlanet(idx) {
  idx = parseInt(idx);
  const obj = planetObjs[idx];
  if (!obj) return;

  const colorHex = colorIntToHex(obj.data.color);
  const rgb = hexToRgb(colorHex);
  const container = document.getElementById('ed-planet-controls');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:10px 12px;
      background:rgba(${rgb},0.09);border-radius:8px;border:1px solid rgba(${rgb},0.28);">
      <div style="width:18px;height:18px;border-radius:50%;background:${colorHex};
        box-shadow:0 0 10px ${colorHex};flex-shrink:0;"></div>
      <div>
        <div style="font-weight:700;font-size:14px;color:${colorHex};">${obj.data.name}</div>
        <div style="font-size:9px;color:#ffffff50;margin-top:2px;font-family:monospace;">
          orbit: ${obj.data.orbitR}u &nbsp;|&nbsp; e: ${obj.data.ecc.toFixed(3)} &nbsp;|&nbsp; spd: ${obj.data.speed.toFixed(3)}
        </div>
      </div>
    </div>

    <div class="ed-row">
      <label class="ed-label">Kecepatan Orbit</label>
      <div class="ed-slider-wrap">
        <input type="range" class="ed-slider" id="ed-p-speed" min="0.05" max="5" step="0.05" value="${obj.data.speed}">
        <span class="ed-val" id="ed-p-speed-val">${obj.data.speed.toFixed(2)}</span>
      </div>
    </div>

    <div class="ed-row">
      <label class="ed-label">Radius Orbit (u)</label>
      <div class="ed-slider-wrap">
        <input type="range" class="ed-slider" id="ed-p-orbitR" min="15" max="220" step="1" value="${obj.data.orbitR}">
        <span class="ed-val" id="ed-p-orbitR-val">${obj.data.orbitR} u</span>
      </div>
    </div>

    <div class="ed-row">
      <label class="ed-label">Ukuran Planet</label>
      <div class="ed-slider-wrap">
        <input type="range" class="ed-slider" id="ed-p-size" min="0.2" max="5" step="0.1" value="${obj.data.size}">
        <span class="ed-val" id="ed-p-size-val">${obj.data.size.toFixed(1)}</span>
      </div>
    </div>

    <div class="ed-row">
      <label class="ed-label">Eksentrisitas (0 = lingkaran)</label>
      <div class="ed-slider-wrap">
        <input type="range" class="ed-slider" id="ed-p-ecc" min="0" max="0.95" step="0.01" value="${obj.data.ecc}">
        <span class="ed-val" id="ed-p-ecc-val">${obj.data.ecc.toFixed(3)}</span>
      </div>
    </div>

    <div class="ed-row">
      <label class="ed-label">Panjang Trail</label>
      <div class="ed-slider-wrap">
        <input type="range" class="ed-slider" id="ed-p-trail" min="10" max="400" step="10" value="${obj.data.trailLen}">
        <span class="ed-val" id="ed-p-trail-val">${obj.data.trailLen}</span>
      </div>
    </div>

    <div class="ed-row">
      <label class="ed-label">Posisi Sudut &#952; (teleport)</label>
      <div class="ed-slider-wrap">
        <input type="range" class="ed-slider" id="ed-p-theta" min="0" max="6.28" step="0.05" value="${(obj.theta||0).toFixed(2)}">
        <span class="ed-val" id="ed-p-theta-val">${((obj.theta||0)*180/Math.PI).toFixed(0)}&#176;</span>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-top:14px;">
      <button class="ed-action-btn" id="ed-clear-trail" style="flex:1;">&#8635; Clear Trail</button>
      <button class="ed-action-btn" id="ed-focus-planet" style="flex:1;border-color:#ffd700;color:#ffd700;">&#127919; Fokus</button>
    </div>
    <div style="margin-top:8px;">
      <button class="ed-action-btn" id="ed-reset-planet"
        style="width:100%;border-color:rgba(255,140,0,0.4);color:#ffaa44;">
        &#8635; Reset Planet Ini ke Default
      </button>
    </div>

    <div style="margin-top:12px;padding:10px;background:rgba(0,229,255,0.04);border-radius:6px;
      border:1px solid rgba(0,229,255,0.12);font-family:monospace;font-size:10px;line-height:2;">
      <div id="ed-live-readout" style="color:#00e5ffaa;">Memuat...</div>
    </div>
  `;

  wirePlanetSliders(idx, obj);
}

// ── Wire Per-Planet Sliders ───────────────────────────────────────────────
function wirePlanetSliders(idx, obj) {
  // Speed
  const speedSl = document.getElementById('ed-p-speed');
  const speedVl = document.getElementById('ed-p-speed-val');
  speedSl.addEventListener('input', () => {
    const v = parseFloat(speedSl.value);
    obj.data.speed = v;
    speedVl.textContent = v.toFixed(2);
  });

  // Orbit Radius
  const orbitSl = document.getElementById('ed-p-orbitR');
  const orbitVl = document.getElementById('ed-p-orbitR-val');
  orbitSl.addEventListener('input', () => {
    const v = parseFloat(orbitSl.value);
    obj.data.orbitR = v;
    orbitVl.textContent = v.toFixed(0) + ' u';
    if (obj.orbitLine && obj.orbitLine.geometry) {
      const pts = [];
      for (let i = 0; i <= 256; i++) {
        const a = (i / 256) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * v, 0, Math.sin(a) * v));
      }
      obj.orbitLine.geometry.setFromPoints(pts);
      obj.orbitLine.geometry.attributes.position.needsUpdate = true;
    }
    obj.trailPts = [];
    const pa = obj.trail.geometry.attributes.position;
    pa.array.fill(0); pa.needsUpdate = true;
    obj.trail.geometry.setDrawRange(0, 0);
  });

  // Size
  const sizeSl = document.getElementById('ed-p-size');
  const sizeVl = document.getElementById('ed-p-size-val');
  if (!obj._origSize) obj._origSize = obj.data.size;
  sizeSl.addEventListener('input', () => {
    const v = parseFloat(sizeSl.value);
    obj.data.size = v;
    if (obj.mesh) obj.mesh.scale.setScalar(v / obj._origSize);
    sizeVl.textContent = v.toFixed(1);
  });

  // Eccentricity
  const eccSl = document.getElementById('ed-p-ecc');
  const eccVl = document.getElementById('ed-p-ecc-val');
  eccSl.addEventListener('input', () => {
    const v = parseFloat(eccSl.value);
    obj.data.ecc = v;
    eccVl.textContent = v.toFixed(3);
  });

  // Trail
  const trailSl = document.getElementById('ed-p-trail');
  const trailVl = document.getElementById('ed-p-trail-val');
  trailSl.addEventListener('input', () => {
    const v = parseInt(trailSl.value);
    obj.data.trailLen = v;
    if (obj.trailPts.length > v) obj.trailPts.length = v;
    trailVl.textContent = v;
  });

  // Theta
  const thetaSl = document.getElementById('ed-p-theta');
  const thetaVl = document.getElementById('ed-p-theta-val');
  thetaSl.addEventListener('input', () => {
    const v = parseFloat(thetaSl.value);
    obj.theta = v;
    const x = obj.data.orbitR * Math.cos(v);
    const z = obj.data.orbitR * Math.sin(v);
    if (obj.mesh) obj.mesh.position.set(x, 0, z);
    if (obj.label) obj.label.position.set(x, obj.data.size + 2, z);
    obj.trailPts = [];
    const pa = obj.trail.geometry.attributes.position;
    pa.array.fill(0); pa.needsUpdate = true;
    obj.trail.geometry.setDrawRange(0, 0);
    thetaVl.textContent = (v * 180 / Math.PI).toFixed(0) + '°';
  });

  // Clear Trail
  document.getElementById('ed-clear-trail').addEventListener('click', () => {
    obj.trailPts = []; obj.distTraveled = 0; obj.prevPos = null;
    const pa = obj.trail.geometry.attributes.position;
    pa.array.fill(0); pa.needsUpdate = true;
    obj.trail.geometry.setDrawRange(0, 0);
    showToast('↺ Trail ' + obj.data.name + ' dihapus');
  });

  // Reset planet ke default
  const resetPlanetBtn = document.getElementById('ed-reset-planet');
  if (resetPlanetBtn) {
    if (idx >= BASE_PLANETS.length) {
      resetPlanetBtn.disabled = true;
      resetPlanetBtn.style.opacity = '0.3';
      resetPlanetBtn.title = 'Planet kustom tidak memiliki data default';
    } else {
      resetPlanetBtn.addEventListener('click', () => {
        resetSinglePlanetToOriginal(idx);
        // Refresh panel agar slider kembali ke nilai asli
        editorSelectPlanet(idx);
        showToast('↺ ' + obj.data.name + ' dikembalikan ke default');
      });
    }
  }

  // Focus
  document.getElementById('ed-focus-planet').addEventListener('click', () => {
    setSelected(obj);
    showInfo(obj);
    camDist = Math.max(70, obj.data.orbitR * 1.5);
    if (obj.mesh) {
      camTheta = Math.atan2(obj.mesh.position.x, obj.mesh.position.z);
      camPhi = 0.9;
    }
    showToast('🎯 Kamera fokus ke ' + obj.data.name);
  });
}

// ── Live Readout Sync ─────────────────────────────────────────────────────
function editorSyncLiveValues() {
  if (!editorPanelOpen) return;

  // Sync speed slider from taskbar
  const gsSlider = document.getElementById('ed-speed-global');
  const gsValEl  = document.getElementById('ed-speed-global-val');
  if (gsSlider && !gsSlider.matches(':active')) {
    gsSlider.value = speedMult;
    if (gsValEl) gsValEl.textContent = speedMult.toFixed(1) + '×';
  }

  syncGlobalButtons();

  // Sync vis button states
  planetObjs.forEach((obj, i) => {
    const btn = document.getElementById('ed-vis-' + i);
    if (btn) btn.classList.toggle('active', !!obj.visible);
  });

  // Live planet readout
  const sel = document.getElementById('ed-planet-select');
  if (!sel) return;
  const obj = planetObjs[parseInt(sel.value)];
  const readout = document.getElementById('ed-live-readout');
  if (!obj || !readout) return;

  readout.innerHTML = `
    <span style="color:#ffd700;">r&#x20D7;</span>: <b style="color:#eee;">${(obj._r||0).toFixed(2)} u</b>
    &nbsp;|&nbsp;
    <span style="color:#00aaff;">|v&#x20D7;|</span>: <b style="color:#eee;">${(obj._speed||0).toFixed(3)} u/s</b><br>
    <span style="color:#ff5555;">|a&#x20D7;|</span>: <b style="color:#eee;">${(obj._a||0).toFixed(5)} u/s&#178;</b>
    &nbsp;|&nbsp;
    <span style="color:#00ff88;">&#952;</span>: <b style="color:#eee;">${((obj.theta||0)*180/Math.PI).toFixed(1)}&#176;</b><br>
    <span style="color:#aaa;">&#8747;|v&#x20D7;|dt</span>: <b style="color:#ffd700;">${(obj.distTraveled||0).toFixed(1)} u</b>
    &nbsp;|&nbsp;
    <span style="color:#aaa;">GM</span>: <b style="color:#eee;">${window.GM||1000}</b>
  `;
}

// ── Tab Switcher ──────────────────────────────────────────────────────────
function editorSwitchTab(tabId) {
  document.querySelectorAll('#editor-panel .ed-tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#editor-panel .ed-tab').forEach(el => el.classList.remove('active'));
  const content = document.getElementById('tab-' + tabId);
  const btn = document.querySelector(`#editor-panel .ed-tab[data-tab="${tabId}"]`);
  if (content) content.style.display = 'block';
  if (btn) btn.classList.add('active');
  if (tabId === 'add-planet') updateCustomPlanetList();
  if (tabId === 'global') syncGlobalButtons();
}

// ── Tambah Planet Baru ────────────────────────────────────────────────────
function editorAddPlanet() {
  const statusEl = document.getElementById('ed-add-status');
  const name     = (document.getElementById('ed-new-name').value.trim() || 'Planet').slice(0,16);
  const orbitR   = parseFloat(document.getElementById('ed-new-orbitR').value);
  const speed    = parseFloat(document.getElementById('ed-new-speed').value);
  const size     = parseFloat(document.getElementById('ed-new-size').value);
  const ecc      = parseFloat(document.getElementById('ed-new-ecc').value);
  const trailLen = parseInt(document.getElementById('ed-new-trail').value);
  const colorHex = document.getElementById('ed-new-color').value;
  const colorInt = parseInt(colorHex.replace('#',''), 16);

  if (typeof makePlanet !== 'function') {
    if (statusEl) statusEl.textContent = '⚠ makePlanet() tidak tersedia';
    return;
  }
  if (planetObjs.some(o => o.data.name === name && !o._editorRemoved)) {
    if (statusEl) statusEl.textContent = '⚠ Nama sudah dipakai!';
    return;
  }

  makePlanet({ name, color: colorInt, orbitR, speed, size, trailLen, ecc });

  const sel = document.getElementById('ed-planet-select');
  if (sel) {
    const opt = document.createElement('option');
    opt.value = planetObjs.length - 1;
    opt.textContent = name;
    sel.appendChild(opt);
    sel.value = planetObjs.length - 1;
    editorSelectPlanet(planetObjs.length - 1);
  }

  const visList = document.getElementById('ed-visibility-list');
  if (visList) {
    const newIdx = planetObjs.length - 1;
    const btn = document.createElement('button');
    btn.className = 'ed-vis-btn active';
    btn.id = 'ed-vis-' + newIdx;
    btn.dataset.idx = newIdx;
    btn.style.borderColor = colorHex + '70';
    btn.innerHTML = `<span class="ed-vis-dot" style="background:${colorHex};"></span>${name}`;
    visList.appendChild(btn);
  }

  updateCustomPlanetList();
  if (statusEl) {
    statusEl.textContent = `✦ ${name} berhasil ditambahkan!`;
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
  }
  showToast(`✦ Planet "${name}" masuk ke orbit!`);
}

// ── Custom Planet List ────────────────────────────────────────────────────
function updateCustomPlanetList() {
  const list = document.getElementById('ed-custom-planet-list');
  if (!list) return;
  const baseCnt = BASE_PLANETS.length;
  const customs = planetObjs.slice(baseCnt).filter(o => !o._editorRemoved);

  if (customs.length === 0) {
    list.innerHTML = '<div style="font-size:11px;color:#ffffff35;text-align:center;padding:10px;">Belum ada planet kustom</div>';
    return;
  }

  list.innerHTML = customs.map((obj, i) => {
    const realIdx = baseCnt + i;
    const hex = colorIntToHex(obj.data.color);
    const rgb = hexToRgb(hex);
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:7px 10px;background:rgba(${rgb},0.07);border-radius:7px;margin-bottom:5px;
        border:1px solid rgba(${rgb},0.22);">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:10px;height:10px;border-radius:50%;background:${hex};box-shadow:0 0 6px ${hex};"></div>
          <span style="font-size:12px;font-weight:600;color:${hex};">${obj.data.name}</span>
          <span style="font-size:9px;color:#ffffff40;font-family:monospace;">r=${obj.data.orbitR}u</span>
        </div>
        <button data-remove="${realIdx}"
          style="background:rgba(255,51,102,0.1);border:1px solid rgba(255,51,102,0.3);
          color:#ff3366;border-radius:4px;padding:2px 9px;cursor:pointer;font-size:11px;">&#10005;</button>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => editorRemoveCustomPlanet(parseInt(btn.dataset.remove)));
  });
}

function editorRemoveCustomPlanet(idx) {
  const obj = planetObjs[idx];
  if (!obj) return;
  obj._editorRemoved = true; obj.visible = false;
  if (obj.mesh)      obj.mesh.visible = false;
  if (obj.label)     obj.label.visible = false;
  if (obj.orbitLine) obj.orbitLine.visible = false;
  if (obj.trail)     obj.trail.visible = false;
  if (obj.vecGroup)  obj.vecGroup.visible = false;
  const sel = document.getElementById('ed-planet-select');
  if (sel) {
    const opt = sel.querySelector(`option[value="${idx}"]`);
    if (opt) opt.remove();
    const remaining = parseInt(sel.value);
    if (!isNaN(remaining) && planetObjs[remaining]) editorSelectPlanet(remaining);
  }
  showToast(`Planet "${obj.data.name}" dihapus`);
  updateCustomPlanetList();
}

// ── Draggable Panel ───────────────────────────────────────────────────────
function makeDraggable(panel, handle) {
  let mx = 0, my = 0;
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    mx = e.clientX; my = e.clientY;
    const rect = panel.getBoundingClientRect();
    panel.style.transform = 'none';
    panel.style.left = rect.left + 'px';
    panel.style.top  = rect.top  + 'px';
    function onDrag(e) {
      panel.style.left = (panel.offsetLeft + e.clientX - mx) + 'px';
      panel.style.top  = (panel.offsetTop  + e.clientY - my) + 'px';
      mx = e.clientX; my = e.clientY;
    }
    function stopDrag() {
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
    }
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  });
}

// ── CSS ───────────────────────────────────────────────────────────────────
function injectEditorStyles() {
  if (document.getElementById('editor-styles')) return;
  const s = document.createElement('style');
  s.id = 'editor-styles';
  s.textContent = `
    #editor-body {
      overflow-y:auto;
      max-height:calc(84vh - 108px);
      padding:14px;
    }
    #editor-body::-webkit-scrollbar{width:4px}
    #editor-body::-webkit-scrollbar-track{background:transparent}
    #editor-body::-webkit-scrollbar-thumb{background:rgba(0,229,255,0.25);border-radius:2px}

    .ed-tab{
      background:rgba(0,229,255,0.04);
      border:1px solid rgba(0,229,255,0.15);
      color:#ffffff55;
      padding:5px 14px;
      border-radius:5px 5px 0 0;
      cursor:pointer;
      font-size:11px;font-weight:600;letter-spacing:0.8px;
      border-bottom:none;transition:all 0.15s;
      font-family:var(--font-ui,sans-serif);
    }
    .ed-tab:hover{color:#00e5ff;background:rgba(0,229,255,0.08)}
    .ed-tab.active{background:rgba(0,229,255,0.13);color:#00e5ff;border-color:rgba(0,229,255,0.4)}

    .ed-label{
      display:block;font-size:10px;letter-spacing:0.8px;
      text-transform:uppercase;color:#ffffff60;margin-bottom:6px;
    }
    .ed-row{margin-bottom:13px}
    .ed-slider-wrap{display:flex;align-items:center;gap:10px}
    .ed-slider{
      flex:1;height:4px;-webkit-appearance:none;appearance:none;
      background:rgba(0,229,255,0.18);border-radius:2px;outline:none;cursor:pointer;
    }
    .ed-slider::-webkit-slider-thumb{
      -webkit-appearance:none;width:15px;height:15px;border-radius:50%;
      background:#00e5ff;box-shadow:0 0 8px rgba(0,229,255,0.8);
      cursor:pointer;transition:box-shadow 0.15s;
    }
    .ed-slider::-webkit-slider-thumb:hover{box-shadow:0 0 16px rgba(0,229,255,1)}
    .ed-val{font-family:monospace;font-size:11px;color:#00e5ff;min-width:48px;text-align:right}
    .ed-section-title{
      font-size:9.5px;letter-spacing:1.8px;text-transform:uppercase;
      color:#ffffff35;border-bottom:1px solid rgba(255,255,255,0.06);
      padding-bottom:6px;margin-bottom:12px;
    }
    .ed-select{
      width:100%;background:rgba(0,20,50,0.85);
      border:1px solid rgba(0,229,255,0.25);color:#00e5ff;
      padding:7px 10px;border-radius:6px;font-size:13px;cursor:pointer;outline:none;
    }
    .ed-select option{background:#040a18}
    .ed-input{
      width:100%;box-sizing:border-box;
      background:rgba(0,20,50,0.85);
      border:1px solid rgba(0,229,255,0.25);color:#00e5ff;
      padding:7px 10px;border-radius:6px;font-size:13px;outline:none;
    }
    .ed-input:focus{border-color:rgba(0,229,255,0.6)}
    .ed-action-btn{
      background:rgba(0,229,255,0.07);
      border:1px solid rgba(0,229,255,0.28);color:#00e5ff;
      padding:7px 14px;border-radius:6px;cursor:pointer;
      font-size:11px;font-weight:600;letter-spacing:0.6px;transition:all 0.15s;
    }
    .ed-action-btn:hover{background:rgba(0,229,255,0.18);box-shadow:0 0 12px rgba(0,229,255,0.25)}
    .ed-vis-btn{
      display:flex;align-items:center;gap:5px;
      background:rgba(0,20,50,0.6);border:1px solid rgba(255,255,255,0.1);
      color:#ffffff55;padding:4px 10px;border-radius:20px;
      cursor:pointer;font-size:11px;font-weight:600;transition:all 0.15s;
    }
    .ed-vis-btn.active{color:#fff;background:rgba(0,30,70,0.7)}
    .ed-vis-btn:not(.active){opacity:0.4}
    .ed-vis-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    #editor-close-btn:hover{background:rgba(255,51,102,0.35)!important}
  `;
  document.head.appendChild(s);
}
