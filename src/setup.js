// src/setup.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as DATA from '../data.js';
import { createMaterials } from './materials.js';

export function initCore(canvasContainer) {
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Default background
    scene.fog = null; // Start without fog

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.sortObjects = true;
    canvasContainer.appendChild(renderer.domElement);

    // Clock
    const clock = new THREE.Clock();

    // Texture Loader
    const textureLoader = new THREE.TextureLoader();

    // Materials (Load atlas here)
    const materials = createMaterials(textureLoader);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xaaaaaa, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(1, 1, 0.5).normalize();
    scene.add(directionalLight);

    // Controls
    const controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    // Audio Listener
    const audioListener = new THREE.AudioListener();
    camera.add(audioListener);

    // Resize Listener
    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Return core objects needed by other modules
    return {
        scene,
        camera,
        renderer,
        clock,
        textureLoader,
        materials, // Contains opaque/transparent/highlight materials
        ambientLight,
        directionalLight,
        controls,
        audioListener,
        dispose: () => { // Cleanup function
            window.removeEventListener('resize', handleResize);
            // Potentially dispose renderer, controls?
        }
    };
}