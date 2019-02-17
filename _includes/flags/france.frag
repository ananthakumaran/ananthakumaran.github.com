precision mediump float;
uniform vec2 u_resolution;

float flip(float from, float to, float x) {
  return step(from, x) - step(to, x);
}

void main() {
  vec2 xy = gl_FragCoord.xy / u_resolution;
  float x = xy.x;
  vec3 color = vec3(0.0000, 0.1255, 0.5412) * flip(0.000, 0.333, x) +
               vec3(1.0, 1.0, 1.0) * flip(0.333, 0.666, x) +
               vec3(0.9176, 0.1412, 0.1961) * flip(0.666, 1.0, x);
  gl_FragColor = vec4(color, 1.0);
}
