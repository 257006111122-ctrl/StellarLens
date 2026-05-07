// Inisialisasi Utama
function init() {
  const canvas = document.getElementById('c');
  const W = window.innerWidth, H = window.innerHeight;

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Scene & Kamera
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000005, 0.0008);
  camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 2000);
  camera.position.set(0, 120, 200);
  camera.lookAt(0, 0, 0);

  // Raycaster untuk klik planet
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2(-999, -999);

  // Bangun scene
  makeStars();
  makeSun();
  BASE_PLANETS.forEach(p => makePlanet(p));
  makeLights();

  // Setup UI & controls
  buildPresetUI();
  setupControls();
  setupOrbitControls();

  // Init Planet Editor setelah planetObjs sudah terisi
  initEditor();

  // Event listeners global
  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);

  // Mulai loop
  requestAnimationFrame(animate);
}

init();
