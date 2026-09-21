import * as THREE from "three";

export default function getStarfield({
  numStars = 25000,
  maxStars = 100000,
  depth = 120,
  radius = 240,
  coreRadius = 6,
  size = 0.5,
  speed = 14,
  hue = 0.58,
  saturation = 0.25,
  texturePath = "../assets/circle.png",
} = {}) {
  const maxCount = Math.max(maxStars, numStars);
  let count = Math.min(numStars, maxCount);

  const verts = new Float32Array(maxCount * 3);
  const colors = new Float32Array(maxCount * 3);
  const color = new THREE.Color();

  const rMinSq = coreRadius * coreRadius;
  const rMaxSq = radius * radius;

  for (let i = 0; i < maxCount; i += 1) {
    const r = Math.sqrt(rMinSq + Math.random() * (rMaxSq - rMinSq));
    const theta = Math.random() * Math.PI * 2;
    const o = i * 3;

    verts[o] = Math.cos(theta) * r;
    verts[o + 1] = Math.sin(theta) * r;
    verts[o + 2] = -Math.random() * depth;

    color.setHSL(
      hue + (Math.random() - 0.5) * 0.12,
      saturation,
      0.5 + Math.random() * 0.5,
    );

    colors[o] = color.r;
    colors[o + 1] = color.g;
    colors[o + 2] = color.b;
  }

  const attr = new THREE.BufferAttribute(verts, 3);
  attr.setUsage(THREE.DynamicDrawUsage);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", attr);
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setDrawRange(0, count);

  const mat = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    map: new THREE.TextureLoader().load(texturePath),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
    fog: true,
  });

  const points = new THREE.Points(geo, mat);

  return {
    points,
    material: mat,
    maxCount,

    update(delta) {
      const dz = speed * delta;
      if (count === 0 || dz === 0) return;

      const end = count * 3;

      for (let i = 2; i < end; i += 3) {
        verts[i] += dz;
        if (verts[i] > 0) verts[i] -= depth;
      }

      attr.addUpdateRange(0, end);
      attr.needsUpdate = true;
    },

    setCount(next) {
      count = Math.max(0, Math.min(Math.floor(next), maxCount));
      geo.setDrawRange(0, count);
    },

    setSpeed(next) {
      speed = next;
    },

    dispose() {
      geo.dispose();
      mat.map?.dispose();
      mat.dispose();
    },
  };
}
