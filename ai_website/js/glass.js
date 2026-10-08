// Liquid glass for the navigation pill and the résumé button, using
// liquid-glass-js (github.com/dashersw/liquid-glass-js, vendor/liquid-glass).
//
// How the library works: it takes one html2canvas photograph of the whole
// page and refracts the part of it under each glass element. So:
//   - it waits until images and fonts are loaded, so the photograph is complete;
//   - the glass hosts carry data-html2canvas-ignore so they aren't photographed;
//   - so do the live WebGL canvases (gradient, logo, 3D viewer): html2canvas
//     calls getContext("2d") on every canvas it copies, which would claim a
//     canvas before three.js gets to create its WebGL context;
//   - it is skipped when the page is taller than the GPU's largest texture
//     (long pages on some phones), leaving the plain frosted CSS pill.
// The links stay real <a> elements inside the glass, so keyboard and screen
// reader use is unchanged.

(function () {
  if (typeof Container === "undefined" || typeof html2canvas === "undefined") return;

  var probe = document.createElement("canvas").getContext("webgl");
  if (!probe) return;
  var maxTexture = probe.getParameter(probe.MAX_TEXTURE_SIZE);

  var hosts = Array.prototype.slice.call(document.querySelectorAll("[data-liquid-glass]"));
  if (!hosts.length) return;

  var built = [];
  var builtWidth = 0;

  function fits() {
    var doc = document.documentElement;
    return doc.scrollHeight <= Math.min(maxTexture, 12000) && doc.clientWidth <= maxTexture;
  }

  function build() {
    if (!fits()) return;
    builtWidth = window.innerWidth;
    hosts.forEach(function (host) {
      var content = host.querySelector("[data-glass-content]");
      if (!content) return;
      // Drop the CSS pane first so it can never end up inside the photograph
      host.classList.add("is-liquid");
      var glass = new Container({ type: "pill", tintOpacity: Number(host.dataset.tint || 0.12) });
      host.appendChild(glass.element);
      glass.element.appendChild(content);
      glass.updateSizeFromDOM();
      built.push({ host: host, content: content, glass: glass });
    });
  }

  function teardown() {
    built.forEach(function (b) {
      b.host.appendChild(b.content);
      b.glass.element.remove();
      b.glass.gl_refs = {}; // stops the old instance's scroll handler from drawing
      b.host.classList.remove("is-liquid");
    });
    built = [];
    Container.pageSnapshot = null;
    Container.isCapturing = false;
    Container.waitingForSnapshot = [];
  }

  // The photograph is only valid for one layout, so retake it after a real resize
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (Math.abs(window.innerWidth - builtWidth) < 40) return;
      teardown();
      build();
    }, 600);
  });

  function start() {
    var fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    fonts.then(function () {
      // Give the browser a moment after load so the photograph doesn't
      // compete with the first paint and the WebGL bands starting up
      var later = window.requestIdleCallback || function (fn) { setTimeout(fn, 300); };
      later(build, { timeout: 1500 });
    });
  }

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
