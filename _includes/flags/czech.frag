precision mediump float;
uniform vec2 u_resolution;

float flip(float from, float to, float x) {
  return step(from, x) - step(to, x);
}

void main() {
  vec2 xy = gl_FragCoord.xy / u_resolution;
  vec3 color =
      vec3(0.8353, 0.0980, 0.1412) * flip(0.0001, min(0.5, xy.x), xy.y) +
      vec3(1.0, 1.0, 1.0) * flip(max(0.5, 1.0 - xy.x), 1.0, xy.y) +
      vec3(0.0824, 0.2745, 0.4863) *
          flip(xy.x, 1.0 - xy.x, xy.y * flip(0.0, 0.5, xy.x));
  gl_FragColor = vec4(color, 1.0);
}
