import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ASSETS } from './assets.js';
import { GameEngine } from './game/GameEngine.js';
import './style.css';

const byId = (id) => document.getElementById(id);
const viewport = byId('viewport');
const loadingOverlay = byId('loading-overlay');
const errorOverlay = byId('error-overlay');
const progressBar = byId('progress-bar');
const progressPercent = byId('progress-percent');
const loadingDetail = byId('loading-detail');
const statusText = byId('load-status');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07101c);
scene.fog = new THREE.Fog(0x07101c, 90, 260);
const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1500);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = false;
renderer.domElement.id = 'nexus-canvas';
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.screenSpacePanning = true;
controls.minDistance = 0.15;
controls.maxDistance = 320;
controls.maxPolarAngle = Math.PI * 0.495;

const hemiLight = new THREE.HemisphereLight(0xd7f4ff, 0x182433, 1.65);
scene.add(hemiLight);
const keyLight = new THREE.DirectionalLight(0xe8f5ff, 2.1);
keyLight.position.set(34, 48, 24);
scene.add(keyLight);
const cyanFill = new THREE.PointLight(0x1ba9d8, 100, 90, 2);
cyanFill.position.set(0, 8, -19);
scene.add(cyanFill);
const blueFill = new THREE.PointLight(0x1764bc, 70, 100, 2);
blueFill.position.set(-17, 8, -36);
scene.add(blueFill);

const gridHelper = new THREE.GridHelper(20, 40, 0x235069, 0x142d3c);
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.34;
scene.add(gridHelper);
let axesHelper = new THREE.AxesHelper(3);
axesHelper.visible = false;
scene.add(axesHelper);

let activeAssetKey = null;
let modelRoot = null;
let originalSceneRoot = null;
let activeGltf = null;
let mixer = null;
let activeAction = null;
let currentClipIndex = 0;
let modelBounds = null;
let modelCenter = new THREE.Vector3();
let modelSize = new THREE.Vector3(1, 1, 1);
let worldRadius = 4;
let selectedObject = null;
let selectionHelper = null;
let objectEntries = [];
let activeCategory = 'ALL';
let wireframeEnabled = false;
let loadToken = 0;
let pointerDown = null;
let animationFrameId = 0;
const originalWireframe = new Map();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

const fmt = (n) => new Intl.NumberFormat('en-US').format(n);

function setStatus(label, ready = false) {
  statusText.textContent = label;
  statusText.parentElement.classList.toggle('ready', ready);
}

function showToast(message) {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('visible'), 2400);
}

function categoryForName(name = '') {
  const first = name.split('_')[0].toUpperCase();
  return ['CENTRAL', 'BHOLU', 'AIRLOCK', 'FUTURE'].includes(first) ? first : 'NEXUS';
}

function getStats(root, gltf) {
  const materials = new Set();
  const textures = new Set();
  let meshes = 0;
  let triangles = 0;
  let skinnedMeshes = 0;
  let nodes = 0;
  root.traverse((obj) => {
    nodes += 1;
    if (obj.isSkinnedMesh) skinnedMeshes += 1;
    if (!obj.isMesh) return;
    meshes += 1;
    const count = obj.geometry?.index?.count ?? obj.geometry?.attributes?.position?.count ?? 0;
    triangles += Math.floor(count / 3);
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      materials.add(mat);
      for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
    }
  });
  return { nodes, meshes, triangles, materials: materials.size, textures: textures.size, skinnedMeshes, clips: gltf.animations?.length || 0, skins: gltf.parser?.json?.skins?.length || 0 };
}

function getObjectBox(object) {
  const box = new THREE.Box3().setFromObject(object, true);
  if (box.isEmpty()) box.setFromCenterAndSize(object.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(1, 1, 1));
  return box;
}

function disposeSelectionHelper() {
  if (!selectionHelper) return;
  scene.remove(selectionHelper);
  selectionHelper.geometry?.dispose();
  selectionHelper.material?.dispose();
  selectionHelper = null;
}

function disposeModel(root) {
  if (!root) return;
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      for (const value of Object.values(mat)) if (value?.isTexture) value.dispose();
      mat.dispose();
    }
  });
}

function renderInspectorEmpty() {
  const panel = byId('inspector-content');
  panel.replaceChildren();
  const empty = document.createElement('div');
  empty.className = 'inspector-empty';
  const icon = document.createElement('span');
  icon.textContent = '＋';
  const text = document.createElement('p');
  text.textContent = 'Select an object in the viewport or Object Explorer.';
  empty.append(icon, text);
  panel.appendChild(empty);
}

function clearCurrentAsset() {
  disposeSelectionHelper();
  selectedObject = null;
  if (modelRoot) {
    scene.remove(modelRoot);
    disposeModel(modelRoot);
  }
  modelRoot = null;
  originalSceneRoot = null;
  activeGltf = null;
  mixer = null;
  activeAction = null;
  currentClipIndex = 0;
  modelBounds = null;
  objectEntries = [];
  originalWireframe.clear();
  renderObjectList();
  renderInspectorEmpty();
  byId('selection-chip').textContent = 'NO OBJECT SELECTED';
}

function updateOverview(root, gltf) {
  const stats = getStats(root, gltf);
  byId('stat-meshes').textContent = fmt(stats.meshes);
  byId('stat-triangles').textContent = fmt(stats.triangles);
  byId('stat-materials').textContent = fmt(stats.materials);
  byId('stat-animations').textContent = fmt(stats.clips);
  byId('scene-dimensions').textContent = `BOUNDS · ${modelSize.x.toFixed(2)} × ${modelSize.y.toFixed(2)} × ${modelSize.z.toFixed(2)} UNITS`;
  byId('scene-extra').textContent = `NODES · ${fmt(stats.nodes)}  /  SKINS · ${stats.skins}  /  SKINNED MESHES · ${stats.skinnedMeshes}  /  TEXTURES · ${stats.textures}`;
}

function renderObjectList() {
  const list = byId('object-list');
  const query = byId('object-search').value.trim().toLowerCase();
  const isWorld = activeAssetKey === 'world';
  byId('category-filters').classList.toggle('hidden', !isWorld);
  const filtered = objectEntries.filter((entry) => {
    const categoryMatch = !isWorld || activeCategory === 'ALL' || entry.category === activeCategory;
    const queryMatch = !query || entry.name.toLowerCase().includes(query);
    return categoryMatch && queryMatch;
  });
  const visible = filtered.slice(0, 150);
  list.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No matching scene objects.';
    list.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const entry of visible) {
    const button = document.createElement('button');
    button.className = 'object-row' + (selectedObject === entry.object ? ' selected' : '');
    button.type = 'button';
    button.title = entry.name;
    const icon = document.createElement('span');
    icon.className = `object-type ${entry.object.isMesh ? 'mesh-type' : 'group-type'}`;
    icon.textContent = entry.object.isMesh ? '◇' : '▱';
    const name = document.createElement('span');
    name.className = 'object-name';
    name.textContent = entry.name;
    const tag = document.createElement('span');
    tag.className = 'object-category';
    tag.textContent = entry.category;
    button.append(icon, name, tag);
    button.addEventListener('click', () => focusObject(entry.object));
    fragment.appendChild(button);
  }
  list.appendChild(fragment);
  if (filtered.length > visible.length) {
    const note = document.createElement('div');
    note.className = 'list-note';
    note.textContent = `Showing ${visible.length} of ${filtered.length}. Search to narrow results.`;
    list.appendChild(note);
  }
}

function buildObjectEntries(root) {
  objectEntries = [];
  root.traverse((obj) => {
    if (obj === root || (!obj.name && !obj.isMesh) || !(obj.isMesh || obj.children.length > 0)) return;
    objectEntries.push({ object: obj, name: obj.name || obj.type, category: categoryForName(obj.name || '') });
  });
  objectEntries.sort((a, b) => a.name.localeCompare(b.name));
  renderObjectList();
}

function materialNames(object) {
  const mats = Array.isArray(object.material) ? object.material : [object.material];
  return mats.filter(Boolean).map((mat) => mat.name || mat.type).join(', ') || 'Inherited / none';
}

function renderInspector(object) {
  const box = getObjectBox(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const counts = { meshes: 0, triangles: 0, skinned: 0 };
  object.traverse((child) => {
    if (child.isSkinnedMesh) counts.skinned += 1;
    if (!child.isMesh) return;
    counts.meshes += 1;
    const n = child.geometry?.index?.count ?? child.geometry?.attributes?.position?.count ?? 0;
    counts.triangles += Math.floor(n / 3);
  });
  const rows = [
    ['OBJECT', object.name || 'Unnamed'],
    ['TYPE', object.type],
    ['CATEGORY', categoryForName(object.name || '')],
    ['MESHES', fmt(counts.meshes)],
    ['TRIANGLES', fmt(counts.triangles)],
    ['SKINNED', fmt(counts.skinned)],
    ['MATERIAL', materialNames(object)],
    ['WORLD CENTER', `${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`],
    ['BOUNDS', `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}`]
  ];
  const panel = byId('inspector-content');
  panel.replaceChildren();
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.className = 'inspector-row';
    const key = document.createElement('span');
    key.textContent = label;
    const val = document.createElement('strong');
    val.textContent = value;
    val.title = value;
    row.append(key, val);
    panel.appendChild(row);
  }
}

function selectObject(object) {
  if (!object) return;
  selectedObject = object;
  disposeSelectionHelper();
  selectionHelper = new THREE.BoxHelper(object, 0x38d9ff);
  selectionHelper.material.depthTest = false;
  selectionHelper.material.transparent = true;
  selectionHelper.material.opacity = 0.95;
  scene.add(selectionHelper);
  byId('selection-chip').textContent = object.name || object.type.toUpperCase();
  renderObjectList();
  renderInspector(object);
}

function focusObject(object) {
  selectObject(object);
  const box = getObjectBox(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() * 0.8, 0.4);
  const direction = camera.position.clone().sub(controls.target).normalize();
  if (direction.length() < 0.1) direction.set(1, 0.6, 1).normalize();
  controls.target.copy(center);
  camera.position.copy(center).add(direction.multiplyScalar(Math.max(radius * 2.4, 1.2)));
  camera.near = Math.max(radius / 500, 0.005);
  camera.far = Math.max(worldRadius * 15, radius * 24, 100);
  camera.updateProjectionMatrix();
  controls.update();
  byId('view-label').textContent = 'OBJECT FOCUS';
}

function fitCurrentAsset() {
  if (!modelBounds) return;
  const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);
  const distance = maxDim * (activeAssetKey === 'world' ? 1.55 : 2.15);
  controls.target.copy(modelCenter);
  camera.position.copy(modelCenter).add(new THREE.Vector3(distance * 0.82, distance * 0.54, distance));
  camera.up.set(0, 1, 0);
  camera.near = Math.max(maxDim / 2000, 0.005);
  camera.far = Math.max(maxDim * 20, 100);
  camera.updateProjectionMatrix();
  controls.update();
  byId('view-label').textContent = 'ISOMETRIC VIEW';
  document.querySelectorAll('.preset-button').forEach((button) => button.classList.toggle('active', button.dataset.view === 'iso'));
}

function setCameraPreset(view) {
  if (!modelBounds) return;
  const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);
  const dist = maxDim * (activeAssetKey === 'world' ? 1.7 : 2.7);
  const offsets = {
    iso: new THREE.Vector3(dist * 0.82, dist * 0.54, dist),
    front: new THREE.Vector3(0, maxDim * 0.2, dist),
    back: new THREE.Vector3(0, maxDim * 0.2, -dist),
    left: new THREE.Vector3(-dist, maxDim * 0.2, 0),
    right: new THREE.Vector3(dist, maxDim * 0.2, 0),
    top: new THREE.Vector3(0.001, dist, 0.001)
  };
  controls.target.copy(modelCenter);
  camera.position.copy(modelCenter).add(offsets[view] || offsets.iso);
  camera.up.set(0, 1, 0);
  camera.near = Math.max(maxDim / 2000, 0.005);
  camera.far = Math.max(maxDim * 20, 100);
  camera.updateProjectionMatrix();
  controls.update();
  byId('view-label').textContent = `${view.toUpperCase()} VIEW`;
  document.querySelectorAll('.preset-button').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
}

function setWireframe(enabled) {
  wireframeEnabled = enabled;
  if (!modelRoot) return;
  modelRoot.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!originalWireframe.has(mat)) originalWireframe.set(mat, mat.wireframe);
      mat.wireframe = enabled;
      mat.needsUpdate = true;
    }
  });
}

function setupAnimationUI(gltf) {
  const clips = gltf.animations || [];
  const empty = byId('animation-empty');
  const controlsPanel = byId('animation-controls');
  const select = byId('clip-select');
  select.replaceChildren();
  if (!clips.length) {
    empty.classList.remove('hidden');
    controlsPanel.classList.add('hidden');
    empty.textContent = 'STATIC MODEL · This GLB has no embedded animation clips or skeletal skin. Geometry is viewable, but character motion requires rigging/retargeting or a separate animation asset.';
    byId('play-btn').textContent = '▶ PLAY';
    return;
  }
  empty.classList.add('hidden');
  controlsPanel.classList.remove('hidden');
  mixer = new THREE.AnimationMixer(gltf.scene);
  clips.forEach((clip, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${clip.name || `Animation ${index + 1}`} · ${clip.duration.toFixed(2)}s`;
    select.appendChild(option);
  });
  currentClipIndex = 0;
  select.value = '0';
  byId('animation-meta').textContent = `CLIPS · ${clips.length}  /  JOINT CHANNELS · ${gltf.parser?.json?.animations?.[0]?.channels?.length ?? '—'}  /  DURATION · ${clips[0].duration.toFixed(2)}s`;
  const first = mixer.clipAction(clips[0]);
  first.reset();
  first.setLoop(THREE.LoopRepeat, Infinity);
  first.play();
  activeAction = first;
  byId('play-btn').textContent = 'Ⅱ PAUSE';
}

function playSelectedClip() {
  if (!mixer || !activeGltf?.animations?.length) return;
  if (activeAction?.isRunning()) {
    activeAction.paused = true;
    byId('play-btn').textContent = '▶ PLAY';
    return;
  }
  if (!activeAction) {
    const clip = activeGltf.animations[currentClipIndex];
    activeAction = mixer.clipAction(clip);
    activeAction.reset().setLoop(THREE.LoopRepeat, Infinity).play();
  } else {
    activeAction.paused = false;
    if (!activeAction.isRunning()) activeAction.play();
  }
  mixer.timeScale = Number(byId('speed-select').value || 1);
  byId('play-btn').textContent = 'Ⅱ PAUSE';
}

function stopSelectedClip() {
  if (!mixer) return;
  mixer.stopAllAction();
  activeAction = null;
  byId('play-btn').textContent = '▶ PLAY';
}

function switchClip(index) {
  if (!mixer || !activeGltf?.animations?.[index]) return;
  mixer.stopAllAction();
  currentClipIndex = index;
  const clip = activeGltf.animations[index];
  activeAction = mixer.clipAction(clip);
  activeAction.reset().setLoop(THREE.LoopRepeat, Infinity).play();
  mixer.timeScale = Number(byId('speed-select').value || 1);
  byId('play-btn').textContent = 'Ⅱ PAUSE';
  byId('animation-meta').textContent = `CLIPS · ${activeGltf.animations.length}  /  DURATION · ${clip.duration.toFixed(2)}s`;
}

function prepareModel(gltf, asset) {
  const gltfScene = gltf.scene;
  gltfScene.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(gltfScene, true);
  if (rawBox.isEmpty()) throw new Error('The loaded GLB has no visible geometry.');

  const wrapper = new THREE.Group();
  wrapper.name = asset.kind === 'environment' ? 'NEXUS_WORLD_ROOT' : `${asset.title.replaceAll(' ', '_')}_ROOT`;
  wrapper.add(gltfScene);

  if (asset.normalize) {
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const rawCenter = rawBox.getCenter(new THREE.Vector3());
    const height = Math.max(rawSize.y, 0.0001);
    const scale = (asset.targetHeight || 2.1) / height;
    gltfScene.scale.setScalar(scale);
    gltfScene.position.x -= rawCenter.x * scale;
    gltfScene.position.y -= rawBox.min.y * scale;
    gltfScene.position.z -= rawCenter.z * scale;
  }

  wrapper.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(wrapper, true);
  return { wrapper, bounds };
}

async function loadAsset(assetKey) {
  const asset = ASSETS[assetKey];
  if (!asset) return;
  const token = ++loadToken;
  activeAssetKey = assetKey;
  document.querySelectorAll('.asset-card').forEach((button) => button.classList.toggle('active', button.dataset.asset === assetKey));
  byId('scene-title').textContent = asset.title.toUpperCase();
  byId('scene-subtitle').textContent = asset.subtitle;
  byId('loading-title').textContent = `LOADING ${asset.title.toUpperCase()}`;
  byId('asset-kind-chip').textContent = `${asset.kind.toUpperCase()} · GLB`;
  byId('loading-detail').textContent = 'Loading embedded geometry, materials and textures…';
  byId('progress-bar').style.width = '0%';
  byId('progress-percent').textContent = '0%';
  errorOverlay.classList.add('hidden');
  loadingOverlay.classList.remove('hidden');
  setStatus('LOADING GLB');
  clearCurrentAsset();

  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync(asset.url, (event) => {
      if (token !== loadToken) return;
      if (event.total > 0) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
      }
      loadingDetail.textContent = `DOWNLOADING · ${(event.loaded / 1024 / 1024).toFixed(1)} MB`;
    });
    if (token !== loadToken) {
      disposeModel(gltf.scene);
      return;
    }
    activeGltf = gltf;
    originalSceneRoot = gltf.scene;
    const prepared = prepareModel(gltf, asset);
    modelRoot = prepared.wrapper;
    modelRoot.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.frustumCulled = true;
      obj.castShadow = false;
      obj.receiveShadow = false;
    });
    scene.add(modelRoot);
    modelBounds = prepared.bounds;
    modelBounds.getCenter(modelCenter);
    modelBounds.getSize(modelSize);
    worldRadius = modelSize.length() * 0.5;

    const gridSize = Math.max(modelSize.x, modelSize.z, 5) * (asset.kind === 'environment' ? 1.25 : 2.8);
    scene.remove(gridHelper);
    gridHelper.geometry.dispose();
    const newGrid = new THREE.GridHelper(gridSize, asset.kind === 'environment' ? 55 : 28, 0x235069, 0x142d3c);
    newGrid.material.transparent = true;
    newGrid.material.opacity = 0.32;
    newGrid.position.set(modelCenter.x, modelBounds.min.y - 0.015, modelCenter.z);
    gridHelper.geometry = newGrid.geometry;
    gridHelper.material = newGrid.material;
    gridHelper.position.copy(newGrid.position);
    scene.add(gridHelper);
    scene.remove(axesHelper);
    axesHelper.geometry?.dispose();
    axesHelper = new THREE.AxesHelper(Math.max(1.5, Math.min(modelSize.x, modelSize.y, modelSize.z) * 0.22));
    axesHelper.position.set(modelBounds.min.x, modelBounds.min.y, modelBounds.min.z);
    axesHelper.visible = byId('axes-toggle').checked;
    scene.add(axesHelper);

    updateOverview(modelRoot, gltf);
    buildObjectEntries(modelRoot);
    setupAnimationUI(gltf);
    fitCurrentAsset();
    if (wireframeEnabled) setWireframe(true);
    byId('progress-bar').style.width = '100%';
    byId('progress-percent').textContent = '100%';
    setStatus('ASSET READY', true);
    window.setTimeout(() => { if (token === loadToken) loadingOverlay.classList.add('hidden'); }, 400);
    const stats = getStats(modelRoot, gltf);
    showToast(`${asset.title} loaded · ${fmt(stats.meshes)} meshes · ${stats.clips} animation clips`);
  } catch (error) {
    if (token !== loadToken) return;
    console.error(`Failed to load ${asset.file}:`, error);
    loadingOverlay.classList.add('hidden');
    errorOverlay.classList.remove('hidden');
    byId('error-message').textContent = `${asset.file}: ${error?.message || 'Unknown loading error'}`;
    setStatus('LOAD ERROR');
  }
}

function onCanvasPointerDown(event) {
  if (currentAppMode === 'GAME') return;
  pointerDown = { x: event.clientX, y: event.clientY, button: event.button };
}

function onCanvasPointerUp(event) {
  if (currentAppMode === 'GAME') return;
  if (!pointerDown || pointerDown.button !== 0) return;
  const movement = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  pointerDown = null;
  if (movement > 5 || !modelRoot) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(modelRoot, true);
  if (!hits.length) return;
  let picked = hits[0].object;
  while (picked.parent && picked.parent !== modelRoot && !picked.name) picked = picked.parent;
  selectObject(picked);
}

// UI bindings
byId('asset-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-asset]');
  if (button && button.dataset.asset !== activeAssetKey) loadAsset(button.dataset.asset);
});
document.querySelectorAll('.preset-button').forEach((button) => button.addEventListener('click', () => setCameraPreset(button.dataset.view)));
byId('fit-btn').addEventListener('click', fitCurrentAsset);
byId('grid-toggle').addEventListener('change', (event) => { gridHelper.visible = event.target.checked; });
byId('axes-toggle').addEventListener('change', (event) => { axesHelper.visible = event.target.checked; });
byId('wire-toggle').addEventListener('change', (event) => setWireframe(event.target.checked));
byId('light-toggle').addEventListener('change', (event) => {
  hemiLight.intensity = event.target.checked ? 1.65 : 0.55;
  keyLight.intensity = event.target.checked ? 2.1 : 0.75;
  cyanFill.intensity = event.target.checked ? 100 : 30;
  blueFill.intensity = event.target.checked ? 70 : 20;
});
byId('object-search').addEventListener('input', renderObjectList);
byId('category-filters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  activeCategory = button.dataset.category;
  document.querySelectorAll('.category-chip').forEach((chip) => chip.classList.toggle('active', chip === button));
  renderObjectList();
});
byId('clip-select').addEventListener('change', (event) => switchClip(Number(event.target.value)));
byId('play-btn').addEventListener('click', playSelectedClip);
byId('stop-btn').addEventListener('click', stopSelectedClip);
byId('speed-select').addEventListener('change', (event) => { if (mixer) mixer.timeScale = Number(event.target.value); });
byId('fullscreen-btn').addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch { showToast('Fullscreen is unavailable in this browser.'); }
});
byId('retry-btn').addEventListener('click', () => loadAsset(activeAssetKey || 'world'));
renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown);
renderer.domElement.addEventListener('pointerup', onCanvasPointerUp);

const resizeObserver = new ResizeObserver(() => {
  const width = Math.max(1, viewport.clientWidth);
  const height = Math.max(1, viewport.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
});
resizeObserver.observe(viewport);

// ============================================================================
// HACK THE AI: LEVEL PREVIEW & STUDIO MODE COORDINATION
// ============================================================================
let currentAppMode = 'STUDIO'; // 'STUDIO' | 'GAME'
const gameEngine = new GameEngine(viewport, scene, camera, renderer);
gameEngine.init();

const btnModeStudio = byId('btn-mode-studio');
const btnModeGame = byId('btn-mode-game');
const sidebar = document.querySelector('.sidebar');
const workspace = document.querySelector('.workspace');
const topline = document.querySelector('.viewport-topline');
const bottomHints = document.querySelectorAll('.viewport-bottom-left, .viewport-bottom-right');

async function switchMode(newMode) {
  if (currentAppMode === newMode) return;
  currentAppMode = newMode;

  if (newMode === 'GAME') {
    btnModeStudio?.classList.remove('active');
    btnModeGame?.classList.add('active');

    // Ensure the world environment is loaded
    if (activeAssetKey !== 'world') {
      await loadAsset('world');
    }

    // Collapse studio inspector sidebar into fullscreen game viewport
    if (sidebar) sidebar.style.display = 'none';
    if (workspace) workspace.style.gridTemplateColumns = '1fr';
    if (topline) topline.style.display = 'none';
    bottomHints.forEach((el) => { el.style.display = 'none'; });

    controls.enabled = false;
    await gameEngine.startLevelPreview();
  } else {
    btnModeStudio?.classList.add('active');
    btnModeGame?.classList.remove('active');

    gameEngine.exitLevelPreview();

    // Restore studio inspector sidebar & tools
    if (sidebar) sidebar.style.display = '';
    if (workspace) workspace.style.gridTemplateColumns = '';
    if (topline) topline.style.display = '';
    bottomHints.forEach((el) => { el.style.display = ''; });

    controls.enabled = true;
    fitCurrentAsset();
  }
}

gameEngine.onExitToStudio = () => switchMode('STUDIO');
btnModeStudio?.addEventListener('click', () => switchMode('STUDIO'));
btnModeGame?.addEventListener('click', () => switchMode('GAME'));

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  if (currentAppMode === 'GAME') {
    gameEngine.update(delta);
  } else {
    controls.update(delta);
    if (mixer) mixer.update(delta);
    if (selectionHelper) selectionHelper.update();
  }

  renderer.render(scene, camera);
}
animate();
loadAsset('world');

window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(animationFrameId);
  resizeObserver.disconnect();
  controls.dispose();
  renderer.dispose();
  clearCurrentAsset();
  gameEngine.exitLevelPreview();
});
