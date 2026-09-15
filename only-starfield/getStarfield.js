import * as THREE from "three";

export default function getStarfield({
  numStars = 25000,
  depth = 120,
  radius = 240,
  size = 1.6,
  speed = 14,
  hue = 0.58,
  saturation = 0.25,
  fadeIn = 0.3,
  fadeNear = 8,
  pixelRatio = 1,
} = {}) {
  const positions = new Float32Array(numStars * 3);
  const colors = new Float32Array(numStars * 3);
  const scales = new Float32Array(numStars);
  const color = new THREE.Color();

  for (let i = 0; i < numStars; i += 1) {
    const r = radius * Math.sqrt(Math.random());
    const theta = Math.random() * Math.PI * 2;

    positions[i * 3 + 0] = Math.cos(theta) * r;
    positions[i * 3 + 1] = Math.sin(theta) * r;
    positions[i * 3 + 2] = -Math.random() * depth;

    color.setHSL(
      hue + (Math.random() - 0.5) * 0.12,
      saturation,
      0.6 + Math.random() * 0.4,
    );
    colors[i * 3 + 0] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    scales[i] = 0.4 + Math.random() * Math.random() * 1.8;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTravel: { value: 0 },
      uDepth: { value: depth },
      uSize: { value: size },
      uPixelRatio: { value: pixelRatio },
      uFadeIn: { value: fadeIn },
      uFadeNear: { value: fadeNear },
    },
    vertexShader: `
      uniform float uTravel;
      uniform float uDepth;
      uniform float uSize;
      uniform float uPixelRatio;
      uniform float uFadeIn;
      uniform float uFadeNear;

      attribute vec3 aColor;
      attribute float aScale;

      varying vec3 vColor;
      varying float vFade;

      void main() {
        vec3 transformed = position;
        transformed.z = mod(position.z + uTravel, uDepth) - uDepth;

        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float dist = max(-mvPosition.z, 0.001);

        gl_PointSize = min(
          uSize * aScale * uPixelRatio * (170.0 / dist),
          48.0 * uPixelRatio
        );

        float fadeFar = smoothstep(uDepth, uDepth * (1.0 - uFadeIn), dist);
        float fadeNear = smoothstep(0.0, uFadeNear, dist);
        vFade = fadeFar * fadeNear;

        vColor = aColor;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vFade;

      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;

        float alpha = pow(smoothstep(0.5, 0.0, d), 3.0);

        gl_FragColor = vec4(vColor, alpha * vFade);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);

  points.frustumCulled = false;

  let travel = 0;

  return {
    points,
    material: mat,

    update(delta) {
      travel = (travel + speed * delta) % depth;
      mat.uniforms.uTravel.value = travel;
    },

    setSpeed(next) {
      speed = next;
    },

    setPixelRatio(next) {
      mat.uniforms.uPixelRatio.value = next;
    },

    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
