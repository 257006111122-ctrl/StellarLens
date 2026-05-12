// (Fisika dan perhitungan vektor)
function updateArrow(vo, origin, dir, len) {
  const l = Math.max(len, 0.5);
  vo.arrow.position.copy(origin);
  vo.arrow.setLength(l, Math.min(1.2, l * 0.2), Math.min(0.7, l * 0.12));
  vo.arrow.setDirection(dir.clone().normalize());
}

// Loop Animasi Utama
function animate(ts) {
  requestAnimationFrame(animate);
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (!paused) {
    sunGlow.rotation.y += dt * 0.2;

    planetObjs.forEach(obj => {
      if (!obj.visible) return;
      const p = obj.data;

      // ── Posisi r⃗(t) = r·cos(ωt), r·sin(ωt)
      obj.theta += p.speed * dt * speedMult * 0.5;
      const x = p.orbitR * Math.cos(obj.theta);
      const z = p.orbitR * Math.sin(obj.theta);

      obj.mesh.position.set(x, 0, z);
      obj.mesh.rotation.y += dt * 2;
      obj.label.position.set(x, p.size + 2, z);

      // Trail
      obj.trailPts.unshift(new THREE.Vector3(x, 0, z));
      if (obj.trailPts.length > p.trailLen) obj.trailPts.pop();
      const pa = obj.trail.geometry.attributes.position;
      const fade = obj.trailPts.length;
      for (let i = 0; i < fade; i++) {
        const pt = obj.trailPts[i] || obj.trailPts[fade - 1];
        pa.array[i * 3] = pt.x; pa.array[i * 3 + 1] = pt.y; pa.array[i * 3 + 2] = pt.z;
      }
      pa.needsUpdate = true;
      obj.trail.geometry.setDrawRange(0, fade);

      // ── Kecepatan v⃗ = dr⃗/dt
      const rV = new THREE.Vector3(x, 0, z);
      const r = rV.length();
      const vx = -p.orbitR * p.speed * Math.sin(obj.theta) * 0.5;
      const vz =  p.orbitR * p.speed * Math.cos(obj.theta) * 0.5;
      const speed = Math.sqrt(vx * vx + vz * vz);

      // ── Percepatan a⃗ = GM/r² (Hukum Gravitasi Newton) ───────────────
      const aAbs = (window.GM || GM) / (r * r) * 0.1;

      obj._r = r; obj._speed = speed; obj._a = aAbs;
      obj._vx = vx; obj._vz = vz; obj._x = x; obj._z = z;

      // Vektor visual
      obj.vecGroup.visible = showVectors;
      if (showVectors) {
        updateArrow(obj.rVec, new THREE.Vector3(0, 0, 0), rV, r * 0.085);
        updateArrow(obj.vVec, new THREE.Vector3(x, 0, z),
          new THREE.Vector3(-Math.sin(obj.theta), 0, Math.cos(obj.theta)), speed * 0.65);
        updateArrow(obj.aVec, new THREE.Vector3(x, 0, z),
          rV.clone().negate().normalize(), aAbs * 9);
      }

      // ── Jarak Tempuh s = ∫|v⃗|dt
      if (obj.prevPos) obj.distTraveled += new THREE.Vector3(x, 0, z).distanceTo(obj.prevPos);
      obj.prevPos = new THREE.Vector3(x, 0, z);
    });

    // Update year counter based on Earth's orbit
    const earth = planetObjs.find(obj => obj.data.name === 'Bumi');
    if (earth) {
      const prevTheta = earth.theta - (earth.data.speed * dt * speedMult * 0.5);
      if (prevTheta % (Math.PI * 2) > earth.theta % (Math.PI * 2)) {
        // Earth completed a full orbit 
        currentYear++;
        document.getElementById('current-year').textContent = currentYear;
      }
    }

    if (selectedPlanet && selectedPlanet.visible) showInfo(selectedPlanet);
  }

  updateCamera();
  renderer.render(scene, camera);
}
