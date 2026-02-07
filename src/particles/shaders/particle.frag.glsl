varying vec3 vColor;
varying float vLife;

void main() {
  // Distance from center of point sprite [0.0 at center, 0.5 at edge]
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  // Discard outside the circle (circular mask)
  if (dist > 0.5) discard;

  // Neon spark: tight bright core + medium glow halo + soft outer reach
  float core  = exp(-dist * 12.0);          // bright center spark
  float halo  = exp(-dist * 4.0) * 0.5;     // energy halo
  float outer = exp(-dist * 1.5) * 0.15;    // subtle atmospheric glow
  float glow = core + halo + outer;

  // Quick fade-in, slower fade-out for spark trail feel
  float fade = smoothstep(0.0, 0.08, vLife) * smoothstep(1.0, 0.75, vLife);

  // Color boost: neon sparks should be overbright at core
  // Additive blending handles values > 1.0 gracefully
  gl_FragColor = vec4(vColor * glow * 1.4, glow * fade);
}
