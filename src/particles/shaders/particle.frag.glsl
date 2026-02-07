varying vec3 vColor;
varying float vLife;

void main() {
  // Distance from center of point sprite [0.0 at center, 0.5 at edge]
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  // Discard outside the circle (circular mask)
  if (dist > 0.5) discard;

  // Soft exponential falloff: sharp core + soft halo
  float glow = exp(-dist * 6.0) * 0.8 + exp(-dist * 2.0) * 0.2;

  // Fade in at birth, fade out at death
  float fade = smoothstep(0.0, 0.15, vLife) * smoothstep(1.0, 0.85, vLife);

  gl_FragColor = vec4(vColor * glow, glow * fade);
}
