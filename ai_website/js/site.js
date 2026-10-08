// Small page behaviors: nav color over dark bands, and the contents rail
// on project pages.

(function () {
  var root = document.documentElement;
  var nav = document.querySelector(".glass-nav");
  var darkBands = document.querySelectorAll("[data-dark]");

  // Switch the nav to light text while it sits over a dark temper band
  function updateNav() {
    if (!nav) return;
    var r = nav.getBoundingClientRect();
    var y = r.top + r.height / 2;
    var onDark = false;
    for (var i = 0; i < darkBands.length; i++) {
      var b = darkBands[i].getBoundingClientRect();
      if (y >= b.top && y <= b.bottom) {
        onDark = true;
        break;
      }
    }
    root.classList.toggle("nav-on-dark", onDark);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      updateNav();
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateNav();

  // Contents rail: mark the section currently being read
  var tocLinks = document.querySelectorAll(".toc a[href^='#']");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    tocLinks.forEach(function (a) {
      byId[a.getAttribute("href").slice(1)] = a;
    });
    var visible = {};
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          visible[e.target.id] = e.isIntersecting;
        });
        // the first visible section in document order wins
        var current = null;
        for (var id in byId) {
          if (visible[id]) {
            current = id;
            break;
          }
        }
        if (!current) return;
        tocLinks.forEach(function (a) {
          a.classList.toggle("is-current", a === byId[current]);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }
})();
