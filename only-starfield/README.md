# Infinite Starfield

A full-screen star background with a continuous camera flight through space.
No OBJ model, no matcap, no lights, no gradient sprite layer — and no scrolling:
the travel runs on its own, forever.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Full-viewport canvas and the CSS backdrop. No page content. |
| `index.js` | Scene, camera, render loop and the tuning knobs. |
| `getStarfield.js` | Builds the star tunnel and advances the flight. |

Self-contained: the star sprite is drawn procedurally in the fragment shader, so
unlike `../libs/getStarfield.js` this version needs no texture from `assets/`.

## How the infinite travel works

The parent demo scatters stars on a hollow **sphere shell** (radius 25–50) and
moves it on Z. That works for a short scroll-driven nudge, but travelling far
enough simply flies you out of the shell and the sky empties.

Here the stars fill a **cylinder** of length `depth` sitting in front of the
camera, and the vertex shader wraps every star back to the far end once it
passes the camera:

```glsl
transformed.z = mod(position.z + uTravel, uDepth) - uDepth;
```

The camera never actually moves — the field streams past it. Consequences:

- Nothing is allocated or rebuilt per frame; the CPU only bumps one uniform.
- `uTravel` is kept inside `[0, depth)` on the JS side (`travel % depth`), so it
  never grows large enough to lose float precision, even after hours.
- Stars fade in over the last `fadeIn` fraction of the tunnel and fade out as
  they slide past the camera, so recycling is invisible — alpha is exactly 0 at
  the moment a star wraps.
- `points.frustumCulled = false`, because vertices move in the shader and the
  CPU-side bounding sphere is no longer a valid cull test.

## Running

ES module import maps need a real server; `file://` will not work.

```bash
# from the repository root
python -m http.server 8000
# then open http://localhost:8000/only-starfield/
```

## Tuning

Top of `index.js`:

| Knob | Effect |
| --- | --- |
| `NUM_STARS` | How many points fill the tunnel. |
| `DEPTH` | Tunnel length. Longer = more depth, but needs more stars for the same density. |
| `SPEED` | Travel speed in world units per second. One full wrap takes `DEPTH / SPEED` seconds. |
| `STAR_SIZE` | Base point size before perspective attenuation. |
| `ROLL_SPEED` | Slow roll around the travel axis. Set to `0` for a dead-straight flight. |
| `MAX_ASPECT` | Widest viewport the tunnel is built to cover (see below). |

`getStarfield()` also takes `radius`, `hue`, `saturation`, `fadeIn` and
`fadeNear`, and returns `{ points, material, update, setSpeed, setPixelRatio,
dispose }`.

To change speed at runtime — e.g. to accelerate on scroll — call
`starfield.setSpeed(n)`.

## Known limits

- The tunnel radius is computed once at startup for `MAX_ASPECT` (2.4, wider
  than 21:9). On a viewport wider than that the left and right edges would
  start to thin out; raise `MAX_ASPECT` and `NUM_STARS` together if you need it.
- Star count is a fixed budget spread through the whole cylinder, so most stars
  are off-screen at any moment. That is inherent to a pure-translation field:
  motion preserves each star's X/Y, so the volume cannot be trimmed to the
  frustum without recycling stars on the CPU instead.
