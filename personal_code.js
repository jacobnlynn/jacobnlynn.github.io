// Site scripts: resume pop-up, photo viewer, window buttons, taskbar (CAD viewers are in cad_viewer.js)

// ---- Resume pop-up ----
// Opens resume.pdf in a window over the page. On small screens (phones
// can't show a PDF inside a page) the link just opens the PDF normally.

const resumeLink = document.getElementById("resume-link");
const resumeWindow = document.getElementById("resume-window");

if (resumeLink && resumeWindow) {
  const frame = resumeWindow.querySelector("iframe");

  resumeLink.addEventListener("click", function (event) {
    if (window.innerWidth < 700) return;
    event.preventDefault();
    if (!frame.src) frame.src = resumeLink.href;
    resumeWindow.showModal();
  });

  document.getElementById("resume-close").addEventListener("click", function () {
    resumeWindow.close();
  });

  // Clicking the dark area outside the window closes it
  resumeWindow.addEventListener("click", function (event) {
    if (event.target === resumeWindow) resumeWindow.close();
  });
}

// ---- Photo viewer ----
// Clicking a photo on a project page opens it bigger in a pop-up window,
// with Back / Next buttons (and the arrow keys) to step through the other
// photos on the page.

const pagePhotos = Array.from(document.querySelectorAll("#panel figure img"));

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

// ---- Window buttons (minimize / maximize / close) ----
// Minimize hides the window until its taskbar button is clicked, maximize
// makes it fill the screen (remembered while browsing the site), and close
// hides the window and its taskbar button, leaving the empty desktop (the
// Start menu opens a page again). Dragging the title bar moves the window
// around the desktop.

const page = document.getElementById("page");
const windowTitle = document.getElementById("window-title");

function setMinimized(minimized) {
  document.body.classList.toggle("minimized", minimized);
  const taskButton = document.getElementById("task-window");
  if (taskButton) taskButton.classList.toggle("pressed", !minimized);
}

// Offset of the window from where it normally sits
let windowX = 0;
let windowY = 0;

function moveWindow(x, y) {
  windowX = x;
  windowY = y;
  page.style.left = x + "px";
  page.style.top = y + "px";
  document.body.classList.toggle("moved", x !== 0 || y !== 0);
}

function setMaximized(maximized) {
  document.body.classList.toggle("maximized", maximized);
  if (maximized) moveWindow(0, 0);
  document.getElementById("win-max").setAttribute("aria-label", maximized ? "Restore" : "Maximize");
  sessionStorage.setItem("maximized", maximized ? "yes" : "");
}

function closeWindow() {
  document.body.classList.add("closed");
}

if (windowTitle) {
  document.getElementById("win-min").addEventListener("click", function () {
    setMinimized(true);
  });
  document.getElementById("win-max").addEventListener("click", function () {
    setMaximized(!document.body.classList.contains("maximized"));
  });
  document.getElementById("win-close").addEventListener("click", closeWindow);
  // Double-clicking the title bar maximizes, like the real thing
  windowTitle.addEventListener("dblclick", function (event) {
    if (event.target.closest("button")) return;
    setMaximized(!document.body.classList.contains("maximized"));
  });
  if (sessionStorage.getItem("maximized")) setMaximized(true);

  windowTitle.addEventListener("pointerdown", function (event) {
    if (event.button !== 0 || event.target.closest("button")) return;
    if (document.body.classList.contains("maximized")) return;
    event.preventDefault();

    // Where the window would be with no offset, in screen coordinates
    const box = page.getBoundingClientRect();
    const homeLeft = box.left - windowX;
    const homeTop = box.top - windowY;
    const grabX = event.clientX - windowX;
    const grabY = event.clientY - windowY;

    function drag(moveEvent) {
      let x = moveEvent.clientX - grabX;
      let y = moveEvent.clientY - grabY;
      // Keep part of the title bar on screen so it can always be grabbed again
      x = Math.min(Math.max(x, 80 - homeLeft - box.width), window.innerWidth - 80 - homeLeft);
      y = Math.min(Math.max(y, -(homeTop + window.scrollY)), window.innerHeight - 60 - homeTop);
      moveWindow(x, y);
    }
    function drop() {
      windowTitle.removeEventListener("pointermove", drag);
      windowTitle.removeEventListener("pointerup", drop);
      windowTitle.removeEventListener("pointercancel", drop);
    }

    windowTitle.setPointerCapture(event.pointerId);
    windowTitle.addEventListener("pointermove", drag);
    windowTitle.addEventListener("pointerup", drop);
    windowTitle.addEventListener("pointercancel", drop);
  });
}

// ---- Taskbar ----
// Start menu (built from the page tabs, so new projects show up on their
// own), a button for this page's window, and a clock.

if (page) {
  const taskbar = document.createElement("div");
  taskbar.id = "taskbar";
  taskbar.innerHTML =
    '<button id="start-button" aria-haspopup="menu" aria-expanded="false"><span class="start-logo"></span>Start</button>' +
    '<span id="quick-launch"></span>' +
    '<div id="start-menu" role="menu" hidden>' +
      '<div class="start-banner">Jacob<b>OS</b> 95</div>' +
      '<div class="start-items"></div>' +
    '</div>' +
    '<button id="task-window" class="pressed"></button>' +
    '<span id="tray-clock"></span>';
  document.body.appendChild(taskbar);

  const startButton = document.getElementById("start-button");
  const startMenu = document.getElementById("start-menu");
  const items = startMenu.querySelector(".start-items");

  function addItem(text, href) {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = text;
    link.setAttribute("role", "menuitem");
    items.appendChild(link);
    return link;
  }
  function addSeparator() {
    items.appendChild(document.createElement("hr"));
  }

  document.querySelectorAll("#tabs a").forEach(function (tab) {
    addItem(tab.classList.contains("home") ? "Home" : tab.textContent, tab.getAttribute("href"));
  });
  addSeparator();
  addItem("Resume", "resume.pdf");
  addItem("Email Me", "mailto:jnlynn@stanford.edu");

  function setMenuOpen(open) {
    startMenu.hidden = !open;
    startButton.classList.toggle("pressed", open);
    startButton.setAttribute("aria-expanded", open);
  }

  startButton.addEventListener("click", function () {
    setMenuOpen(startMenu.hidden);
  });
  // Clicking anywhere else or pressing Escape closes the menu
  document.addEventListener("click", function (event) {
    if (!taskbar.contains(event.target)) setMenuOpen(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setMenuOpen(false);
  });

  // Quick-launch icons, one per project tab: images/icons/<page name>.svg
  // (e.g. limbed_robot.html uses images/icons/limbed_robot.svg). A project
  // with no icon file gets a plain button with its first letter.
  const quickLaunch = document.getElementById("quick-launch");
  const thisPage = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("#tabs a:not(.home)").forEach(function (tab) {
    const href = tab.getAttribute("href");
    const link = document.createElement("a");
    link.href = href;
    link.title = tab.textContent;
    link.setAttribute("aria-label", tab.textContent);
    if (href === thisPage) link.classList.add("pressed");
    const icon = document.createElement("img");
    icon.src = "images/icons/" + href.replace(/\.html$/, "") + ".svg";
    icon.alt = "";
    icon.addEventListener("error", function () {
      link.textContent = tab.textContent.charAt(0);
    });
    link.appendChild(icon);
    quickLaunch.appendChild(link);
  });

  // This page's window: click to minimize or bring it back
  const taskButton = document.getElementById("task-window");
  taskButton.textContent = windowTitle ? windowTitle.querySelector("span").textContent : document.title;
  taskButton.addEventListener("click", function () {
    setMinimized(!document.body.classList.contains("minimized"));
  });

  const clock = document.getElementById("tray-clock");
  function updateClock() {
    clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  updateClock();
  setInterval(updateClock, 10000);
}

