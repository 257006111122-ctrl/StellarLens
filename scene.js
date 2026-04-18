// ── Bintang Latar ────────────────────────────────────────────────────────
function makeStars() {
  const geo = new THREE.BufferGeometry();
  const n = 3000, pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() - 0.5) * 2000;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.5, sizeAttenuation: true
  })));
}

// ── Matahari ─────────────────────────────────────────────────────────────
function makeSun() {
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(8, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffee00 })
  ));
  sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.18, side: THREE.BackSide })
  );
  scene.add(sunGlow);
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(12, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.06, side: THREE.BackSide })
  ));
}

// ── Pencahayaan ───────────────────────────────────────────────────────────
function makeLights() {
  scene.add(new THREE.AmbientLight(0x111133, 0.3));
  const sl = new THREE.PointLight(0xfff5e0, 1.75, 400);
  sl.castShadow = true; scene.add(sl);
  const fl = new THREE.DirectionalLight(0x2244aa, 0.17);
  fl.position.set(-200, 100, -100); scene.add(fl);
  const rl = new THREE.DirectionalLight(0x5588cc, 0.14);
  rl.position.set(100, -50, 200); scene.add(rl);
}

// ── Planet ────────────────────────────────────────────────────────────────
function makePlanet(pdata) {
  const theta0 = Math.random() * Math.PI * 2;
  const r = pdata.orbitR;

  // Garis orbit
  const opts = [];
  for (let i = 0; i <= 256; i++) {
    const a = i / 256 * Math.PI * 2;
    opts.push(r * Math.cos(a), 0, r * Math.sin(a));
  }
  const og = new THREE.BufferGeometry();
  og.setAttribute('position', new THREE.BufferAttribute(new Float32Array(opts), 3));
  const orbitLine = new THREE.Line(og, new THREE.LineBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.08
  }));
  scene.add(orbitLine);

  // Mesh planet
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(pdata.size, 24, 24),
    new THREE.MeshPhongMaterial({ color: pdata.color, shininess: 30, specular: 0x444444 })
  );
  mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);

  // Cincin Saturnus
  if (pdata.name === 'Saturnus') {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.5, 4.2, 48),
      new THREE.MeshBasicMaterial({ color: 0xccaa66, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = Math.PI / 3; mesh.add(ring);
  }

  // Trail ekor
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pdata.trailLen * 3), 3));
  const trail = new THREE.Line(tg, new THREE.LineBasicMaterial({
    color: pdata.color, transparent: true, opacity: 0.35
  }));
  scene.add(trail);

  // Label & vektor
  const label = makeLabel(pdata.name, pdata.color);
  const vecGroup = new THREE.Group(); scene.add(vecGroup);
  const rVec = makeArrow(0x00ff88), vVec = makeArrow(0x00aaff), aVec = makeArrow(0xff4444);
  vecGroup.add(rVec.group, vVec.group, aVec.group);

  const obj = {
    data: pdata, mesh, label, orbitLine, trail,
    trailPts: [], theta: theta0, vecGroup, rVec, vVec, aVec,
    distTraveled: 0, prevPos: null,
    _r: r, _speed: 0, _a: 0, _vx: 0, _vz: 0, _x: 0, _z: 0,
    visible: true
  };
  planetObjs.push(obj);

  // Tambahkan ke legend UI
  const listEl = document.getElementById('planet-list');
  const row = document.createElement('div');
  row.className = 'leg-row'; row.id = 'leg-' + pdata.name;
  const hex = pdata.color.toString(16).padStart(6, '0');
  row.innerHTML = `<div class="leg-dot" style="background:#${hex}"></div><span class="leg-name">${pdata.name}</span>`;
  row.addEventListener('click', () => { if (!obj.visible) return; setSelected(obj); showInfo(obj); });
  listEl.appendChild(row);
}

// ── Arrow Helper ──────────────────────────────────────────────────────────
function makeArrow(color) {
  const dir = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, color, 0.8, 0.5
  );
  const group = new THREE.Group(); group.add(dir); return { group, arrow: dir };
}

// ── Label Sprite ──────────────────────────────────────────────────────────
function makeLabel(text, color) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillText(text, 10, 42);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(cv), depthTest: false
  }));
  sp.scale.set(12, 3, 1); scene.add(sp); return sp;
}
