// src/player/player.js
import * as THREE from 'three';
import * as DATA from '../../data.js';

export const playerVelocity = new THREE.Vector3();
export let onGround = false; // This will be updated by setOnGround
export const playerDirection = new THREE.Vector3(); // For storing look direction

/**
 * Calculates player's desired velocity based on input and gravity.
 * Does NOT move the camera directly.
 * @param {number} delta - Time delta.
 * @param {THREE.Camera} camera - Used for direction calculation.
 * @param {THREE.PointerLockControls} controls - Used to get direction.
 * @param {object} keys - Current keyboard state.
 */
export function calculatePlayerVelocity(delta, camera, controls, keys) {
    if (!controls.isLocked) {
        // Optionally decay velocity when not locked?
        // playerVelocity.multiplyScalar(1 - 0.1 * delta * 10); // Example decay
        return;
    }

    // --- Horizontal Velocity ---
    controls.getDirection(playerDirection);
    const forward = new THREE.Vector3(playerDirection.x, 0, playerDirection.z).normalize();
    const right = new THREE.Vector3().crossVectors(camera.up, forward).normalize();

    let moveX = 0; let moveZ = 0;
    if (keys['KeyW']) moveZ -= 1; if (keys['KeyS']) moveZ += 1;
    if (keys['KeyA']) moveX -= 1; if (keys['KeyD']) moveX += 1;
    const moveDirection = new THREE.Vector3(moveX, 0, moveZ);
    if (moveDirection.length() > 0) moveDirection.normalize();

    // Target horizontal velocity (Instant acceleration/deceleration for now)
    const targetVelocityX = (forward.x * moveDirection.z + right.x * moveDirection.x) * DATA.PLAYER.SPEED;
    const targetVelocityZ = (forward.z * moveDirection.z + right.z * moveDirection.x) * DATA.PLAYER.SPEED;

    // Apply some damping/acceleration (optional, smoother feel)
    const accel = 20.0; // Adjust as needed
    playerVelocity.x += (targetVelocityX - playerVelocity.x) * accel * delta;
    playerVelocity.z += (targetVelocityZ - playerVelocity.z) * accel * delta;

    // --- Vertical Velocity ---
    // Apply Gravity
    playerVelocity.y -= DATA.WORLD.GRAVITY * delta;

    // Apply Jumping (only if onGround flag is true)
    if (keys['Space'] && onGround) {
        playerVelocity.y = DATA.PLAYER.JUMP_FORCE;
        // onGround state is handled externally by setOnGround
        // Play jump sound here?
    }

     // Clamp max falling speed (optional)
     const MAX_FALL_SPEED = 50.0;
     if (playerVelocity.y < -MAX_FALL_SPEED) {
         playerVelocity.y = -MAX_FALL_SPEED;
     }
}

// Function to update the internal onGround state, called from main loop
export function setOnGround(isOnGround) {
    onGround = isOnGround;
}