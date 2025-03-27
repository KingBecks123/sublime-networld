// src/ui/highlight.js
import * as THREE from 'three';
import * as DATA from '../../data.js';
import { getBlock, chunkMeshes } from '../world/world.js'; // Import world state access

let highlightMesh = null; // Internal reference to the mesh
const raycaster = new THREE.Raycaster(); // Local raycaster for highlight
const mouse = new THREE.Vector2(0, 0); // Center screen coordinates for raycasting

/**
 * Creates the highlight box LineSegments object.
 * @param {THREE.Material} highlightMaterial - The material to use for the highlight lines.
 * @returns {THREE.LineSegments} The created highlight mesh.
 */
export function initHighlightBox(highlightMaterial) {
    console.log("[Highlight] Initializing...");
    if (!highlightMaterial) {
        console.error("[Highlight] Highlight material not provided!");
        // Create a basic fallback if needed, though it should come from materials.js
        highlightMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    }
    try {
        const highlightGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(DATA.BLOCK.SIZE, DATA.BLOCK.SIZE, DATA.BLOCK.SIZE));
        highlightMesh = new THREE.LineSegments(highlightGeometry, highlightMaterial);
        highlightMesh.renderOrder = 999; // Ensure it renders on top
        highlightMesh.visible = false; // Start invisible
        highlightMesh.name = "HighlightBox"; // Name for debugging
        console.log("[Highlight] Initialization complete.");
        return highlightMesh; // Return the mesh to be added to the scene
    } catch (error) {
        console.error("[Highlight] Error creating highlight box:", error);
        return null; // Return null on failure
    }
}

/**
 * Updates the position and visibility of the highlight box based on raycasting.
 * @param {THREE.PointerLockControls} controls - The pointer lock controls instance.
 * @param {THREE.Camera} camera - The main camera.
 */
export function updateHighlightBox(controls, camera) {
    if (!highlightMesh) return; // Don't update if mesh wasn't created

    if (!controls.isLocked) {
        highlightMesh.visible = false; // Hide if pointer not locked
        return;
    }

    try {
        raycaster.setFromCamera(mouse, camera); // Raycast from camera center

        // Collect meshes to intersect (same as interaction logic)
        const meshesToIntersect = [];
        chunkMeshes.forEach(chunk => { // Access imported chunkMeshes map
            if (chunk.opaque) meshesToIntersect.push(chunk.opaque);
            if (chunk.transparent) meshesToIntersect.push(chunk.transparent);
        });

        if (meshesToIntersect.length === 0) {
            highlightMesh.visible = false; // Nothing to intersect with
            return;
        }

        const intersects = raycaster.intersectObjects(meshesToIntersect, false);

        let foundBlock = false;
        if (intersects.length > 0 && intersects[0].distance < DATA.PLAYER.REACH) {
            const intersection = intersects[0];
            const hitPoint = intersection.point;
            const normal = intersection.face.normal; // Normal of the hit face

            // Calculate block position slightly inward from the hit point
            const blockCheckPos = hitPoint.clone().addScaledVector(normal, -0.5 * DATA.BLOCK.SIZE);
            const blockX = Math.floor(blockCheckPos.x);
            const blockY = Math.floor(blockCheckPos.y);
            const blockZ = Math.floor(blockCheckPos.z);

            // Verify the block *data* exists at this location using getBlock
            if (getBlock(blockX, blockY, blockZ, 'highlight')) { // Use imported getBlock
                // Position the highlight mesh centered on the target block
                highlightMesh.position.set(
                    blockX + DATA.BLOCK.SIZE / 2,
                    blockY + DATA.BLOCK.SIZE / 2,
                    blockZ + DATA.BLOCK.SIZE / 2
                );
                highlightMesh.visible = true; // Make it visible
                foundBlock = true;
            }
        }

        // If no suitable block was found in reach, hide the highlight
        if (!foundBlock) {
            highlightMesh.visible = false;
        }
    } catch (error) {
         console.error("[Highlight] Error during update:", error);
         highlightMesh.visible = false; // Hide on error
    }
}