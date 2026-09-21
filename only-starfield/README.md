# Infinite Starfield

A full-screen star background with a continuous camera flight through space.
No OBJ model, no matcap, no lights, no gradient sprite layer — and no scrolling:
the travel runs on its own, forever. A small GUI panel exposes the two knobs
worth playing with while it runs: star count and velocity.

Built on a stock `THREE.PointsMaterial` with the `circle.png` sprite from
`../assets/`, the same way `../libs/getStarfield.js` does it. No custom shaders.
The one added dependency is lil-gui, which the three package ships under
`examples/jsm/libs/` — where the import map already points.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Full-viewport canvas and the CSS backdrop. No page content — the GUI injects its own DOM and CSS at runtime. |
| `index.js` | Scene, camera, fog, render loop, the tuning knobs and the GUI wiring. |
| `getStarfield.js` | Builds the star tunnel and advances the flight. |

## How the infinite travel works

The parent demo scatters stars on a hollow **sphere shell** (radius 25–50) and
moves it on Z. That works for a short scroll-driven nudge, but travelling far
enough simply flies you out of the shell and the sky empties.

Here the stars fill a **cylinder** of length `depth` sitting in front of the
camera, and every frame `update()` walks the Z component of each active vertex
and recycles any star that has passed the camera:

```js
for (let i = 2; i < end; i += 3) {
  verts[i] += dz;
  if (verts[i] > 0) verts[i] -= depth;
}
attr.addUpdateRange(0, end);
attr.needsUpdate = true;
```

The camera never actually moves — the field streams past it. Stars stay inside
`[-depth, 0)`, so the bounding sphere computed on the first render stays valid
and frustum culling keeps working.

Two details make the recycling invisible without a shader to fade stars:

**Fog handles the far end.** `scene.fog` is black, starting at `FOG_START × DEPTH`
and reaching full strength at `DEPTH`. Under additive blending a fully fogged
star contributes nothing, so a recycled star rises out of the background instead
of popping into it.

**A hollow core handles the near end.** `sizeAttenuation` scales a point by
`1 / distance`, which grows without bound as a star approaches the camera — an
axis-hugging star would swell into a screen-filling blob and then blink out at
the near plane. No star is generated within `coreRadius` of the travel axis, so
they all leave through the edges of the screen while still small. The centre of
the screen stays populated regardless, because distant stars at that radius
still project close to the middle.

## The GUI

Two sliders sit in a lil-gui panel in the top-right corner, **Stars** and
**Velocity**. lil-gui resolves through the `jsm/` import-map prefix that was
already declared and unused, so it adds no CDN host, no `<script>` tag and no
stylesheet.

Velocity is the easy half — `setSpeed()` reassigns the closure variable the
wrap loop multiplies by `delta`.

Star count is the interesting half, because three refuses a resized buffer
attribute outright: *"Resizing buffer attributes is not supported."* Rebuilding
the geometry on every slider tick would dodge that, but it would also
re-randomise the whole field, so the stars you are looking at would teleport
each time you nudged the control.

Instead the buffer is allocated once at `MAX_STARS` and the slider only moves a
draw range over it:

```js
setCount(next) {
  count = Math.max(0, Math.min(Math.floor(next), maxCount));
  geo.setDrawRange(0, count);
}
```

Two field writes — no allocation, no GL call — so the control runs on `onChange`
and tracks the drag live. Stars outside the range stop being drawn but keep
their position, and since every star was born with a uniform random Z, raising
the count reveals no seam and no clump.

Initialising the *whole* buffer at startup is not optional, and zeroing is the
worst available default. Leave the colour tail at `(0, 0, 0)` and those stars
are invisible under additive blending, so raising the slider appears to do
nothing at all. Fill in the colours but not the positions and the other half
bites instead: every spare star sits at the origin, dead centre of the screen
and right on the camera, where additive blending stacks them into a single
strobing dot. Randomising both, once, at startup, is what makes the draw range
safe to move.

The same `count` bounds the wrap loop through `end = count * 3`, and
`addUpdateRange(0, end)` uploads only that prefix, so dialling the count down
really does cost less per frame rather than just drawing less.

## Running

ES module import maps and the sprite texture both need a real server;
`file://` will not work.

```bash
# from the repository root
python -m http.server 8000
# then open http://localhost:8000/only-starfield/
```

## Tuning

Top of `index.js`. `NUM_STARS` and `SPEED` are starting values the GUI then
overrides; the rest are build-time only.

| Knob | Effect |
| --- | --- |
| `NUM_STARS` | How many points fill the tunnel at startup. |
| `MIN_STARS` | Lowest count the Stars slider reaches. |
| `MAX_STARS` | Highest count the slider reaches, and the size of the allocated buffer. |
| `STARS_STEP` | Stars slider granularity. |
| `DEPTH` | Tunnel length. Longer = more depth, but needs more stars for the same density. |
| `SPEED` | Travel speed at startup, in world units per second. One full wrap takes `DEPTH / SPEED` seconds. |
| `MAX_SPEED` | Fastest the Velocity slider goes. The single-subtract wrap holds while `MAX_SPEED × 0.1` stays below `DEPTH`. |
| `SPEED_STEP` | Velocity slider granularity. |
| `STAR_SIZE` | `PointsMaterial` size, in world units. |
| `CORE_RADIUS` | Radius of the empty channel around the travel axis. Lower it and close stars get bigger — and eventually blink out. |
| `ROLL_SPEED` | Slow roll around the travel axis. Set to `0` for a dead-straight flight. |
| `FOG_START` | Fraction of `DEPTH` where stars begin to fade in. |
| `MAX_ASPECT` | Widest viewport the tunnel is built to cover (see below). |

`getStarfield()` also takes `maxStars`, `radius`, `hue`, `saturation` and
`texturePath`, and returns
`{ points, material, maxCount, update, setCount, setSpeed, dispose }`.

Both runtime hooks are what the GUI drives: `starfield.setSpeed(n)` sets travel
speed and `starfield.setCount(n)` moves the draw range. Neither allocates, so
either is safe to call every frame — from a slider, or from anything else, e.g.
to accelerate on scroll.

## Known limits

- **No per-star size.** `PointsMaterial` has a single `size` for the whole
  object, so per-star variety comes from brightness (`vertexColors`) instead.
  For real size variation you would need either several `Points` objects at
  different sizes, or a custom shader.
- **The position buffer is re-uploaded every frame** (the current count × 3
  floats — ~300 KB at the default 25 000, 1.2 MB at the `MAX_STARS` ceiling).
  `addUpdateRange` keeps that proportional to the count being drawn rather than
  to the whole allocation. Fine at this scale, but it is the cost of wrapping on
  the CPU rather than in a vertex shader.
- **The star buffer is allocated once at `MAX_STARS` and never resized**, since
  three throws on a resized attribute. That costs 24 bytes per allocated star —
  2.4 MB at the default ceiling — whether it is drawn or not, plus a slightly
  longer startup while the whole buffer is randomised.
- The tunnel radius is computed once at startup for `MAX_ASPECT` (2.4, wider
  than 21:9). On a viewport wider than that the left and right edges would
  start to thin out; raise `MAX_ASPECT` and `NUM_STARS` together if you need it.
- Star count is a bounded budget spread through the whole cylinder, so most
  stars are off-screen at any moment. That is inherent to a pure-translation
  field: motion preserves each star's X/Y, so the volume cannot be trimmed to
  the frustum shape.
