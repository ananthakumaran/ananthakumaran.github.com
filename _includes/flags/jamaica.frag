precision mediump float;
uniform vec2 u_resolution;

float flip(float from, float to, float x) {
  return step(from, x) - step(to, x);
}

float flip(vec2 from, vec2 to, vec2 x) {
  vec2 result = step(from, x) - step(to, x);
  return result.x * result.y;
}

vec3 overlay(vec3 background, vec3 foreground, float u) {
  return background * 1.0 + foreground * u - background * u;
}

void main() {
  vec2 xy = gl_FragCoord.xy / u_resolution;
  vec3 green = vec3(0.0078, 0.5647, 0.2000);
  vec3 yellow = vec3(0.9961, 0.7922, 0.0118);
  vec3 black = vec3(0.0, 0.0, 0.0);
  float width = 1.0 / 10.0;
  vec3 color = overlay(
      overlay(
          overlay(overlay(green, black,
                          flip(vec2(0.0, xy.x), vec2(0.5, (1.0 - xy.x)), xy)),
                  black, flip(vec2(0.5, (1.0 - xy.x)), vec2(1.0, xy.x), xy)),
          yellow, flip(xy.x - width, xy.x + width, xy.y)),
      yellow, flip(1.0 - xy.x - width, 1.0 - xy.x + width, xy.y));

  gl_FragColor = vec4(color, 1.0);
}
