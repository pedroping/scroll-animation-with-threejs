# Infinite Starfield

A full-screen star background with a continuous camera flight through space.
No OBJ model, no matcap, no lights, no gradient sprite layer — and no scrolling:
the travel runs on its own, forever.

Built on a stock `THREE.PointsMaterial` with the `circle.png` sprite from
`../assets/`, the same way `../libs/getStarfield.js` does it. No custom shaders.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Full-viewport canvas and the CSS backdrop. No page content. |
| `index.js` | Scene, camera, fog, render loop and the tuning knobs. |
| `getStarfield.js` | Builds the star tunnel and advances the flight. |

## How the infinite travel works

The parent demo scatters stars on a hollow **sphere shell** (radius 25–50) and
moves it on Z. That works for a short scroll-driven nudge, but travelling far
enough simply flies you out of the shell and the sky empties.

Here the stars fill a **cylinder** of length `depth` sitting in front of the
camera, and every frame `update()` walks the Z component of each vertex and
recycles any star that has passed the camera:

```js
for (let i = 2; i < arr.length; i += 3) {
  arr[i] += dz;
  if (arr[i] > 0) arr[i] -= depth;
}
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

## Running

ES module import maps and the sprite texture both need a real server;
`file://` will not work.

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
| `STAR_SIZE` | `PointsMaterial` size, in world units. |
| `CORE_RADIUS` | Radius of the empty channel around the travel axis. Lower it and close stars get bigger — and eventually blink out. |
| `ROLL_SPEED` | Slow roll around the travel axis. Set to `0` for a dead-straight flight. |
| `FOG_START` | Fraction of `DEPTH` where stars begin to fade in. |
| `MAX_ASPECT` | Widest viewport the tunnel is built to cover (see below). |

`getStarfield()` also takes `radius`, `hue`, `saturation` and `texturePath`, and
returns `{ points, material, update, setSpeed, dispose }`.

To change speed at runtime — e.g. to accelerate on scroll — call
`starfield.setSpeed(n)`.

## Known limits

- **No per-star size.** `PointsMaterial` has a single `size` for the whole
  object, so per-star variety comes from brightness (`vertexColors`) instead.
  For real size variation you would need either several `Points` objects at
  different sizes, or a custom shader.
- **The position buffer is re-uploaded every frame** (`NUM_STARS × 3` floats,
  ~300 KB at the default count). Fine at this scale, but it is the cost of
  wrapping on the CPU rather than in a vertex shader.
- The tunnel radius is computed once at startup for `MAX_ASPECT` (2.4, wider
  than 21:9). On a viewport wider than that the left and right edges would
  start to thin out; raise `MAX_ASPECT` and `NUM_STARS` together if you need it.
- Star count is a fixed budget spread through the whole cylinder, so most stars
  are off-screen at any moment. That is inherent to a pure-translation field:
  motion preserves each star's X/Y, so the volume cannot be trimmed to the
  frustum shape.
