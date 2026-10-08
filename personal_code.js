// Site scripts: resume pop-up, window buttons, taskbar (CAD viewers are in cad_viewer.js)

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
