// src/materials.js
import * as THREE from 'three';
import { ATLAS } from '../data.js'; // Adjust path if needed

export function createMaterials(textureLoader) {
    let atlasTexture;
    let opaqueChunkMaterial;
    let transparentChunkMaterial;
    let highlightMaterial;

    try {
        atlasTexture = textureLoader.load(ATLAS.PATH);
        atlasTexture.colorSpace = THREE.SRGBColorSpace;
        atlasTexture.magFilter = THREE.NearestFilter;
        atlasTexture.minFilter = THREE.NearestFilter;

        opaqueChunkMaterial = new THREE.MeshStandardMaterial({
            map: atlasTexture, side: THREE.FrontSide, name: 'chunk-opaque-atlas',
            roughness: 0.9, metalness: 0.1
        });

        transparentChunkMaterial = new THREE.MeshStandardMaterial({
            map: atlasTexture, side: THREE.DoubleSide, transparent: true,
            alphaTest: 0.1, depthWrite: true, name: 'chunk-transparent-atlas'
        });
        // Consider a separate glassMaterial if needed

        highlightMaterial = new THREE.LineBasicMaterial({
            color: 0x000000, linewidth: 2, depthTest: false,
            opacity: 0.7, transparent: true
        });

        console.log("Shared materials created successfully.");

    } catch(atlasError) {
        console.error("Failed to load atlas/create shared materials:", atlasError);
        // Fallback to basic materials
        opaqueChunkMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true });
        transparentChunkMaterial = new THREE.MeshBasicMaterial({ color: 0x87cefa, wireframe: true, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        highlightMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red fallback highlight
    }

    return { atlasTexture, opaqueChunkMaterial, transparentChunkMaterial, highlightMaterial };
}