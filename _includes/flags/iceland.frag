precision mediump float;
uniform vec2 u_resolution;

float flip(float from, float to, float x) {
  return step(from, x) - step(to, x);
}

vec3 overlay(vec3 background, float t, vec3 foreground, float u) {
  return background * t + foreground * u - background * u;
}

void main() {
  vec2 xy = gl_FragCoord.xy / u_resolution;
  vec3 blue = vec3(0.0235, 0.2314, 0.5843);
  vec3 white = vec3(1.0, 1.0, 10);
  vec3 red = vec3(0.8353, 0.1686, 0.1843);
  vec3 color =
      overlay(overlay(overlay(overlay(blue, 1.0, white,
                                      flip(2.0 / 5.0, 3.0 / 5.0, xy.y)),
                              1.0, white, flip(2.0 / 8.0, 3.0 / 8.0, xy.x)),
                      1.0, red, flip(2.25 / 5.0, 2.75 / 5.0, xy.y)),
              1.0, red, flip(2.25 / 8.0, 2.75 / 8.0, xy.x));
  gl_FragColor = vec4(color, 1.0);
}
