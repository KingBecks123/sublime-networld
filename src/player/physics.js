// src/player/physics.js
import * as THREE from 'three';
import * as DATA from '../../data.js';
import { getBlock } from '../world/world.js'; // Import world data access

export const playerBox = new THREE.Box3();

export function updatePlayerBox(camera) {
    playerBox.setFromCenterAndSize(
        new THREE.Vector3(camera.position.x, camera.position.y - DATA.PLAYER.HEIGHT / 2, camera.position.z),
        new THREE.Vector3(DATA.PLAYER.WIDTH, DATA.PLAYER.HEIGHT, DATA.PLAYER.WIDTH)
    );
}

// Needs world access (getBlock), camera, playerVelocity, onGround
// Returns the new value for onGround
export function checkCollision(camera, playerVelocity) {
    updatePlayerBox(camera); // Ensure box is current

    let groundCollisionThisFrame = false;

    // --- Broad Phase ---
    const delta = 0.016; // Use a small fixed delta or pass actual delta? For range check, small fixed is ok.
    const moveDistX = Math.abs(playerVelocity.x * delta); /*...*/
    const checkRadiusXZ = DATA.PLAYER.WIDTH / 2 + moveDistX /*...*/;
    const checkRadiusY = DATA.PLAYER.HEIGHT / 2 + Math.abs(playerVelocity.y * delta) /*...*/;
    const minCheckX = Math.floor(playerBox.min.x - checkRadiusXZ); /*...*/
    const maxCheckX = Math.ceil(playerBox.max.x + checkRadiusXZ); /*...*/
    const minCheckY = Math.floor(playerBox.min.y - checkRadiusY); /*...*/
    const maxCheckY = Math.ceil(playerBox.max.y + checkRadiusY); /*...*/
    const minCheckZ = Math.floor(playerBox.min.z - checkRadiusXZ); /*...*/
    const maxCheckZ = Math.ceil(playerBox.max.z + checkRadiusXZ); /*...*/

    for (let worldY = minCheckY; worldY <= maxCheckY; worldY++) {
        if (worldY < 0 || worldY >= DATA.WORLD.MAX_HEIGHT + 5) continue;
        for (let worldX = minCheckX; worldX <= maxCheckX; worldX++) {
            for (let worldZ = minCheckZ; worldZ <= maxCheckZ; worldZ++) {
                const blockType = getBlock(worldX, worldY, worldZ, 'collision'); // Use imported getBlock

                if (blockType && blockType !== DATA.BLOCK.TYPES.GLASS && blockType !== DATA.BLOCK.TYPES.LEAVES) {
                    const blockBox = new THREE.Box3(
                        new THREE.Vector3(worldX, worldY, worldZ),
                        new THREE.Vector3(worldX + DATA.BLOCK.SIZE, worldY + DATA.BLOCK.SIZE, worldZ + DATA.BLOCK.SIZE)
                    );

                    if (playerBox.intersectsBox(blockBox)) {
                        const overlapX = Math.min(playerBox.max.x, blockBox.max.x) - Math.max(playerBox.min.x, blockBox.min.x);
                        const overlapY = Math.min(playerBox.max.y, blockBox.max.y) - Math.max(playerBox.min.y, blockBox.min.y);
                        const overlapZ = Math.min(playerBox.max.z, blockBox.max.z) - Math.max(playerBox.min.z, blockBox.min.z);
                        const epsilon = 0.001;

                        // Resolve Y first
                        if ((overlapY < overlapX - epsilon && overlapY < overlapZ - epsilon) || playerVelocity.y !== 0) {
                            if (playerVelocity.y <= 0 && playerBox.min.y < blockBox.max.y && playerBox.max.y > playerBox.min.y + epsilon) {
                                camera.position.y += overlapY; playerVelocity.y = 0; groundCollisionThisFrame = true; updatePlayerBox(camera); continue;
                            } else if (playerVelocity.y > 0 && playerBox.max.y > blockBox.min.y && playerBox.min.y < blockBox.min.y - epsilon) {
                                camera.position.y -= overlapY; playerVelocity.y = 0; updatePlayerBox(camera); continue;
                            }
                        }
                        // Then resolve X or Z
                        if (overlapX < overlapZ) {
                            const sign = Math.sign(playerBox.getCenter(new THREE.Vector3()).x - blockBox.getCenter(new THREE.Vector3()).x);
                            camera.position.x += overlapX * sign; playerVelocity.x = 0; updatePlayerBox(camera);
                        } else {
                            const sign = Math.sign(playerBox.getCenter(new THREE.Vector3()).z - blockBox.getCenter(new THREE.Vector3()).z);
                            camera.position.z += overlapZ * sign; playerVelocity.z = 0; updatePlayerBox(camera);
                        }
                    }
                }
            }
        }
    }
    return groundCollisionThisFrame; // Return the state
}