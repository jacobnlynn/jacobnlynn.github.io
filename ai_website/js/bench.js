// Model bench: a poster of each CAD model with a "Load 3D model" button.
// The 3D viewer (bench-viewer.js: React + react-three-fiber) and the model
// files are only downloaded when someone asks for them; the models are
// 4–19 MB each.

for (const bench of document.querySelectorAll("[data-bench]")) {
  const tabs = [...bench.querySelectorAll(".bench__tab")];
  const fileLabel = bench.querySelector(".bench__file");
  const status = bench.querySelector(".bench__status");
  const stage = bench.querySelector(".bench__stage");
  const poster = bench.querySelector(".bench__poster");
  const loadButton = bench.querySelector(".bench__load");
  let current = 0;
  let viewer = null;

  const info = (i) => {
    const t = tabs[i];
    return {
      url: t.dataset.model,
      file: t.dataset.model.split("/").pop(),
      size: t.dataset.size,
      poster: t.dataset.poster,
      name: t.textContent.trim(),
    };
  };

  function setStatus(text) {
    status.textContent = text;
  }

  function show(i) {
    current = i;
    const m = info(i);
    tabs.forEach((t, j) => t.setAttribute("aria-selected", String(j === i)));
    fileLabel.textContent = m.file;
    if (viewer) {
      viewer.load(m.url, Number(m.size));
    } else {
      poster.src = m.poster;
      poster.alt = m.name + " (CAD render)";
      loadButton.textContent = `Load 3D model · ${m.size} MB`;
      setStatus(`${m.size} MB · not loaded`);
    }
  }

  tabs.forEach((t, i) => t.addEventListener("click", () => show(i)));

  // Arrow keys move between tabs
  bench.querySelector(".bench__tabs")?.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = (current + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    show(next);
    tabs[next].focus();
  });

  loadButton.addEventListener("click", async () => {
    loadButton.disabled = true;
    loadButton.textContent = "Loading viewer…";
    setStatus("loading viewer");
    try {
      const { createViewer } = await import("./bench-viewer.js");
      viewer = createViewer(stage, {
        onStatus: setStatus,
        onReady: () => {
          poster.style.opacity = "0";
          loadButton.hidden = true;
        },
      });
      const m = info(current);
      viewer.load(m.url, Number(m.size));
    } catch (error) {
      console.error(error);
      loadButton.disabled = false;
      loadButton.textContent = "Try again";
      setStatus("viewer failed to load");
    }
  });

  show(0);
}
