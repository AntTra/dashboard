'use client';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useEffect, useRef, useState } from 'react';

// Import textures (Next will give StaticImageData)
import earthmap from './solarTextures/00_earthmap1k.jpg';
import earthbump from './solarTextures/01_earthbump1k.jpg';
import earthspec from './solarTextures/02_earthspec1k.jpg';
import earthlights from './solarTextures/03_earthlights1k.jpg';
import earthcloudmap from './solarTextures/04_earthcloudmap.jpg';
import earthcloudmaptrans from './solarTextures/05_earthcloudmaptrans.jpg';
import moonbump from './solarTextures/moonbump1k.jpg'
import moonmap from './solarTextures/moonmap1k.jpg'
import saturnmap from './solarTextures/saturnmap.jpg'
import saturnringmap from './solarTextures/saturnringcolor.jpg'
import saturntrans from './solarTextures/saturnringpattern.gif'
type Img = {src: string};

export default function Globe({mode}: {mode: 'earth' | 'saturn'}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // Sizes
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    // Tilt “global” axis a bit (nice touch for Earth)
    scene.rotation.z = (-23.4 * Math.PI) / 180;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 3);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Loader
    const loader = new THREE.TextureLoader();

    // Groups
    const earthGroup = new THREE.Group();
    const moonGroup = new THREE.Group();
    const saturnGroup = new THREE.Group();
    scene.add(earthGroup, moonGroup, saturnGroup);

    // Shared point-sphere geometry
    const detail = 120;
    const spherePointsGeo = new THREE.IcosahedronGeometry(1, detail);

    // === Earth + Moon ===
    if (mode === 'earth') {
      const map = loader.load((earthmap as unknown as Img).src);
      const bumpMap = loader.load((earthbump as unknown as Img).src);
      const specMap = loader.load((earthspec as unknown as Img).src);
      const lightsMap = loader.load((earthlights as unknown as Img).src);
      const cloudsMap = loader.load((earthcloudmap as unknown as Img).src);
      const cloudsAlpha = loader.load((earthcloudmaptrans as unknown as Img).src);
      const moonBump = loader.load((moonbump as unknown as Img).src);
      const moonMap = loader.load((moonmap as unknown as Img).src);

      // Basic wireframe shell (reference grid)
      const grid = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 10),
        new THREE.MeshBasicMaterial({color: 0x222222, wireframe: true})
      );
      earthGroup.add(grid);

      // Earth points shader
      const vertexShader = `
        uniform float size;
        uniform float elev;
        uniform sampler2D elevTexture;
        varying vec2 vUv;
        varying float vVisible;
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float elv = texture2D(elevTexture, vUv).r;
          vec3 vNormal = normalMatrix * normal;
          vVisible = step(-1.0, dot(-normalize(mvPosition.xyz), normalize(vNormal)));
          mvPosition.z += elev * elv;
          gl_PointSize = size;
          gl_Position = projectionMatrix * mvPosition;
        }
      `;
      const fragmentShader = `
        uniform sampler2D colorTexture;
        uniform sampler2D alphaTexture;
        varying vec2 vUv;
        varying float vVisible;
        void main() {
          if (floor(vVisible + 0.1) == 0.0) discard;
          float alpha = 1.03 - texture2D(alphaTexture, vUv).r;
          vec3 color = texture2D(colorTexture, vUv).rgb;
          gl_FragColor = vec4(color, alpha);
        }
      `;
      const earthMat = new THREE.ShaderMaterial({
        uniforms: {
          size: {value: 2.0},
          elev: {value: 2.0},
          colorTexture: {value: map},
          elevTexture: {value: bumpMap},
          alphaTexture: {value: specMap},
        },
        vertexShader,
        fragmentShader,
        transparent: true,
      });
      const earthPoints = new THREE.Points(spherePointsGeo, earthMat);
      earthGroup.add(earthPoints);

      // Moon points shader (simpler)
      const moonMat = new THREE.ShaderMaterial({
        uniforms: {
          size: {value: 1.5},
          elev: {value: 2.0},
          colorTexture: {value: moonMap},
          elevTexture: {value: moonBump},
          alphaTexture: {value: 0},
        },
        vertexShader,
        fragmentShader,
        transparent: false,
      });
      const moonPoints = new THREE.Points(spherePointsGeo, moonMat);
      moonPoints.position.set(2, 0, 0);
      moonPoints.scale.setScalar(0.27);
      moonGroup.add(moonPoints);
    }

    // === Saturn (points planet + textured point rings) ===
    if (mode === 'saturn') {
      const saturnMapTex = loader.load((saturnmap as unknown as Img).src);
      const saturnRingTexture = loader.load((saturnringmap as unknown as Img).src);
      const saturnRingAlpha = loader.load((saturntrans as unknown as Img).src);

      // Mark color textures as sRGB
      saturnMapTex.colorSpace = THREE.SRGBColorSpace;
      saturnRingTexture.colorSpace = THREE.SRGBColorSpace;

      // Planet (points shader using colorTexture only)
      const planetVert = `
        uniform float size;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
          gl_Position = projectionMatrix * mv;
        }
      `;
      const planetFrag = `
        uniform sampler2D colorTexture;
        varying vec2 vUv;
        void main() {
          vec3 c = texture2D(colorTexture, vUv).rgb;
          gl_FragColor = vec4(c, 1.0);
        }
      `;
      const saturnMat = new THREE.ShaderMaterial({
        uniforms: {
          size: {value: 3.0},
          colorTexture: {value: saturnMapTex},
        },
        vertexShader: planetVert,
        fragmentShader: planetFrag,
        transparent: false,
      });
	  
      const saturnPoints = new THREE.Points(spherePointsGeo, saturnMat);

      // Ring point cloud using textures (color + alpha)
      const R_INNER = 1.2;
      const R_OUTER = 2.0;
      const RING_COUNT = 2_000_000;
      const VERTICAL_THICKNESS = 0.02;

      const ringPositions = new Float32Array(RING_COUNT * 3);
      const ringUVs = new Float32Array(RING_COUNT * 2);

      for (let i = 0; i < RING_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const t = Math.random();
        const r = R_INNER + (R_OUTER - R_INNER) * Math.pow(t, 1.8);
        const x = r * Math.cos(theta);
        const y = (Math.random() - 0.5) * VERTICAL_THICKNESS;
        const z = r * Math.sin(theta);

        const i3 = i * 3;
        ringPositions[i3 + 0] = x;
        ringPositions[i3 + 1] = y;
        ringPositions[i3 + 2] = z;

        const i2 = i * 2;
        ringUVs[i2 + 0] = (r - R_INNER) / (R_OUTER - R_INNER);
        ringUVs[i2 + 1] = 0.5;
      }

      const saturnRingGeo = new THREE.BufferGeometry();
      saturnRingGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
      saturnRingGeo.setAttribute('uv', new THREE.BufferAttribute(ringUVs, 2));

      const ringVertex = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 1.25;
        }
      `;
      const ringFragment = `
        uniform sampler2D colorTexture;
        uniform sampler2D alphaTexture;
        varying vec2 vUv;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          if (dot(p,p) > 0.25) discard;

          vec4 texColor = texture2D(colorTexture, vUv);
          float alpha = texture2D(alphaTexture, vUv).r;

          vec3 rgb = texColor.rgb * 0.78;
          float a = alpha * 0.75;

          gl_FragColor = vec4(rgb, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `;

      const saturnRingMat = new THREE.ShaderMaterial({
        uniforms: {
          colorTexture: {value: saturnRingTexture},
          alphaTexture: {value: saturnRingAlpha},
        },
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        transparent: true,
        depthWrite: false,
        depthTest: true,
      });

      const saturnRingPoints = new THREE.Points(saturnRingGeo, saturnRingMat);

      const atmGeo = new THREE.SphereGeometry(1.005, 64, 64);
      const atmMat = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          uniform vec3 cameraPos;
          void main() {
            vec3 V = normalize(cameraPos - vWorldPos);
            float fres = pow(1.0 - max(dot(V, normalize(vNormal)), 0.0), 3.0);
            gl_FragColor = vec4(0.65, 0.75, 1.0, fres * 0.25);
          }
        `,
        uniforms: {cameraPos: {value: new THREE.Vector3()}},
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      });
      const atmosphere = new THREE.Mesh(atmGeo, atmMat);

      saturnGroup.add(saturnRingPoints);
      saturnGroup.add(saturnPoints);
      saturnGroup.add(atmosphere);
      saturnGroup.rotation.z = (26.7 * Math.PI) / 180; // Saturn obliquity-ish

      const updateAtm = () => {
        atmMat.uniforms.cameraPos.value.copy(camera.position);
      };
      saturnGroup.userData.updateAtm = updateAtm;
    }

    let rafId = 0;
    let last = performance.now();
    let frames = 0;
    let accTime = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;

      frames++;
      accTime += dt;
      if (accTime >= 1) {
        setFps(frames);
        frames = 0;
        accTime = 0;
      }

      if (mode === 'earth') {
        earthGroup.rotateY(0.001);
        earthGroup.rotateX(-0.0001);
        moonGroup.rotateY(-0.002);
      } else {
        saturnGroup.rotateY(0.001);
        // @ts-ignore
        if (saturnGroup.userData.updateAtm) saturnGroup.userData.updateAtm();
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (!w || !h) return;
      width = w;
      height = h;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    window.addEventListener('resize', onResize);

    // Cleanup
	return () => {
		cancelAnimationFrame(rafId);
		ro.disconnect();
		window.removeEventListener('resize', onResize);
		controls.dispose();
		renderer.dispose();

		scene.traverse((obj) => {
			if ((obj as THREE.Mesh).geometry) {
			(obj as THREE.Mesh).geometry.dispose();
			}
			if ((obj as THREE.Mesh).material) {
			const mat = (obj as THREE.Mesh).material as THREE.Material;
			mat.dispose();
			}
		});

		// remove canvas
		if (renderer.domElement && container.contains(renderer.domElement)) {
			container.removeChild(renderer.domElement);
		}
	};
  }, [mode]);

  const fpsColor =
    fps >= 60 ? 'text-green-400' : fps >= 30 ? 'text-yellow-300' : 'text-red-400';

  return (
    <div ref={mountRef} className="relative w-full h-full">
      <div
        className={`absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 font-mono text-xs pointer-events-none select-none ${fpsColor}`}
      >
        {fps} FPS
      </div>
    </div>
  );
}
