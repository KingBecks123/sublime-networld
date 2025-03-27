// src/world/meshing.js
import * as THREE from 'three';
import * as FN from '../../functions.js';
import { world, chunkMeshes } from './world.js'; // Import world state maps
import { generateChunkGeometryData } from './generation.js'; // Import geometry function

/**
 * Removes old meshes for a chunk and disposes their geometry.
 * Needs scene and chunkMeshes map passed in or imported.
 */
export function clearChunkMesh(scene, cx, cz) {
    const chunkKey = FN.getChunkKey(cx, cz);
    const meshes = chunkMeshes.get(chunkKey);
    if (meshes) {
        if (meshes.opaque) { scene.remove(meshes.opaque); meshes.opaque.geometry.dispose(); }
        if (meshes.transparent) { scene.remove(meshes.transparent); meshes.transparent.geometry.dispose(); }
        chunkMeshes.delete(chunkKey);
    }
}

/**
 * Creates/updates the THREE.Mesh objects for a chunk.
 * Needs scene, materials passed in. Uses imported world/chunkMeshes maps.
 */
export function updateChunkGeometry(scene, opaqueMaterial, transparentMaterial, cx, cz) {
    clearChunkMesh(scene, cx, cz); // Use internal clear function
    const chunkKey = FN.getChunkKey(cx, cz);
    const geometryData = generateChunkGeometryData(cx, cz); // Use imported generator

    if (!geometryData) {
        chunkMeshes.set(chunkKey, { opaque: null, transparent: null }); return;
    }
    // console.log(`  [Meshing] CHUNK ${chunkKey}: Opaque indices: ${geometryData.opaque.indices.length}, ...`);

    let opaqueMesh = null;
    let transparentMesh = null;

    // Create Opaque Mesh
    if (geometryData.opaque.indices.length > 0) {
        let geometry;
        try {
            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(geometryData.opaque.positions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(geometryData.opaque.normals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(geometryData.opaque.uvs, 2));
            geometry.setIndex(geometryData.opaque.indices);
            geometry.computeBoundingSphere();
            // ...validation logs...

            opaqueMesh = new THREE.Mesh(geometry, opaqueMaterial); // Use passed-in material
            opaqueMesh.userData = { chunkKey, type: 'opaque' };
        } catch (geomError) { /* ...error logging... */ opaqueMesh = null; }
    }

    // Create Transparent Mesh
    if (geometryData.transparent.indices.length > 0) {
         let geometry;
        try {
            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(geometryData.transparent.positions, 3));
            /* ... normals, uvs, index ... */
            geometry.computeBoundingSphere();
            // ...validation logs...

            transparentMesh = new THREE.Mesh(geometry, transparentMaterial); // Use passed-in material
            transparentMesh.renderOrder = 1;
            transparentMesh.userData = { chunkKey, type: 'transparent' };
        } catch(geomError) { /* ...error logging... */ transparentMesh = null; }
    }

    // Add to Scene
    if (opaqueMesh) { scene.add(opaqueMesh); }
    if (transparentMesh) { scene.add(transparentMesh); }

    chunkMeshes.set(chunkKey, { opaque: opaqueMesh, transparent: transparentMesh });
}

/**
 * Regenerates geometry for all chunks in the world data map.
 */
 export function regenerateAllChunkGeometries(scene, opaqueMaterial, transparentMaterial) {
    console.log("[Meshing] Regenerating all chunk geometries...");
    const keys = Array.from(world.keys());
    keys.forEach(chunkKey => {
        const [cxStr, czStr] = chunkKey.split(',');
        updateChunkGeometry(scene, opaqueMaterial, transparentMaterial, parseInt(cxStr), parseInt(czStr));
    });
    console.log("[Meshing] Finished regenerating chunk geometries.");
}