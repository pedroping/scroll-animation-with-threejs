import * as THREE from "three";

export default function getStarfield({
  numStars = 25000,
  depth = 120,
  radius = 240,
  coreRadius = 6,
  size = 0.5,
  speed = 14,
  hue = 0.58,
  saturation = 0.25,
  texturePath = "../assets/circle.png",
} = {}) {
  const verts = [];
  const colors = [];
  const color = new THREE.Color();

  const rMinSq = coreRadius * coreRadius;
  const rMaxSq = radius * radius;

  for (let i = 0; i < numStars; i += 1) {
    const r = Math.sqrt(rMinSq + Math.random() * (rMaxSq - rMinSq));
    const theta = Math.random() * Math.PI * 2;

    verts.push(
      Math.cos(theta) * r,
      Math.sin(theta) * r,
      -Math.random() * depth,
    );

    color.setHSL(
      hue + (Math.random() - 0.5) * 0.12,
      saturation,
      0.5 + Math.random() * 0.5,
    );
    colors.push(color.r, color.g, color.b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

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

  const attr = geo.attributes.position;
  const arr = attr.array;

  return {
    points,
    material: mat,

    update(delta) {
      const dz = speed * delta;

      for (let i = 2; i < arr.length; i += 3) {
        arr[i] += dz;
        if (arr[i] > 0) arr[i] -= depth;
      }

      attr.needsUpdate = true;
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
