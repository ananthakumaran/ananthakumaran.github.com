precision mediump float;
uniform vec2 u_resolution;

float flip(float from, float to, float x) {
  return step(from, x) - step(to, x);
}

void main() {
  vec2 xy = gl_FragCoord.xy / u_resolution;
  vec3 color =
      vec3(1.0, 1.0, 1.0) *
          flip(0.001, 2.0 / 5.0, flip(0.0, 2.0 / 8.0, xy.x) * xy.y) +
      vec3(1.0, 1.0, 1.0) *
          flip(0.001, 2.0 / 5.0, flip(3.0 / 8.0, 1.0, xy.x) * xy.y) +
      vec3(1.0, 1.0, 1.0) *
          flip(3.0 / 5.0, 1.0, flip(0.0, 2.0 / 8.0, xy.x) * xy.y) +
      vec3(1.0, 1.0, 1.0) *
          flip(3.0 / 5.0, 1.0, flip(3.0 / 8.0, 1.0, xy.x) * xy.y) +
      vec3(0.0196, 0.2157, 0.4941) * flip(2.0 / 5.0, 3.0 / 5.0, xy.y) +
      vec3(0.0196, 0.2157, 0.4941) * flip(2.0 / 8.0, 3.0 / 8.0, xy.x) -
      vec3(0.0196, 0.2157, 0.4941) *
          flip(2.0 / 8.0, 3.0 / 8.0, xy.x * flip(2.0 / 5.0, 3.0 / 5.0, xy.y));
  gl_FragColor = vec4(color, 1.0);
}
