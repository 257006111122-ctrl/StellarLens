// ── Build Preset Cards ────────────────────────────────────────────────────
function buildPresetUI() {
  const grid = document.getElementById('preset-grid');
  PRESETS.forEach(preset => {
    const card = document.createElement('div');
    card.className = 'preset-card' + (preset.id === 'default' ? ' active-preset' : '');
    card.id = 'preset-' + preset.id;
    card.innerHTML = `
      <h5>${preset.name}</h5>
      <p>${preset.desc}</p>
      <span class="preset-tag" style="background:${preset.tagColor}20;color:${preset.tagColor};border:0.5px solid ${preset.tagColor}50">${preset.tag}</span>
      <p class="preset-note">${preset.note}</p>`;
    card.addEventListener('click', () => applyPreset(preset));
    grid.appendChild(card);
  });
}

// ── Apply Preset ──────────────────────────────────────────────────────────
function applyPreset(preset) {
  planetObjs.forEach(obj => {
    obj.theta = Math.random() * Math.PI * 2;
    obj.trailPts = []; obj.distTraveled = 0; obj.prevPos = null;
    const pa = obj.trail.geometry.attributes.position;
    pa.array.fill(0); pa.needsUpdate = true;
    obj.trail.geometry.setDrawRange(0, 0);
  });

  speedMult = preset.speedMult;
  // Update speed buttons
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.remove('active');
    if (parseFloat(btn.dataset.speed) === preset.speedMult) {
      btn.classList.add('active');
    }
  });
  camPhi = preset.camPhi; camDist = preset.camDist;

  if (preset.visibleOnly) {
    planetObjs.forEach(obj => setPlanetVisible(obj, preset.visibleOnly.includes(obj.data.name)));
  } else {
    planetObjs.forEach(obj => setPlanetVisible(obj, true));
  }

  if (preset.forceVectors && !showVectors) {
    showVectors = true;
    document.getElementById('vector-btn').classList.add('active');
    document.getElementById('vec-legend').style.display = 'flex';
  }

  if (preset.highlight) {
    const hObj = planetObjs.find(o => o.data.name === preset.highlight);
    if (hObj && hObj.visible) { setSelected(hObj); showInfo(hObj); }
  } else {
    selectedPlanet = null;
    document.getElementById('info-panel').classList.remove('show');
    document.querySelectorAll('.leg-row').forEach(r => r.classList.remove('active-planet'));
  }

  paused = false;
  document.getElementById('pause-btn').textContent = '⏸';
  document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active-preset'));
  const pc = document.getElementById('preset-' + preset.id);
  if (pc) pc.classList.add('active-preset');

  const badge = document.getElementById('active-scenario');
  badge.textContent = 'Skenario: ' + preset.name;
  badge.classList.add('show');

  scenarioPanelOpen = false;
  document.getElementById('scenario-panel').classList.remove('show');
  // Update taskbar button state
  const scenarioBtn = document.querySelector('.app-btn[data-panel="scenario-panel"]');
  if (scenarioBtn) scenarioBtn.classList.remove('active');
  showToast('🚀 Skenario "' + preset.name + '" aktif');
}

// ── Toggle Visibilitas Planet ─────────────────────────────────────────────
function setPlanetVisible(obj, v) {
  obj.visible = v;
  obj.mesh.visible = v; obj.label.visible = v;
  obj.orbitLine.visible = v; obj.trail.visible = v;
  obj.vecGroup.visible = v && showVectors;
  const row = document.getElementById('leg-' + obj.data.name);
  if (row) row.style.opacity = v ? '1' : '0.3';
}

// ── Toast Notifikasi ──────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerHTML = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ── Pilih Planet Aktif ────────────────────────────────────────────────────
function setSelected(obj) {
  selectedPlanet = obj;
  document.querySelectorAll('.leg-row').forEach(r => r.classList.remove('active-planet'));
  const row = document.getElementById('leg-' + obj.data.name);
  if (row) row.classList.add('active-planet');
}

// ── Update Info Panel ─────────────────────────────────────────────────────
function showInfo(obj) {
  document.getElementById('info-panel').classList.add('show');
  document.getElementById('planet-name').textContent = obj.data.name;
  document.getElementById('i-r').textContent   = (obj._r     || 0).toFixed(2) + ' u';
  document.getElementById('i-x').textContent   = (obj._x     || 0).toFixed(2);
  document.getElementById('i-z').textContent   = (obj._z     || 0).toFixed(2);
  document.getElementById('i-v').textContent   = (obj._speed || 0).toFixed(3) + ' u/s';
  document.getElementById('i-vxy').textContent = `${(obj._vx || 0).toFixed(2)}, ${(obj._vz || 0).toFixed(2)}`;
  document.getElementById('i-a').textContent   = (obj._a     || 0).toFixed(5) + ' u/s²';
  document.getElementById('i-s').textContent   = (obj.distTraveled || 0).toFixed(1) + ' u';
  document.getElementById('i-orbitr').textContent = obj.data.orbitR + ' u';
  document.getElementById('i-omega').textContent  = (obj.data.speed * 0.5).toFixed(3) + ' rad/s';
  document.getElementById('i-ecc').textContent    = obj.data.ecc.toFixed(3);
}

// ── Reset Simulasi ────────────────────────────────────────────────────────
function resetSimulation() {
  planetObjs.forEach(obj => {
    obj.theta = Math.random() * Math.PI * 2;
    obj.trailPts = []; obj.distTraveled = 0; obj.prevPos = null;
    obj._r = obj.data.orbitR; obj._speed = 0; obj._a = 0;
    obj._vx = 0; obj._vz = 0; obj._x = 0; obj._z = 0;
    const pa = obj.trail.geometry.attributes.position;
    pa.array.fill(0); pa.needsUpdate = true;
    obj.trail.geometry.setDrawRange(0, 0);
    setPlanetVisible(obj, true);
  });

  speedMult = 1; paused = false;
  // Reset speed buttons to 1x
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.speed === '1') {
      btn.classList.add('active');
    }
  });
  document.getElementById('pause-btn').textContent = '⏸';
  document.getElementById('pause-btn').title = 'Pause';

  camTheta = 0.5; camPhi = 1.0; camDist = 220;
  selectedPlanet = null;
  currentYear = 0; // Reset year counter
  document.getElementById('current-year').textContent = '0';

  document.getElementById('info-panel').classList.remove('show');
  document.querySelectorAll('.leg-row').forEach(r => r.classList.remove('active-planet'));
  document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active-preset'));
  const dc = document.getElementById('preset-default');
  if (dc) dc.classList.add('active-preset');
  document.getElementById('active-scenario').classList.remove('show');

  if (showVectors) {
    showVectors = false;
    document.getElementById('vector-btn').classList.remove('active');
    document.getElementById('vec-legend').style.display = 'none';
    planetObjs.forEach(o => o.vecGroup.visible = false);
  }
  
  // Reset window states
  document.querySelectorAll('.window').forEach(window => {
    window.classList.remove('minimized');
    const minimizeBtn = window.querySelector('.minimize-btn');
    if (minimizeBtn) {
      minimizeBtn.textContent = '—';
      minimizeBtn.title = 'Minimize';
    }
  });
  
  // Reset taskbar buttons
  document.querySelectorAll('.app-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  showToast('↺ Simulasi direset ke kondisi awal');
}

// ── Setup Event Controls ──────────────────────────────────────────────────
function setupControls() {
  // Speed buttons
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const speed = parseFloat(e.target.dataset.speed);
      speedMult = speed;
      
      // Update active button
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
  });

  // Pause/Play button
  document.getElementById('pause-btn').addEventListener('click', () => {
    paused = !paused;
    document.getElementById('pause-btn').textContent = paused ? '▶' : '⏸';
    document.getElementById('pause-btn').title = paused ? 'Play' : 'Pause';
  });

  // Vector toggle button
  document.getElementById('vector-btn').addEventListener('click', () => {
    showVectors = !showVectors;
    document.getElementById('vector-btn').classList.toggle('active', showVectors);
    document.getElementById('vec-legend').style.display = showVectors ? 'flex' : 'none';
    if (!showVectors) planetObjs.forEach(o => o.vecGroup.visible = false);
  });

  // Reset button
  document.getElementById('reset-btn').addEventListener('click', resetSimulation);

  // Window minimize buttons
  document.querySelectorAll('.minimize-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const panelId = e.target.dataset.panel;
      const panel = document.getElementById(panelId);
      const isMinimized = panel.classList.contains('minimized');
      
      if (isMinimized) {
        panel.classList.remove('minimized');
        e.target.textContent = '—';
        e.target.title = 'Minimize';
      } else {
        panel.classList.add('minimized');
        e.target.textContent = '□';
        e.target.title = 'Maximize';
      }
      
      // Update taskbar button state
      const taskbarBtn = document.querySelector(`.app-btn[data-panel="${panelId}"]`);
      if (taskbarBtn) {
        taskbarBtn.classList.toggle('active', !isMinimized);
      }
    });
  });

  // Taskbar app buttons
  document.querySelectorAll('.app-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const panelId = e.target.dataset.panel;
      const panel = document.getElementById(panelId);
      
      if (panelId === 'scenario-panel') {
        // Special handling for scenario panel - toggle visibility
        scenarioPanelOpen = !scenarioPanelOpen;
        panel.classList.toggle('show', scenarioPanelOpen);
        e.target.classList.toggle('active', scenarioPanelOpen);
        return;
      }
      
      const isMinimized = panel.classList.contains('minimized');
      
      if (isMinimized) {
        // Maximize the panel
        panel.classList.remove('minimized');
        const minimizeBtn = panel.querySelector('.minimize-btn');
        if (minimizeBtn) {
          minimizeBtn.textContent = '—';
          minimizeBtn.title = 'Minimize';
        }
        e.target.classList.add('active');
      } else {
        // Minimize the panel
        panel.classList.add('minimized');
        const minimizeBtn = panel.querySelector('.minimize-btn');
        if (minimizeBtn) {
          minimizeBtn.textContent = '□';
          minimizeBtn.title = 'Maximize';
        }
        e.target.classList.remove('active');
      }
    });
  });

  // Start menu button (placeholder)
  document.querySelector('.start-btn').addEventListener('click', () => {
    showToast('🚀 Start Menu - Coming Soon!');
  });

  // Canvas click to close panels
  document.getElementById('c').addEventListener('click', () => {
    // Close scenario panel if open
    if (scenarioPanelOpen) {
      scenarioPanelOpen = false;
      document.getElementById('scenario-panel').classList.remove('show');
    }
  });
}

// ── Mouse Events ──────────────────────────────────────────────────────────
function onMouseMove(e) {
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

function onClick(e) {
  raycaster.setFromCamera(mouse, camera);
  const vis  = planetObjs.filter(o => o.visible).map(o => o.mesh);
  const hits = raycaster.intersectObjects(vis);
  if (hits.length) {
    const obj = planetObjs.find(o => o.mesh === hits[0].object);
    if (obj) { setSelected(obj); showInfo(obj); }
  }
}

function onResize() {
  const W = window.innerWidth, H = window.innerHeight;
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
}
