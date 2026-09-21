import { GUI } from "jsm/libs/lil-gui.module.min.js";
import * as THREE from "three";
import getStarfield from "./getStarfield.js";

const NUM_STARS = 25000;
const MIN_STARS = 1000;
const MAX_STARS = 100000;
const STARS_STEP = 1000;
const DEPTH = 120;
const SPEED = 14;
const MAX_SPEED = 80;
const SPEED_STEP = 0.5;
const STAR_SIZE = 0.5;
const CORE_RADIUS = 6;
const ROLL_SPEED = 0.03;
const FOG_START = 0.45;
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
scene.fog = new THREE.Fog(0x000000, DEPTH * FOG_START, DEPTH);

function tunnelRadius() {
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * DEPTH;
  const halfWidth = halfHeight * Math.max(camera.aspect, MAX_ASPECT);
  return Math.hypot(halfHeight, halfWidth) * 1.05;
}

const starfield = getStarfield({
  numStars: NUM_STARS,
  maxStars: MAX_STARS,
  depth: DEPTH,
  radius: tunnelRadius(),
  coreRadius: CORE_RADIUS,
  size: STAR_SIZE,
  speed: SPEED,
});
scene.add(starfield.points);

const params = { stars: NUM_STARS, speed: SPEED };
const gui = new GUI({ title: "Starfield" });

gui
  .add(params, "stars", MIN_STARS, starfield.maxCount, STARS_STEP)
  .name("Stars")
  .onChange((value) => starfield.setCount(value));

gui
  .add(params, "speed", 0, MAX_SPEED, SPEED_STEP)
  .name("Velocity")
  .onChange((value) => starfield.setSpeed(value));

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
  },
  false,
);
