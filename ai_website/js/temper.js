// Temper-color bands, drawn with ShaderGradient (github.com/ruucm/shadergradient),
// which renders through react-three-fiber.
//
// Every element with [data-temper] gets a live gradient. The band behind it
// already shows a still frame (assets/temper-poster.jpg), so the live canvas
// fades in over it once the first frames are drawn. ShaderGradientCanvas's
// built-in lazyLoad unmounts the canvas while it is off screen.

import React from "react";
import { createRoot } from "react-dom/client";
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";

const h = React.createElement;

// Steel temper colors: purple and blue, with straw/bronze where the surface
// catches the light. Tuned against screenshots; see README for the poster.
export const TEMPER = {
  type: "waterPlane",
  color1: "#5e3049",
  color2: "#2a3346",
  color3: "#c08a50",
  uStrength: 2.2,
  uDensity: 1.2,
  uFrequency: 3,
  uSpeed: 0.06,
  cDistance: 3.2,
  cPolarAngle: 80,
  cAzimuthAngle: 180,
  rotationX: 50,
  rotationZ: -60,
  brightness: 1.0,
  reflection: 0.1,
  lightType: "3d",
  grain: "off",
};

const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function whenCanvasDraws(host, callback) {
  // Wait for ShaderGradient to add its <canvas>, then give it two frames
  const ready = () => {
    if (!host.querySelector("canvas")) return false;
    requestAnimationFrame(() => requestAnimationFrame(callback));
    return true;
  };
  if (ready()) return;
  const observer = new MutationObserver(() => {
    if (ready()) observer.disconnect();
  });
  observer.observe(host, { childList: true, subtree: true });
}

for (const host of document.querySelectorAll("[data-temper]")) {
  const poster = host.dataset.temper === "poster"; // used once, to render the still frame
  createRoot(host).render(
    h(
      ShaderGradientCanvas,
      {
        style: { position: "absolute", inset: 0 },
        pixelDensity: Math.min(window.devicePixelRatio || 1, 1.5),
        fov: 45,
        lazyLoad: !poster,
        pointerEvents: "none",
      },
      h(ShaderGradient, { ...TEMPER, animate: still || poster ? "off" : "on", uTime: 0 })
    )
  );
  whenCanvasDraws(host, () => host.classList.add("is-live"));
}
