// ---- Interactive CAD viewer ----
// Any <button class="cad-launch" data-model="..." data-title="..."> opens
// that model in the #cad-window pop-up. three.js is only downloaded the
// first time a viewer is opened. Supports .glb/.gltf, .stl and .obj files.

const cadWindow = document.getElementById("cad-window");

if (cadWindow) {
  const view = cadWindow.querySelector(".cad-view");
  const title = cadWindow.querySelector(".titlebar span");
  const status = cadWindow.querySelector(".statusbar");
  const helpText = status.innerHTML;
  let viewer = null;

  document.querySelectorAll(".cad-launch").forEach(function (button) {
    button.addEventListener("click", async function () {
      title.textContent = button.dataset.title || "CAD Viewer";
      cadWindow.showModal();
      try {
        if (!viewer) {
          status.textContent = "Loading 3D viewer...";
          viewer = await createViewer(view);
        }
        viewer.start();
        await viewer.load(button.dataset.model, status);
        status.innerHTML = helpText;
      } catch (error) {
        console.error(error);
        if (location.protocol === "file:") {
          status.textContent = "Could not load " + button.dataset.model +
            " (the page was opened as a file; open it through a web server instead)";
        } else {
          status.textContent = "Could not load " + button.dataset.model +
            " (check that the file exists in the models folder)";
        }
      }
    });
  });

  cadWindow.querySelector(".close").addEventListener("click", function () {
    cadWindow.close();
  });

  // Clicking the dark area outside the window closes it
  cadWindow.addEventListener("click", function (event) {
    if (event.target === cadWindow) cadWindow.close();
  });

  // Stop drawing while closed so it doesn't use the visitor's GPU
  cadWindow.addEventListener("close", function () {
    if (viewer) viewer.stop();
  });
}

async function createViewer(container) {
  const THREE = await import("three");
  const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x808080, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(1, 2, 1.5);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Keep the drawing the same size as the window
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);

  let model = null;
  let grid = null;
  let currentUrl = null;

  async function loadFile(url, onProgress) {
    const ext = url.split(".").pop().toLowerCase();
    if (ext === "glb" || ext === "gltf") {
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      return (await new GLTFLoader().loadAsync(url, onProgress)).scene;
    }
    const plain = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.2, roughness: 0.6 });
    if (ext === "stl") {
      const { STLLoader } = await import("three/addons/loaders/STLLoader.js");
      const geometry = await new STLLoader().loadAsync(url, onProgress);
      geometry.computeVertexNormals();
      return new THREE.Mesh(geometry, plain);
    }
    if (ext === "obj") {
      const { OBJLoader } = await import("three/addons/loaders/OBJLoader.js");
      const object = await new OBJLoader().loadAsync(url, onProgress);
      object.traverse(function (child) {
        if (child.isMesh) child.material = plain;
      });
      return object;
    }
    throw new Error("Unsupported model type: " + ext);
  }

  return {
    start() {
      resize();
      renderer.setAnimationLoop(function () {
        controls.update();
        renderer.render(scene, camera);
      });
    },

    stop() {
      renderer.setAnimationLoop(null);
    },

    async load(url, status) {
      if (url === currentUrl) return;
      status.textContent = "Loading model...";
      const object = await loadFile(url, function (event) {
        if (event.total) {
          status.textContent = "Loading model... " + Math.round(event.loaded / event.total * 100) + "%";
        }
      });

      if (model) scene.remove(model);
      if (grid) scene.remove(grid);

      // Center the model and sit it on a grid, whatever units it was exported in
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radius = size.length() / 2;
      model = new THREE.Group();
      object.position.sub(center);
      model.add(object);
      scene.add(model);

      grid = new THREE.GridHelper(radius * 4, 20, 0xb0b0b0, 0xdddddd);
      grid.position.y = -size.y / 2;
      scene.add(grid);

      // Fit the camera to the model
      camera.near = radius / 100;
      camera.far = radius * 100;
      camera.position.set(radius * 1.6, radius * 1.1, radius * 1.6);
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();

      currentUrl = url;
    },
  };
}
