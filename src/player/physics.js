// src/player/physics.js
import * as THREE from 'three';
import * as DATA from '../../data.js';
import { getBlock } from '../world/world.js'; // Import world data access

export const playerBox = new THREE.Box3(); // Keep exporting the box for potential external use (e.g., placing blocks)

// Epsilon for floating point comparisons and slight offsets
const _EPSILON = 0.001;
const _STEP_HEIGHT = DATA.BLOCK.SIZE + _EPSILON; // How high the player can step up

/**
 * Updates the player's bounding box based on the camera's current position.
 * @param {THREE.Camera} camera
 */
export function updatePlayerBox(camera) {
    playerBox.setFromCenterAndSize(
        new THREE.Vector3(camera.position.x, camera.position.y - DATA.PLAYER.HEIGHT / 2, camera.position.z),
        new THREE.Vector3(DATA.PLAYER.WIDTH, DATA.PLAYER.HEIGHT, DATA.PLAYER.WIDTH)
    );
}

/**
 * Checks for collisions along a single axis FOR A GIVEN DISPLACEMENT.
 * If a collision occurs, it modifies the camera position to be touching the obstacle
 * and zeroes the velocity component for that axis.
 * @param {THREE.Camera} camera - The player camera.
 * @param {THREE.Vector3} playerVelocity - The player's current velocity vector (will be modified).
 * @param {'x' | 'y' | 'z'} axis - The axis to check ('x', 'y', or 'z').
 * @param {number} displacement - The intended movement distance along this axis for this frame.
 * @returns {{collision: boolean, steppedUp: boolean}} - Info about the collision outcome.
 */
function checkAxisCollision(camera, playerVelocity, axis, displacement) {
    if (Math.abs(displacement) < _EPSILON) {
        return { collision: false, steppedUp: false }; // No movement, no collision
    }

    const checkDir = Math.sign(displacement); // Direction of movement on this axis (-1 or 1)

    // --- Broad Phase: Define check area based on current position + displacement ---
    updatePlayerBox(camera); // Start with current box
    const checkBounds = playerBox.clone(); // Clone the current box
    checkBounds.expandByVector(new THREE.Vector3(
        axis === 'x' ? displacement : 0,
        axis === 'y' ? displacement : 0,
        axis === 'z' ? displacement : 0
    )); // Expand the box in the direction of movement

    // Get world coordinates range to check based on the expanded box
    const minCheckX = Math.floor(checkBounds.min.x - _EPSILON);
    const maxCheckX = Math.ceil(checkBounds.max.x + _EPSILON);
    const minCheckY = Math.floor(checkBounds.min.y - _EPSILON);
    const maxCheckY = Math.ceil(checkBounds.max.y + _EPSILON);
    const minCheckZ = Math.floor(checkBounds.min.z - _EPSILON);
    const maxCheckZ = Math.ceil(checkBounds.max.z + _EPSILON);

    let collisionOccurred = false;
    let didStepUp = false;
    let closestCollisionDist = Math.abs(displacement); // Start assuming we can move the full distance

    // --- Narrow Phase: Check blocks within the broad phase area ---
    for (let worldY = minCheckY; worldY <= maxCheckY; worldY++) {
         if (worldY < 0 || worldY >= DATA.WORLD.MAX_HEIGHT + 5) continue; // World bounds check
        for (let worldX = minCheckX; worldX <= maxCheckX; worldX++) {
            for (let worldZ = minCheckZ; worldZ <= maxCheckZ; worldZ++) {
                const blockType = getBlock(worldX, worldY, worldZ, 'axisCheck');
                if (blockType && blockType !== DATA.BLOCK.TYPES.GLASS && blockType !== DATA.BLOCK.TYPES.LEAVES) { // Solid block check
                    const blockBox = new THREE.Box3(
                        new THREE.Vector3(worldX, worldY, worldZ),
                        new THREE.Vector3(worldX + DATA.BLOCK.SIZE, worldY + DATA.BLOCK.SIZE, worldZ + DATA.BLOCK.SIZE)
                    );

                    // Project player box along the axis and check intersection
                    const projectedPlayerBox = playerBox.clone();
                    projectedPlayerBox.translate(new THREE.Vector3(
                        axis === 'x' ? displacement : 0,
                        axis === 'y' ? displacement : 0,
                        axis === 'z' ? displacement : 0
                    ));

                    if (projectedPlayerBox.intersectsBox(blockBox)) {
                        // Collision detected! Calculate how far we *can* move before hitting.
                        let allowedDist = 0;
                        if (checkDir > 0) { // Moving positive direction
                            allowedDist = blockBox.min[axis] - playerBox.max[axis];
                        } else { // Moving negative direction
                            allowedDist = blockBox.max[axis] - playerBox.min[axis];
                        }

                        // Keep track of the closest collision
                        if (Math.abs(allowedDist) < closestCollisionDist) {
                            closestCollisionDist = Math.abs(allowedDist);
                        }
                        collisionOccurred = true;
                        // Don't break yet, we need the closest collision distance along this axis
                    }
                }
            }
        }
    }

    // --- Resolve Collision for this Axis ---
    if (collisionOccurred) {
        // Adjust intended displacement to the allowed distance (plus epsilon to avoid penetration)
        const finalDisplacement = checkDir * (closestCollisionDist - _EPSILON);

        // --- Step-Up Logic (Only check if colliding horizontally) ---
        if ((axis === 'x' || axis === 'z') && playerVelocity.y <= 0) { // Check only if moving horizontally and not moving up
             // Calculate position *after* horizontal collision resolution
             const collisionResolvedPos = camera.position.clone();
             collisionResolvedPos[axis] += finalDisplacement;

             // Check if stepping up is possible
             if (canStepUp(camera, collisionResolvedPos, axis)) {
                console.log("Attempting Step Up on axis:", axis);
                camera.position[axis] += finalDisplacement; // Apply partial horizontal move
                camera.position.y += _STEP_HEIGHT; // Apply vertical step
                playerVelocity.y = 0; // Stop falling briefly after step
                didStepUp = true; // Flag that we stepped up
                // Skip zeroing X/Z velocity and standard collision resolution for this axis
             }
        }

        // If we didn't step up, perform standard resolution
        if (!didStepUp) {
            camera.position[axis] += finalDisplacement; // Move player to touch the wall
            playerVelocity[axis] = 0; // Stop movement along this axis
        }

    } else {
        // No collision on this axis, apply full displacement
        camera.position[axis] += displacement;
    }

    return { collision: collisionOccurred, steppedUp: didStepUp };
}


/**
 * Helper function to check if the player can step up onto a block.
 * @param {THREE.Camera} camera - Current camera state.
 * @param {THREE.Vector3} collisionPos - Player position *after* horizontal resolution.
 * @param {'x' | 'z'} axis - The axis of horizontal collision.
 * @returns {boolean} - True if a step-up is possible.
 */
function canStepUp(camera, collisionPos, axis) {
    // 1. Check block directly below where the player *would* land after step
    const stepCheckY = Math.floor(camera.position.y - DATA.PLAYER.HEIGHT / 2 + _STEP_HEIGHT - _EPSILON);
    const blockBelowStep = getBlock(collisionPos.x, stepCheckY, collisionPos.z, 'stepBelow');

    if (!blockBelowStep || isBlockTransparent(blockBelowStep)) {
         // console.log("Step fail: No solid block below step landing");
         return false; // No solid ground to step onto
    }

    // 2. Check space at head height after stepping up is clear
    // Check a slightly wider area around the player's head after the step
    const headCheckY = Math.floor(camera.position.y + _STEP_HEIGHT + _EPSILON);
    const playerWidthCheck = DATA.PLAYER.WIDTH / 2 + _EPSILON;

    for (let dx = -playerWidthCheck; dx <= playerWidthCheck; dx += DATA.PLAYER.WIDTH) {
        for (let dz = -playerWidthCheck; dz <= playerWidthCheck; dz += DATA.PLAYER.WIDTH) {
             const blockAtHead = getBlock(collisionPos.x + dx, headCheckY, collisionPos.z + dz, 'stepHead');
             if (blockAtHead && !isBlockTransparent(blockAtHead)) {
                 // console.log("Step fail: Obstacle at head height", collisionPos.x+dx, headCheckY, collisionPos.z+dz);
                 return false; // Head would be inside a block
             }
        }
    }


    // console.log("Step SUCCESS");
    return true; // Looks clear to step up
}


/**
 * Performs a dedicated check downwards to determine if the player is standing on ground.
 * This is more reliable than only checking during Y-axis collision resolution.
 * @param {THREE.Camera} camera
 * @returns {boolean} - True if the player is on the ground.
 */
function checkGround(camera) {
    updatePlayerBox(camera); // Ensure box is current

    // Define a small box just below the player's feet
    const groundCheckBox = new THREE.Box3(
        new THREE.Vector3(playerBox.min.x + _EPSILON, playerBox.min.y - 0.2, playerBox.min.z + _EPSILON), // Slightly inset X/Z
        new THREE.Vector3(playerBox.max.x - _EPSILON, playerBox.min.y - _EPSILON, playerBox.max.z - _EPSILON)
    );

    // Get the coordinate range for this small box
    const minCheckX = Math.floor(groundCheckBox.min.x);
    const maxCheckX = Math.ceil(groundCheckBox.max.x);
    const minCheckY = Math.floor(groundCheckBox.min.y); // Should only be one Y level
    const maxCheckY = minCheckY;
    const minCheckZ = Math.floor(groundCheckBox.min.z);
    const maxCheckZ = Math.ceil(groundCheckBox.max.z);

    // Check blocks within this small area
    for (let worldY = minCheckY; worldY <= maxCheckY; worldY++) {
         if (worldY < 0 || worldY >= DATA.WORLD.MAX_HEIGHT + 5) continue;
        for (let worldX = minCheckX; worldX <= maxCheckX; worldX++) {
            for (let worldZ = minCheckZ; worldZ <= maxCheckZ; worldZ++) {
                const blockType = getBlock(worldX, worldY, worldZ, 'groundCheck');
                if (blockType && !isBlockTransparent(blockType)) {
                    const blockBox = new THREE.Box3(
                        new THREE.Vector3(worldX, worldY, worldZ),
                        new THREE.Vector3(worldX + DATA.BLOCK.SIZE, worldY + DATA.BLOCK.SIZE, worldZ + DATA.BLOCK.SIZE)
                    );
                    if (groundCheckBox.intersectsBox(blockBox)) {
                        return true; // Found ground
                    }
                }
            }
        }
    }

    return false; // No ground found
}

/**
 * Main physics update function called each frame.
 * Applies movement axis by axis, resolves collisions, handles step-up, and checks ground state.
 * Modifies camera position and playerVelocity directly.
 * @param {THREE.Camera} camera
 * @param {THREE.Vector3} playerVelocity
 * @param {number} delta - Time delta for the frame.
 * @returns {boolean} - The final onGround status for this frame.
 */
export function stepPhysics(camera, playerVelocity, delta) {

    // Calculate intended displacement for this frame
    const displacementX = playerVelocity.x * delta;
    const displacementY = playerVelocity.y * delta;
    const displacementZ = playerVelocity.z * delta;

    // --- Resolve Axis by Axis ---
    // IMPORTANT: Order matters (Y often first or last, X/Z order less critical)
    // Let's try X -> Z -> Y

    // 1. Check and Resolve X
    checkAxisCollision(camera, playerVelocity, 'x', displacementX);

    // 2. Check and Resolve Z
    checkAxisCollision(camera, playerVelocity, 'z', displacementZ);

    // 3. Check and Resolve Y (handles falling, hitting ceiling, and contributes to ground check)
    const yCollisionInfo = checkAxisCollision(camera, playerVelocity, 'y', displacementY);

    // --- Final Ground Check ---
    // Perform dedicated ground check AFTER all movement and Y-resolution
    const isOnGround = checkGround(camera);

    // If ground check is true, ensure Y velocity is not negative (prevents sinking)
    if (isOnGround && playerVelocity.y < 0) {
        playerVelocity.y = 0;
    }

    return isOnGround;
}

// Helper function (copied from generation.js - maybe move to a shared util?)
function isBlockTransparent(blockType) {
    return !blockType || blockType === DATA.BLOCK.TYPES.GLASS || blockType === DATA.BLOCK.TYPES.LEAVES;
}