// ── Orbit Controls (drag + scroll) ───────────────────────────────────────
function setupOrbitControls() {
  const cv = document.getElementById('c');

  cv.addEventListener('mousedown', e => {
    isDragging = true; lastMX = e.clientX; lastMY = e.clientY;
  });
  window.addEventListener('mouseup', () => isDragging = false);
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    camTheta -= (e.clientX - lastMX) * 0.005;
    camPhi = Math.max(0.04, Math.min(Math.PI / 2 - 0.02, camPhi + (e.clientY - lastMY) * 0.005));
    lastMX = e.clientX; lastMY = e.clientY;
  });
  cv.addEventListener('wheel', e => {
    camDist = Math.max(50, Math.min(600, camDist + e.deltaY * 0.3));
    e.preventDefault();
  }, { passive: false });
}

// ── Update Posisi Kamera (Spherical Coordinates) ──────────────────────────
// x = d·sin(φ)·sin(θ)
// y = d·cos(φ)
// z = d·sin(φ)·cos(θ)
function updateCamera() {
  camera.position.x = camDist * Math.sin(camPhi) * Math.sin(camTheta);
  camera.position.y = camDist * Math.cos(camPhi);
  camera.position.z = camDist * Math.sin(camPhi) * Math.cos(camTheta);
  camera.lookAt(0, 0, 0);
}
