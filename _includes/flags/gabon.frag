precision mediump float;
uniform vec2 u_resolution;

float flip(float from, float to, float x) {
  return step(from, x) - step(to, x);
}

void main() {
  vec2 xy = gl_FragCoord.xy / u_resolution;
  float y = xy.y;
  vec3 color = vec3(0.0039, 0.5765, 0.3333) * flip(0.666, 1.0, y) +
               vec3(0.9882, 0.7922, 0.0902) * flip(0.333, 0.666, y) +
               vec3(0.1961, 0.4157, 0.7373) * flip(0.000, 0.333, y);
  gl_FragColor = vec4(color, 1.0);
}
