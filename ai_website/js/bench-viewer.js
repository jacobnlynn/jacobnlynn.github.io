// The 3D part of the model bench, built with react-three-fiber.
// Loaded on demand by bench.js.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const h = React.createElement;

// Download with progress, then parse. (GitHub Pages may gzip the file, so
// the byte count can run past Content-Length; the bar is capped at 99%.)
async function fetchModel(url, sizeMB, onProgress) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  const total = Number(response.headers.get("content-length")) || sizeMB * 1e6;
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(Math.min(0.99, received / total));
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  const base = url.slice(0, url.lastIndexOf("/") + 1);
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer, base);
  return gltf.scene;
}

function dispose(object) {
  object.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) [].concat(o.material).forEach((m) => m.dispose());
  });
}

// Soft studio reflections so the grey parts read as material, not flat color
function Studio() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.3;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Controls({ api }) {
  const { camera, gl } = useThree();
  const controls = useMemo(() => new OrbitControls(camera, gl.domElement), [camera, gl]);
  useEffect(() => {
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    // Stop the slow turntable as soon as someone grabs the model
    const stopSpin = () => {
      controls.autoRotate = false;
    };
    controls.addEventListener("start", stopSpin);
    api.controls = controls;
    return () => {
      controls.removeEventListener("start", stopSpin);
      controls.dispose();
    };
  }, [controls, api]);
  useFrame(() => controls.update());
  return null;
}

// Puts the model on the floor, centred, and frames the camera around it
function Model({ object, api }) {
  const { camera } = useThree();
  const light = useRef();

  const frame = useMemo(() => {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    object.position.x -= center.x;
    object.position.z -= center.z;
    object.position.y -= box.min.y;
    const seen = new Set();
    object.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      // The Fusion exports use a light flat grey (0.63) that reads near-white
      // here; darken the neutral greys toward how Fusion shows them, and give
      // them a little sheen. Coloured parts (the gold PCBs) are left alone.
      for (const m of [].concat(o.material)) {
        if (seen.has(m) || !m.color) continue;
        seen.add(m);
        const { s } = m.color.getHSL({});
        if (s < 0.08) {
          m.color.multiplyScalar(0.42);
          m.metalness = 0.35;
          m.roughness = 0.45;
        }
      }
    });
    return { size, radius: size.length() / 2 };
  }, [object]);

  useEffect(() => {
    const { size, radius } = frame;
    const target = new THREE.Vector3(0, size.y * 0.45, 0);
    const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.22;
    const dir = new THREE.Vector3(1, 0.55, 1.25).normalize();
    api.home = () => {
      camera.position.copy(target).addScaledVector(dir, distance);
      camera.near = distance / 100;
      camera.far = distance * 20;
      camera.updateProjectionMatrix();
      if (api.controls) {
        api.controls.target.copy(target);
        api.controls.minDistance = radius * 0.6;
        api.controls.maxDistance = distance * 3;
        api.controls.autoRotate = true;
        api.controls.update();
      }
    };
    api.home();

    const l = light.current;
    l.position.set(radius * 1.4, radius * 3, radius * 1.1);
    const s = l.shadow.camera;
    s.left = s.bottom = -radius * 1.6;
    s.right = s.top = radius * 1.6;
    s.near = radius * 0.5;
    s.far = radius * 8;
    s.updateProjectionMatrix();
  }, [frame, camera, api]);

  useEffect(() => () => dispose(object), [object]);

  return h(
    React.Fragment,
    null,
    h("directionalLight", {
      ref: light,
      intensity: 1.5,
      castShadow: true,
      "shadow-mapSize": [2048, 2048],
      "shadow-bias": -0.0004,
      "shadow-normalBias": 0.02,
    }),
    h("hemisphereLight", { args: ["#f3f0e9", "#6f6a60", 0.35] }),
    h("primitive", { object }),
    // floor that only shows the shadow, so the drafting grid stays visible
    h(
      "mesh",
      { rotation: [-Math.PI / 2, 0, 0], receiveShadow: true },
      h("planeGeometry", { args: [frame.radius * 14, frame.radius * 14] }),
      h("shadowMaterial", { opacity: 0.16 })
    )
  );
}

function Viewer({ api, stage }) {
  const [object, setObject] = useState(null);
  const [frameloop, setFrameloop] = useState("always");
  api.setObject = setObject;

  // Stop rendering while the bench is scrolled out of view
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setFrameloop(e.isIntersecting ? "always" : "never"));
    io.observe(stage);
    return () => io.disconnect();
  }, [stage]);

  return h(
    Canvas,
    {
      className: "bench__canvas",
      shadows: true,
      dpr: [1, 2],
      frameloop,
      camera: { fov: 30, position: [60, 40, 60] },
      gl: { antialias: true, alpha: true },
    },
    h(Studio),
    h(Controls, { api }),
    object && h(Model, { key: object.uuid, object, api })
  );
}

export function createViewer(stage, { onStatus, onReady }) {
  const host = document.createElement("div");
  host.className = "bench__canvas";
  host.setAttribute("data-html2canvas-ignore", ""); // keep liquid-glass's page photo away from the WebGL canvas
  stage.prepend(host);

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "bench__reset";
  reset.textContent = "Reset view";
  reset.hidden = true;
  stage.append(reset);

  const api = {};
  reset.addEventListener("click", () => api.home && api.home());
  createRoot(host).render(h(Viewer, { api, stage }));

  let token = 0;
  return {
    async load(url, sizeMB) {
      const mine = ++token;
      onStatus("downloading 0%");
      try {
        const scene = await fetchModel(url, sizeMB, (p) => {
          if (mine === token) onStatus(`downloading ${Math.round(p * 100)}%`);
        });
        if (mine !== token) return dispose(scene); // a different tab was picked meanwhile
        onStatus("parsing");
        // the Canvas may still be mounting on the very first load
        while (!api.setObject) await new Promise((r) => requestAnimationFrame(r));
        api.setObject(scene);
        onStatus(`${sizeMB.toFixed(1)} MB · loaded`);
        reset.hidden = false;
        onReady();
      } catch (error) {
        console.error(error);
        if (mine === token) onStatus("could not load model");
      }
    },
  };
}
