// Experimental: pixel-art robot arm whose base slides along the screen edge and
// tries to grab the cursor. Self-contained; to remove it, delete this file and the
// <script src="robot_arm.js"></script> line in each page.
(function () {
  // Desktop only: needs a real mouse, a reasonably wide screen, and motion allowed.
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.innerWidth < 700) return;

  var PX = 2;               // screen pixels per art pixel
  var BASE_SPEED = 200;     // edge slide speed, art pixels per second
  var JOINT_SPEED = 3;      // max joint speed, radians per second
  var GRAB_DIST = 4.5;      // art pixels between fingertips and cursor to count as a grab

  var BLACK = 0xff000000, WHITE = 0xffffffff, GREY = 0xffa8a8a8;

  var canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;" +
    "z-index:2147483000;image-rendering:pixelated;image-rendering:crisp-edges;";
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  var W, H, M, reach, L1, L2, L3, FINGER, img, buf;
  var s = 0, travelling = false, targetS = 0;   // base position along the screen edge
  var a = [0, 0, 0];                            // absolute link angles
  var elbowSign = 1, open = 6, mouse = null;

  function resize() {
    var oldP = W ? perimeter() : 0;
    W = Math.ceil(window.innerWidth / PX);
    H = Math.ceil(window.innerHeight / PX);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = W * PX + "px";
    canvas.style.height = H * PX + "px";
    img = ctx.createImageData(W, H);
    buf = new Uint32Array(img.data.buffer);
    M = 0;                                       // base sits on the edge, half off-screen
    reach = (window.innerHeight / PX) / 2;       // fully stretched = half the screen height
    L1 = reach * 0.4; L2 = reach * 0.4; L3 = reach * 0.2;
    FINGER = Math.min(12, L3 * 0.45);
    if (oldP) { s = s / oldP * perimeter(); targetS = targetS / oldP * perimeter(); }
    else {
      // Start parked in the bottom-left corner, folded up.
      s = perimeter() - (H - 2 * M);
      var n = railPoint(s).n;
      a = [Math.atan2(n.y, n.x) + 0.9, Math.atan2(n.y, n.x) - 1.6, Math.atan2(n.y, n.x) + 0.3];
    }
  }

  // ---------- edge track geometry (clockwise from the top-left corner) ----------
  function perimeter() { return 2 * (W - 2 * M) + 2 * (H - 2 * M); }

  function railPoint(t) {
    var w = W - 2 * M, h = H - 2 * M, P = perimeter();
    t = ((t % P) + P) % P;
    if (t < w) return { x: M + t, y: M, n: { x: 0, y: 1 } };
    t -= w;
    if (t < h) return { x: W - M, y: M + t, n: { x: -1, y: 0 } };
    t -= h;
    if (t < w) return { x: W - M - t, y: H - M, n: { x: 0, y: -1 } };
    t -= w;
    return { x: M, y: H - M - t, n: { x: 1, y: 0 } };
  }

  function closestRailS(p) {
    var w = W - 2 * M, h = H - 2 * M;
    var cx = clamp(p.x, M, W - M), cy = clamp(p.y, M, H - M);
    var options = [
      { d: Math.abs(p.y - M), s: cx - M },
      { d: Math.abs(W - M - p.x), s: w + (cy - M) },
      { d: Math.abs(H - M - p.y), s: w + h + (W - M - cx) },
      { d: Math.abs(p.x - M), s: 2 * w + h + (H - M - cy) }
    ];
    options.sort(function (u, v) { return u.d - v.d; });
    return options[0].s;
  }

  // ---------- helpers ----------
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function wrapAngle(t) { while (t > Math.PI) t -= 2 * Math.PI; while (t < -Math.PI) t += 2 * Math.PI; return t; }
  function wrapRail(d) { var P = perimeter(); d = ((d % P) + P) % P; return d > P / 2 ? d - P : d; }

  // ---------- inverse kinematics ----------
  function solve(base, n, target) {
    var dx = target.x - base.x, dy = target.y - base.y, len = Math.hypot(dx, dy);
    var d = len > 0.001 ? { x: dx / len, y: dy / len } : n;
    var aim = Math.atan2(d.y, d.x);
    // Wrist sits L3 back from the target along the approach direction.
    var wx = target.x - d.x * L3 - base.x, wy = target.y - d.y * L3 - base.y;
    var r = clamp(Math.hypot(wx, wy), Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.01);
    var phi = Math.atan2(wy, wx);
    var alpha = Math.acos(clamp((L1 * L1 + r * r - L2 * L2) / (2 * L1 * r), -1, 1));

    function branch(sign) {
      var t1 = phi + sign * alpha;
      var ex = L1 * Math.cos(t1), ey = L1 * Math.sin(t1);
      var t2 = Math.atan2(r * Math.sin(phi) - ey, r * Math.cos(phi) - ex);
      return { t1: t1, t2: t2, inward: ex * n.x + ey * n.y };
    }
    var cur = branch(elbowSign), other = branch(-elbowSign);
    // Keep the elbow pointing into the page, with hysteresis so it doesn't flip-flop.
    if (other.inward > cur.inward + L1 * 0.2) { elbowSign = -elbowSign; cur = other; }
    return [cur.t1, cur.t2, aim];
  }

  // ---------- update ----------
  function update(dt) {
    var P = perimeter();
    var base = railPoint(s);
    var target = mouse;

    if (target) {
      var dist = Math.hypot(target.x - base.x, target.y - base.y);
      if (!travelling && dist > reach * 0.85) travelling = true;
      if (travelling) {
        targetS = closestRailS(target);
        var ds = wrapRail(targetS - s);
        var step = BASE_SPEED * dt;
        if (Math.abs(ds) <= step) { s = targetS; travelling = false; }
        else s += Math.sign(ds) * step;
        s = ((s % P) + P) % P;
        base = railPoint(s);
      }
    } else {
      // No cursor on the page: relax into a folded pose.
      target = { x: base.x + base.n.x * reach * 0.35, y: base.y + base.n.y * reach * 0.35 };
    }

    var goal = solve(base, base.n, target);
    for (var i = 0; i < 3; i++) {
      var diff = wrapAngle(goal[i] - a[i]);
      var maxStep = JOINT_SPEED * dt;
      a[i] += clamp(diff * Math.min(1, 12 * dt), -maxStep, maxStep);
    }

    var tip = forward(base).tip;
    var grabbed = mouse && Math.hypot(tip.x - mouse.x, tip.y - mouse.y) < GRAB_DIST;
    var goalOpen = grabbed ? 1.5 : 6;
    open += clamp(goalOpen - open, -30 * dt, 30 * dt);
    return base;
  }

  function forward(base) {
    var e = { x: base.x + L1 * Math.cos(a[0]), y: base.y + L1 * Math.sin(a[0]) };
    var w = { x: e.x + L2 * Math.cos(a[1]), y: e.y + L2 * Math.sin(a[1]) };
    var tip = { x: w.x + L3 * Math.cos(a[2]), y: w.y + L3 * Math.sin(a[2]) };
    return { e: e, w: w, tip: tip };
  }

  // ---------- pixel drawing ----------
  function px(x, y, c) { if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = c; }

  function disc(cx, cy, r, c) {
    for (var y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (var x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        var dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r * r) px(x, y, c);
      }
  }

  function seg(x0, y0, x1, y1, width, c) {
    var r = width / 2, vx = x1 - x0, vy = y1 - y0, L2s = vx * vx + vy * vy || 1;
    var minX = Math.floor(Math.min(x0, x1) - r), maxX = Math.ceil(Math.max(x0, x1) + r);
    var minY = Math.floor(Math.min(y0, y1) - r), maxY = Math.ceil(Math.max(y0, y1) + r);
    for (var y = minY; y <= maxY; y++)
      for (var x = minX; x <= maxX; x++) {
        var qx = x + 0.5 - x0, qy = y + 0.5 - y0;
        var t = clamp((qx * vx + qy * vy) / L2s, 0, 1);
        var dx = qx - t * vx, dy = qy - t * vy;
        if (dx * dx + dy * dy <= r * r) px(x, y, c);
      }
  }

  function joint(p, r) {
    disc(p.x, p.y, r, BLACK);
    disc(p.x, p.y, r - 1.5, WHITE);
    // Shadow crescent on the lower-right of the white ring.
    disc(p.x + 1, p.y + 1, r - 1.5, GREY);
    disc(p.x - 0.5, p.y - 0.5, r - 2.5, WHITE);
    disc(p.x, p.y, r * 0.6, BLACK);
    disc(p.x, p.y, r * 0.42, WHITE);
    disc(p.x, p.y, r * 0.18, BLACK);
    // Four bolts around the outer ring.
    for (var i = 0; i < 4; i++) {
      var t = Math.PI / 4 + i * Math.PI / 2, br = r * 0.8;
      px(Math.floor(p.x + Math.cos(t) * br), Math.floor(p.y + Math.sin(t) * br), BLACK);
    }
  }

  function draw(base) {
    buf.fill(0);
    var k = forward(base);
    var ux = Math.cos(a[2]), uy = Math.sin(a[2]), vx = -uy, vy = ux;
    var palm = { x: k.tip.x - ux * FINGER, y: k.tip.y - uy * FINGER };

    // Links: black outline with a white core.
    var links = [[base, k.e], [k.e, k.w], [k.w, palm]];
    links.forEach(function (l) { seg(l[0].x, l[0].y, l[1].x, l[1].y, 8, BLACK); });
    links.forEach(function (l) { seg(l[0].x, l[0].y, l[1].x, l[1].y, 5.5, WHITE); });
    // Thin grey centre groove along each link.
    links.forEach(function (l) { seg(l[0].x, l[0].y, l[1].x, l[1].y, 1.2, GREY); });

    // Gripper: a palm bar and two fingers.
    var o = open + 1.5;
    seg(palm.x - vx * (o + 2), palm.y - vy * (o + 2), palm.x + vx * (o + 2), palm.y + vy * (o + 2), 4.5, BLACK);
    seg(palm.x - vx * (o + 0.5), palm.y - vy * (o + 0.5), palm.x + vx * (o + 0.5), palm.y + vy * (o + 0.5), 1, GREY);
    [-1, 1].forEach(function (side) {
      var fx = palm.x + side * vx * o, fy = palm.y + side * vy * o;
      var kx = fx + ux * FINGER * 0.7, ky = fy + uy * FINGER * 0.7;
      seg(fx, fy, kx, ky, 3, BLACK);
      // Fingertip hooks slightly inward.
      seg(kx, ky, kx + ux * FINGER * 0.3 - side * vx * 1.5, ky + uy * FINGER * 0.3 - side * vy * 1.5, 2.5, BLACK);
    });

    joint(k.w, 7);
    joint(k.e, 9);
    joint(base, 11);

    ctx.putImageData(img, 0, 0);
  }

  // ---------- events and loop ----------
  window.addEventListener("mousemove", function (e) { mouse = { x: e.clientX / PX, y: e.clientY / PX }; });
  document.addEventListener("mouseout", function (e) { if (!e.relatedTarget) mouse = null; });
  window.addEventListener("resize", resize);
  resize();

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(update(dt));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
