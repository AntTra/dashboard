export const earthVertexShader = /* glsl */`
  uniform float size;
  uniform float elev;
  uniform float cameraDistance;
  uniform sampler2D elevTexture;
  uniform float thresh;
  varying vec2 vUv;
  varying float vVisible;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float elv = texture2D(elevTexture, vUv).r;
    vec3 vNormal = normalMatrix * normal;
    vVisible = step(thresh, dot(-normalize(mvPosition.xyz), normalize(vNormal)));
    mvPosition.z += elev * elv;
    float dist = -mvPosition.z;
    gl_PointSize = size * (4.0 / (dist + 0.1));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const earthFragmentShader = /* glsl */`
  uniform sampler2D colorTexture;
  uniform sampler2D alphaTexture;
  uniform float alpha;
  varying vec2 vUv;
  varying float vVisible;

  void main() {
    if (floor(vVisible + 0.1) == 0.0) discard;
    float a = alpha - texture2D(alphaTexture, vUv).r;
    vec3 color = texture2D(colorTexture, vUv).rgb;
    gl_FragColor = vec4(color, a);
  }
`;
