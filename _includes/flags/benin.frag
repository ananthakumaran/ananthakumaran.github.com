precision mediump float;
uniform vec2 u_resolution;

float flip(float from, float to, float x) {
  return step(from, x) - step(to, x);
}

void main() {
  vec2 xy = gl_FragCoord.xy / u_resolution;
  vec3 color = vec3(0.0039, 0.4863, 0.2784) * flip(0.000, 0.4, xy.x) +
               vec3(0.8980, 0.0627, 0.1569) *
                   flip(0.00001, 0.5, flip(0.4, 1.0, xy.x) * xy.y) +
               vec3(0.9882, 0.7922, 0.0902) *
                   flip(0.5, 1.0, flip(0.4, 1.0, xy.x) * xy.y);
  gl_FragColor = vec4(color, 1.0);
}
