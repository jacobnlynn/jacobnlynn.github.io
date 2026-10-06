// Site scripts go here (tabs, three.js CAD viewers, etc.)

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
