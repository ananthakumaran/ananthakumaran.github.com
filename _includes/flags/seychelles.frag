precision mediump float;
uniform vec2 u_resolution;

float flip(float from, float to, float x) {
  return step(from, x) - step(to, x);
}

vec3 overlay(vec3 background, vec3 foreground, float u) {
  return background * 1.0 + foreground * u - background * u;
}

void main() {
  vec2 xy = gl_FragCoord.xy / u_resolution;
  vec3 blue = vec3(0.0000, 0.2157, 0.4863);
  vec3 green = vec3(0.0039, 0.4353, 0.2078);
  vec3 yellow = vec3(0.9882, 0.8235, 0.2980);
  vec3 red = vec3(0.8157, 0.1373, 0.1412);
  vec3 white = vec3(1.0, 1.0, 1.0);

  vec3 color = overlay(
      overlay(overlay(overlay(blue, yellow, flip(0.0, 2.5 * xy.x, xy.y)), red,
                      flip(0.0, 1.2 * xy.x, xy.y)),
              white, flip(0.0, 0.7 * xy.x, xy.y)),
      green, flip(0.0, 0.3 * xy.x, xy.y));

  gl_FragColor = vec4(color, 1.0);
}
