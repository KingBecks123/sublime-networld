// src/player/player.js
import * as THREE from 'three';
import * as DATA from '../../data.js';

export const playerVelocity = new THREE.Vector3();
export let onGround = false;
export const playerDirection = new THREE.Vector3(); // For storing look direction

// Needs delta, camera, controls, keys
export function handlePlayerMovement(delta, camera, controls, keys) {
    if (!controls.isLocked) return; // Only move when locked

    controls.getDirection(playerDirection);
    const forward = new THREE.Vector3(playerDirection.x, 0, playerDirection.z).normalize();
    const right = new THREE.Vector3().crossVectors(camera.up, forward).normalize();

    let moveX = 0; let moveZ = 0;
    if (keys['KeyW']) moveZ -= 1; if (keys['KeyS']) moveZ += 1;
    if (keys['KeyA']) moveX -= 1; if (keys['KeyD']) moveX += 1;
    const moveDirection = new THREE.Vector3(moveX, 0, moveZ);
    if (moveDirection.length() > 0) moveDirection.normalize();

    playerVelocity.x = (forward.x * moveDirection.z + right.x * moveDirection.x) * DATA.PLAYER.SPEED;
    playerVelocity.z = (forward.z * moveDirection.z + right.z * moveDirection.x) * DATA.PLAYER.SPEED;

    // Apply Gravity
    playerVelocity.y -= DATA.WORLD.GRAVITY * delta;

    // Jumping (onGround state updated externally after collision)
    if (keys['Space'] && onGround) {
        playerVelocity.y = DATA.PLAYER.JUMP_FORCE;
        // onGround = false; // Set externally by physics/collision result
    }

    // Apply movement step by step, checking collision between steps
    camera.position.x += playerVelocity.x * delta;
    // checkCollision() called externally
    camera.position.z += playerVelocity.z * delta;
    // checkCollision() called externally
    camera.position.y += playerVelocity.y * delta;
    // checkCollision() called externally

}

// Function to update onGround state, called from main loop after collision check
 export function setOnGround(isOnGround) {
    onGround = isOnGround;
}