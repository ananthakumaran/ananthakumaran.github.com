precision mediump float;
uniform vec2 u_resolution;

float flip(float from, float to, float x) {
  return step(from, x) - step(to, x);
}

vec3 overlay(vec3 background, vec3 foreground, float u) {
  return background * 1.0 + foreground * u - background * u;
}

void main() {
  vec2 st = gl_FragCoord.xy - (u_resolution * 0.5);
  st = st / u_resolution.y;
  vec3 red = vec3(0.7059, 0.0000, 0.1569);

  vec3 color =
      overlay(vec3(1.0), red, flip(0.0, 0.25, distance(vec2(0.0, 0.0), st)));

  gl_FragColor = vec4(color, 1.0);
}
