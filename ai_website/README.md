# ai_website

A second, modern version of the portfolio. It uses the same text, photos,
models and résumé as the 1990s site in the folder above, and links back to it.

**Design idea:** the site is a set of engineering drawing sheets. The write-ups
are ink on warm paper with numbered figures and a title block at the foot of
each page ("Sheet 2 of 4"). The colored bands at the top of each page are steel
temper colors, the straw, bronze, purple and blue that steel turns as it heats.

## Running it

There's no build step. Serve the **parent** folder (the pages load images,
models and the résumé from `../`) and open the page:

```
cd "personal website"
python -m http.server
```

then visit <http://localhost:8000/ai_website/>. Opening the HTML files directly
(`file://`) won't work, because browsers block JavaScript modules there.

On GitHub Pages it is live at `https://jacobnlynn.github.io/ai_website/`
once pushed.

## Pages

| File | Sheet |
|---|---|
| `index.html` | Hero, About, Projects, Résumé, Contact |
| `limbed-robot.html` | Limbed Robot Project, with two 3D model benches |
| `europa.html` | Europa — Benthic Lander (overview from the résumé; write-up pending) |
| `irec.html` | IREC — Payload (overview from the résumé; write-up pending) |

## Where each library is used

| Library | Used for | Code |
|---|---|---|
| [ShaderGradient](https://github.com/ruucm/shadergradient) | The animated temper bands | `js/temper.js` |
| [react-three-fiber](https://github.com/pmndrs/react-three-fiber) | The 3D CAD viewer ("model bench"), and what ShaderGradient renders through | `js/bench-viewer.js` |
| [Paper liquid-logo](https://github.com/paper-design/liquid-logo) | The liquid-metal JL mark on the home page | `js/liquid-logo.js` |
| [liquid-glass-js](https://github.com/dashersw/liquid-glass-js) | The glass navigation pill and the "Open résumé" button | `js/glass.js`, `vendor/liquid-glass/` |

React, react-three-fiber, three.js and ShaderGradient load from CDNs through the
import map at the top of each page. The two smaller libraries are copied into
`vendor/` with their licenses (MIT for liquid-glass-js, PolyForm Shield 1.0.0 for
Paper's shader).

Things worth knowing:

- **The 3D models only download when someone clicks "Load 3D model".** They are
  4–19 MB each, so nothing heavy loads with the page.
- **liquid-glass-js works by taking one screenshot of the whole page** (with
  html2canvas) and refracting it. Live WebGL canvases can't be captured, so the
  bands show a still frame (`assets/temper-poster.jpg`) underneath the live
  gradient. On pages taller than the graphics card's largest texture, the nav
  falls back to a plain frosted pill.
- **Each animation pauses when it's off screen**, and the site respects the
  "reduce motion" setting.

## Changing things

- **Text:** edit the HTML directly; each section is plain HTML.
- **Gradient colors:** change `TEMPER` in `js/temper.js`, then make a new
  still frame by opening `tools/poster.html` (instructions inside it) and saving
  the screenshot over `assets/temper-poster.jpg`.
- **Colors, fonts, spacing:** the tokens at the top of `css/site.css`.
- **A new model in a bench:** copy one of the `<button class="bench__tab" ...>`
  lines in `limbed-robot.html` and set `data-model`, `data-size` (MB) and
  `data-poster`.
- **The JL mark:** `assets/logo-mask.png` is a bevel map precomputed from the
  monogram with the same method Paper's tool uses.
