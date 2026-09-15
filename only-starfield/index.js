import * as THREE from "three";
import getStarfield from "./getStarfield.js";

const NUM_STARS = 25000;
const DEPTH = 120;
const SPEED = 14;
const STAR_SIZE = 1.6;
const ROLL_SPEED = 0.03;
const MAX_ASPECT = 2.4;

const canvas = document.getElementById("three-canvas");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  DEPTH + 10,
);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  canvas,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

camera.position.set(0, 0, 0);

function tunnelRadius() {
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * DEPTH;
  const halfWidth = halfHeight * Math.max(camera.aspect, MAX_ASPECT);
  return Math.hypot(halfHeight, halfWidth) * 1.05;
}

const starfield = getStarfield({
  numStars: NUM_STARS,
  depth: DEPTH,
  radius: tunnelRadius(),
  size: STAR_SIZE,
  speed: SPEED,
  pixelRatio: renderer.getPixelRatio(),
});
scene.add(starfield.points);

const clock = new THREE.Clock();

function animate() {
  const delta = Math.min(clock.getDelta(), 0.1);

  starfield.update(delta);
  starfield.points.rotation.z += ROLL_SPEED * delta;

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener(
  "resize",
  () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    starfield.setPixelRatio(renderer.getPixelRatio());
  },
  false,
);
