export const saturnPlanetVertexShader = /* glsl */`
  uniform float size;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size;
    gl_Position = projectionMatrix * mv;
  }
`;

export const saturnPlanetFragmentShader = /* glsl */`
  uniform sampler2D colorTexture;
  varying vec2 vUv;

  void main() {
    vec3 c = texture2D(colorTexture, vUv).rgb;
    gl_FragColor = vec4(c, 0.5);
  }
`;

export const saturnRingVertexShader = /* glsl */`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 1.25;
  }
`;

export const saturnRingFragmentShader = /* glsl */`
  uniform sampler2D colorTexture;
  uniform sampler2D alphaTexture;
  varying vec2 vUv;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    if (dot(p, p) > 0.25) discard;
    vec4 texColor = texture2D(colorTexture, vUv);
    float alpha   = texture2D(alphaTexture, vUv).r;
    gl_FragColor  = vec4(texColor.rgb * 0.78, alpha * 0.75);
    #include <tonemapping_fragment>
  }
`;

export const atmosphereVertexShader = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const atmosphereFragmentShader = /* glsl */`
  uniform vec3 cameraPos;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 V = normalize(cameraPos - vWorldPos);
    float fres = pow(1.0 - max(dot(V, normalize(vNormal)), 0.0), 3.0);
    gl_FragColor = vec4(0.65, 0.75, 1.0, fres * 0.25);
  }
`;
