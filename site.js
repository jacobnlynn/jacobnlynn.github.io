// Site scripts: floating dark/light and robot arm buttons, photo viewer
// (CAD viewers are in cad_viewer.js, the arm itself in robot_arm.js)

// Remembered choices; storage can be blocked (private windows etc.), and then
// the buttons still work on the current page
function loadSetting(name) {
  try {
    return localStorage.getItem(name);
  } catch (error) {
    return null;
  }
}

function saveSetting(name, value) {
  try {
    localStorage.setItem(name, value);
  } catch (error) {}
}

// ---- Floating buttons (bottom-right corner, stay put while scrolling) ----

const controls = document.createElement("div");
controls.className = "float-controls";
document.body.appendChild(controls);

function addControl() {
  const button = document.createElement("button");
  button.type = "button";
  controls.appendChild(button);
  return button;
}

// ---- Dark / light mode ----
// Each page loads theme-risograph.css (light) by default; a small script in
// the <head> swaps in the saved theme before the page draws. The button flips
// between the two and remembers the choice for the rest of the site.

const THEMES = {
  cga: { file: "theme-cga.css", name: "Dark" },
  risograph: { file: "theme-risograph.css", name: "Light" },
};

const themeLink = document.getElementById("theme-css");

function otherTheme(theme) {
  return theme === "cga" ? "risograph" : "cga";
}

if (themeLink) {
  const themeButton = addControl();
  const label = function () {
    themeButton.textContent = THEMES[otherTheme(document.documentElement.dataset.theme)].name + " mode";
  };
  label();
  themeButton.addEventListener("click", function () {
    const next = otherTheme(document.documentElement.dataset.theme);
    themeLink.href = THEMES[next].file;
    document.documentElement.dataset.theme = next;
    saveSetting("theme", next);
    label();
  });
}

// ---- Robot arm on / off ----
// Only shown when the arm is running (it skips phones and small screens).

if (window.robotArm) {
  const armButton = addControl();
  const label = function () {
    armButton.textContent = window.robotArm.enabled() ? "Hide arm" : "Show arm";
  };
  if (loadSetting("arm") === "off") window.robotArm.setEnabled(false);
  label();
  armButton.addEventListener("click", function () {
    const on = !window.robotArm.enabled();
    window.robotArm.setEnabled(on);
    saveSetting("arm", on ? "on" : "off");
    label();
  });
}

// ---- Photo viewer ----
// Clicking a photo on a project page opens it bigger in a pop-up window,
// with Back / Next buttons (and the arrow keys) to step through the other
// photos on the page.

const pagePhotos = Array.from(document.querySelectorAll("main figure img"));

if (pagePhotos.length) {
  const viewer = document.createElement("dialog");
  viewer.id = "photo-window";
  viewer.innerHTML =
    '<div class="titlebar">' +
      '<span class="photo-name"></span>' +
      '<button class="close" aria-label="Close">X</button>' +
    '</div>' +
    '<div class="photo-view"><img alt=""></div>' +
    '<div class="photo-controls">' +
      '<button class="photo-prev">&#9664; Back</button>' +
      '<span class="photo-caption"></span>' +
      '<button class="photo-next">Next &#9654;</button>' +
    '</div>' +
    '<div class="statusbar"></div>';
  document.body.appendChild(viewer);

  const image = viewer.querySelector(".photo-view img");
  const nameText = viewer.querySelector(".photo-name");
  const captionText = viewer.querySelector(".photo-caption");
  const statusText = viewer.querySelector(".statusbar");
  const prevButton = viewer.querySelector(".photo-prev");
  const nextButton = viewer.querySelector(".photo-next");

  const photos = pagePhotos.map(function (img) {
    const caption = img.closest("figure").querySelector("figcaption");
    return { src: img.getAttribute("src"), alt: img.alt, caption: caption ? caption.textContent : "" };
  });
  let current = 0;

  function show(index) {
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    image.src = photo.src;
    image.alt = photo.alt;
    nameText.textContent = photo.src.split("/").pop();
    captionText.textContent = photo.caption;
    statusText.textContent = "Photo " + (current + 1) + " of " + photos.length;
    prevButton.disabled = nextButton.disabled = photos.length < 2;
  }

  prevButton.addEventListener("click", function () { show(current - 1); });
  nextButton.addEventListener("click", function () { show(current + 1); });
  viewer.querySelector(".close").addEventListener("click", function () { viewer.close(); });

  // Clicking the dark area outside the window closes it
  viewer.addEventListener("click", function (event) {
    if (event.target === viewer) viewer.close();
  });

  viewer.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") show(current - 1);
    if (event.key === "ArrowRight") show(current + 1);
  });

  pagePhotos.forEach(function (img, index) {
    img.classList.add("enlargeable");
    img.title = "Click to enlarge";
    img.addEventListener("click", function () {
      show(index);
      viewer.showModal();
    });
  });
}
