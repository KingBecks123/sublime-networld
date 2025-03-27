// src/player/input.js
import * as THREE from 'three';
import * as DATA from '../../data.js';
import * as FN from '../../functions.js'; // Coordinate utils
import { world, chunkMeshes, addBlockData, removeBlockData } from '../world/world.js';
import { updateChunkGeometry } from '../world/meshing.js'; // Function to trigger updates
import { getSelectedBlockType } from '../ui/hotbar.js'; // Needs hotbar state access
import { playerBox } from './physics.js'; // Needs player collision box

export const keys = {};
const mouse = new THREE.Vector2(0, 0);
const raycaster = new THREE.Raycaster();
let inventoryRef = null; // To hold reference passed from main
let updateHotbarCallback = null; // To hold reference passed from main
let sceneRef = null; // To hold reference passed from main

export function initPlayerInputListeners(controls, camera, inventory, updateHotbarFn, scene) {
    inventoryRef = inventory; // Store reference
    updateHotbarCallback = updateHotbarFn; // Store reference
    sceneRef = scene; // Store reference

    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        // Hotbar selection - maybe move to ui/hotbar.js?
        if (event.code.startsWith('Digit')) {
            const index = parseInt(event.code.slice(5)) - 1;
            // Need setActiveSlot function from hotbar module
            // setActiveSlot(index);
            console.warn("Need setActiveSlot from hotbar module in input.js");
        }
    });

    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });

    document.addEventListener('mousedown', (event) => {
        if (!controls.isLocked) return;

        if (event.button === 0 || event.button === 2) { // Left or Right Click
            raycaster.setFromCamera(mouse, camera);
            const meshesToIntersect = [];
            chunkMeshes.forEach(chunk => {
                if (chunk.opaque) meshesToIntersect.push(chunk.opaque);
                if (chunk.transparent) meshesToIntersect.push(chunk.transparent);
            });
            const intersects = raycaster.intersectObjects(meshesToIntersect, false);

            if (intersects.length > 0 && intersects[0].distance < DATA.PLAYER.REACH) {
                handleInteraction(event.button, intersects[0]);
            }
        }
    });
}


function handleInteraction(button, intersection) {
    if (!inventoryRef || !updateHotbarCallback || !sceneRef) {
         console.error("Interaction dependencies not set!"); return;
    }

    const hitPoint = intersection.point;
    const normal = intersection.face.normal.clone();
    const affectedBlockPos = (button === 0)
        ? hitPoint.clone().addScaledVector(normal, -0.5 * DATA.BLOCK.SIZE) // Break
        : hitPoint.clone().addScaledVector(normal, 0.5 * DATA.BLOCK.SIZE);  // Place

    const blockX = Math.floor(affectedBlockPos.x);
    const blockY = Math.floor(affectedBlockPos.y);
    const blockZ = Math.floor(affectedBlockPos.z);

    const { cx, cz } = FN.getChunkCoordinates(blockX, blockZ);
    const chunksToUpdate = new Set([FN.getChunkKey(cx, cz)]);
    const localCoords = FN.getLocalCoordinates(blockX, blockY, blockZ, cx, cz);
    if (localCoords.lx === 0) chunksToUpdate.add(FN.getChunkKey(cx - 1, cz));
    if (localCoords.lx === DATA.WORLD.CHUNK_SIZE - 1) chunksToUpdate.add(FN.getChunkKey(cx + 1, cz));
    if (localCoords.lz === 0) chunksToUpdate.add(FN.getChunkKey(cx, cz - 1));
    if (localCoords.lz === DATA.WORLD.CHUNK_SIZE - 1) chunksToUpdate.add(FN.getChunkKey(cx, cz + 1));

    let updateNeeded = false;

    if (button === 0) { // Break
        const removedType = removeBlockData(blockX, blockY, blockZ); // Update DATA
        if (removedType) {
            if (inventoryRef[removedType] !== undefined && inventoryRef[removedType] !== Infinity) inventoryRef[removedType]++;
            updateHotbarCallback(); // Update UI
            // Play Sound...
            updateNeeded = true;
        }
    } else if (button === 2) { // Place
        const selectedType = getSelectedBlockType(); // Needs state
        if (selectedType && (inventoryRef[selectedType] > 0 || inventoryRef[selectedType] === Infinity)) {
            const newBlockBox = new THREE.Box3(
                new THREE.Vector3(blockX, blockY, blockZ),
                new THREE.Vector3(blockX + DATA.BLOCK.SIZE, blockY + DATA.BLOCK.SIZE, blockZ + DATA.BLOCK.SIZE)
            );
            // updatePlayerBox() needs to be called *before* check if player state is not shared
            // For now, assume playerBox is reasonably up-to-date from last frame physics
            if (!playerBox.intersectsBox(newBlockBox)) {
                 const added = addBlockData(blockX, blockY, blockZ, selectedType); // Update DATA
                 if (added) {
                     if (inventoryRef[selectedType] !== Infinity) inventoryRef[selectedType]--;
                     updateHotbarCallback(); // Update UI
                     // Play Sound...
                     updateNeeded = true;
                 }
            }
        }
    }

    if (updateNeeded) {
        // Trigger geometry updates - needs access to materials from setup
        // This dependency is tricky. Either pass materials or have main handle updates.
        // Let's assume main will handle it for now via an event or flag.
         console.warn("Need to trigger chunk updates from interaction module!");
         // Temporary direct call (requires materials to be accessible)
         // import { opaqueChunkMaterial, transparentChunkMaterial } from '../materials.js'; // This won't work if materials aren't exported directly
          // chunksToUpdate.forEach(key => {
          //     const [updateCX, updateCZ] = key.split(',').map(Number);
          //     if(world.has(key)){
          //          // Requires access to scene, opaqueMat, transparentMat
          //          // updateChunkGeometry(sceneRef, opaqueChunkMaterial, transparentChunkMaterial, updateCX, updateCZ);
          //     }
          // });
    }
}