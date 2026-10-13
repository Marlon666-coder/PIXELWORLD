/** GLSL for the portal core and the holographic grid. Colour space conversion uses three.js chunks. */

export const portalVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const portalFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uBoost;
  uniform float uPixels;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // Quantize to a pixel grid for the 8-bit look.
    vec2 cell = floor(vUv * uPixels);
    vec2 uv = (cell + 0.5) / uPixels;
    vec2 p = uv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;

    float angle = atan(p.y, p.x);
    float t = uTime * (0.32 + uBoost * 0.55);
    float swirl = angle * 3.0 + r * 10.0 - t * 2.6;
    float bands = 0.5 + 0.5 * sin(swirl);
    float n = noise(vec2(angle * 2.2 + t * 0.7, r * 7.0 - t * 1.6));
    float energy = smoothstep(0.12, 1.0, bands * 0.62 + n * 0.52);

    float rim = smoothstep(0.3, 0.97, r);
    float core = 1.0 - smoothstep(0.0, 0.6, r);

    vec3 tint = mix(uColorB, uColorA, bands);
    tint = mix(tint, uColorC, n * 0.32);
    float intensity = (0.22 + energy * 1.45) * (0.3 + rim * 1.15) + uBoost * 0.75 * rim;
    vec3 deepSpace = vec3(0.012, 0.01, 0.045);
    vec3 color = mix(tint * intensity * 1.7, deepSpace, core * 0.78);

    float sparkle = step(0.986, hash(cell)) * core;
    color += vec3(0.75, 0.9, 1.0) * sparkle * (0.55 + 0.45 * sin(uTime * 2.7 + hash(cell + 3.0) * 6.2831));

    float alpha = 1.0 - smoothstep(0.95, 1.0, r);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

export const gridVertexShader = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const gridFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uAccent;
  varying vec3 vWorld;

  void main() {
    vec2 coord = vWorld.xz / 3.0;
    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);

    float distanceFromCenter = length(vWorld.xz);
    float fade = 1.0 - smoothstep(18.0, 120.0, distanceFromCenter);
    float wave = 0.6 + 0.4 * sin(uTime * 0.7 - distanceFromCenter * 0.09);
    vec3 color = mix(uColor, uAccent, 0.5 + 0.5 * sin(distanceFromCenter * 0.05 - uTime * 0.2));

    float alpha = line * fade * wave * 0.24;
    gl_FragColor = vec4(color * 1.6, alpha);
    #include <colorspace_fragment>
  }
`;
