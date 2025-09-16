'use client';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useEffect, useRef } from 'react';

// Import textures (Next will give StaticImageData)
import earthmap from './solarTextures/00_earthmap1k.jpg';
import earthbump from './solarTextures/01_earthbump1k.jpg';
import earthspec from './solarTextures/02_earthspec1k.jpg';
import earthlights from './solarTextures/03_earthlights1k.jpg';
import earthcloudmap from './solarTextures/04_earthcloudmap.jpg';
import earthcloudmaptrans from './solarTextures/05_earthcloudmaptrans.jpg';
import moonbump from './solarTextures/moonbump1k.jpg'
import moonmap from './solarTextures/moonmap1k.jpg'

type Img = { src: string };

interface IMyProps {
  	myValue: boolean;
}

const Globe: React.FC<IMyProps> = () => {
  	const mountRef = useRef<HTMLDivElement>(null);

  	useEffect(() => {
		if (!mountRef.current) return;
		const container = mountRef.current;

		let width = container.clientWidth || 1280;
		let height = container.clientHeight || 640;

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x000000);
		scene.rotation.z = (-23.4 * Math.PI) / 180;

		const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
		camera.position.set(0, 0, 3);

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(width, height);
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;

		container.appendChild(renderer.domElement);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;

		const amb = new THREE.AmbientLight(0x404040, 0.1);
		scene.add(amb);

		const loader = new THREE.TextureLoader();
		const map = loader.load((earthmap as unknown as Img).src);
		const bumpMap = loader.load((earthbump as unknown as Img).src);
		const specMap = loader.load((earthspec as unknown as Img).src);
		const lightsMap = loader.load((earthlights as unknown as Img).src);
		const cloudsMap = loader.load((earthcloudmap as unknown as Img).src);
		const cloudsAlpha = loader.load((earthcloudmaptrans as unknown as Img).src);
		const moonBump = loader.load((moonbump as unknown as Img).src)
		const moonMap = loader.load((moonmap as unknown as Img).src)

		const globeGroup = new THREE.Group();
		scene.add(globeGroup);

		const moonGroup = new THREE.Group();
		scene.add(moonGroup);

		const geo = new THREE.IcosahedronGeometry(1, 10);
		const mat = new THREE.MeshBasicMaterial({ 
			color: 0x222222,
			wireframe: true,
		});
		const cube = new THREE.Mesh(geo, mat);
		globeGroup.add(cube);

		const detail = 120;
		const pointsGeo = new THREE.IcosahedronGeometry(1, detail);

		const vertexShader = `
		uniform float size;
		uniform float elev;
		uniform sampler2D elevTexture;

		varying vec2 vUv;
		varying float vVisible;

		void main() {
			vUv = uv;
			vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
			float elv = texture2D(elevTexture, vUv).r;
			vec3 vNormal = normalMatrix * normal;
			vVisible = step(-1.0, dot( -normalize(mvPosition.xyz), normalize(vNormal)));
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

		const uniforms = {
			size: { type: "f", value: 2.0 },
			elev: { type: "f", value: 2.0 },
			colorTexture: { type: "t", value: map },
			elevTexture: { type: "t", value: bumpMap },
			alphaTexture: { type: "t", value: specMap }
		};
		const pointsMat = new THREE.ShaderMaterial({
			uniforms: uniforms,
			vertexShader,
			fragmentShader,
			transparent: true
		});

		const points = new THREE.Points(pointsGeo, pointsMat);
		globeGroup.add(points);

		const moonUniforms = {
			size: { type: "f", value: 1.5 },
			elev: { type: "f", value: 2.0 },
			colorTexture: { type: "t", value: moonMap },
			elevTexture: { type: "t", value: moonBump },
			alphaTexture: { type: "t", value: 0 }
		};

		const moonMat = new THREE.ShaderMaterial({
			uniforms: moonUniforms,
			vertexShader,
			fragmentShader,
			transparent: true
		});

		const moonpoints = new THREE.Points(pointsGeo, moonMat);
		moonpoints.position.set(2, 0, 0);
		moonpoints.scale.setScalar(0.27);
		moonGroup.add(moonpoints);

		let rafId = 0;
		const animate = () => {
			controls.update();
			renderer.render(scene, camera);
			rafId = requestAnimationFrame(animate);
			globeGroup.rotateY(0.001)
			globeGroup.rotateX(-0.0001)
			moonGroup.rotateY(-0.002)
		};
		animate();

		const onResize = () => {
			const w = container.clientWidth;
			const h = container.clientHeight;
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
			map.dispose();
			bumpMap.dispose();
			specMap.dispose();
			lightsMap.dispose();
			cloudsMap.dispose();
			cloudsAlpha.dispose();
			renderer.dispose();
			container.removeChild(renderer.domElement);
		};
  	}, []);

  	return <div ref={mountRef} style={{ width: '100%', maxWidth: 1280, height: 640 }} />;
};

export default Globe;
