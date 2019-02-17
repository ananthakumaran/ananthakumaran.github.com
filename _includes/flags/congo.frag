precision mediump float;
uniform vec2 u_resolution;

float flip(float from, float to, float x) {
  return step(from, x) - step(to, x);
}
void main() {
  vec2 xy = gl_FragCoord.xy / u_resolution;
  vec3 green = vec3(0.0784, 0.5804, 0.2784);
  vec3 yellow = vec3(0.9804, 0.8667, 0.3451);
  vec3 red = vec3(0.8549, 0.1529, 0.1569);
  vec3 color =
      green * flip(xy.x * 3.0 / 2.0, 1.0, xy.y * flip(0.0, 2.0 / 3.0, xy.x)) +
      red * flip(0.0001, max((xy.x - 1.0 / 3.0) * 3.0 / 2.0, 0.0001),
                 xy.y * flip(1.0 / 3.0, 1.0, xy.x)) +
      yellow * flip(max((xy.x - 1.0 / 3.0) * 3.0 / 2.0, 0.0001),
                    min(1.0, xy.x * 3.0 / 2.0), xy.y);

  gl_FragColor = vec4(color, 1.0);
}
