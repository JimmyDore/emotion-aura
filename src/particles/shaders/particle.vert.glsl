#include "noise3d.glsl"

uniform float uTime;
uniform float uPixelRatio;
uniform vec2 uSpawnCenter;

attribute float aSize;
attribute vec3 aColor;
attribute float aLife;

varying vec3 vColor;
varying float vLife;

void main() {
  vColor = aColor;
  vLife = aLife;

  // Apply simplex noise displacement for organic motion
  vec3 displaced = position;
  displaced.x += snoise(vec3(position.xy * 0.5, uTime * 0.3)) * 0.05;
  displaced.y += snoise(vec3(position.yx * 0.5, uTime * 0.3 + 100.0)) * 0.05;

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);

  // Scale point size by pixel ratio for HiDPI (orthographic camera — no distance scaling)
  gl_PointSize = aSize * uPixelRatio;
  gl_Position = projectionMatrix * mvPosition;
}
