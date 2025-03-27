// src/main.js
import * as THREE from 'three';
import * as DATA from '../data.js';
import * as FN from '../functions.js'; // Only minimal utils now
import { initCore } from './setup.js';
import { world, chunkMeshes, addBlockData, removeBlockData } from './world/world.js'; // World state
import { generateChunkData } from './world/generation.js'; // World generation logic
import { updateChunkGeometry, regenerateAllChunkGeometries } from './world/meshing.js'; // World meshing logic
import { initPlayerInputListeners, keys } from './player/input.js'; // Input state and listeners
import { initUI, updateHighlightBox } from './ui/ui.js'; // UI setup and highlight update
import { initHotbar, updateHotbarDisplay /*, other needed exports */ } from './ui/hotbar.js';
import { calculatePlayerVelocity, setOnGround, playerVelocity } from './player/player.js'; // Player velocity calculation
import { stepPhysics } from './player/physics.js'; // Player physics logic (REPLACES checkCollision)

// --- Initialize Core Components ---
const {
    scene, camera, renderer, controls, clock, materials, audioListener
} = initCore(document.body); // Pass body for renderer append

// --- Initialize UI ---
const { highlightMesh } = initUI(controls, materials);
scene.add(highlightMesh); // Add highlight mesh created by UI module

// --- Game State (Minimal state directly in main) ---
const inventory = { ...DATA.initialInventory }; // Keep inventory state here or move to a game state module

// --- Initialize World ---
function generateInitialWorld() {
    console.log("Starting initial world data generation...");
    const spawnCX = 0; const spawnCZ = 0;
    const startRadius = DATA.WORLD.GENERATION_RADIUS;
    for (let cx = spawnCX - startRadius; cx <= spawnCX + startRadius; cx++) {
        for (let cz = spawnCZ - startRadius; cz <= spawnCZ + startRadius; cz++) {
             generateChunkData(cx, cz); // Populate world data map
        }
    }
    console.log("Initial world data generation finished.");

    console.log("--- Starting initial chunk mesh generation loop ---");
    for (let cx = spawnCX - startRadius; cx <= spawnCX + startRadius; cx++) {
        for (let cz = spawnCZ - startRadius; cz <= spawnCZ + startRadius; cz++) {
             try {
                 // Pass needed dependencies to meshing function
                 updateChunkGeometry(scene, materials.opaqueChunkMaterial, materials.transparentChunkMaterial, cx, cz);
             } catch (updateGeomError) {
                console.error(`!!! ERROR during updateChunkGeometry call for ${cx}, ${cz}:`, updateGeomError);
             }
        }
    }
    console.log(`--- Finished initial chunk mesh generation loop ---`);

    // Find suitable spawn position (Needs refactoring or careful dependency injection)
    // For now, just set a fallback position.
    camera.position.set(8, 35, 8); // Position after initial generation
    playerVelocity.set(0,0,0);
    setOnGround(false);
    // findSuitableSpawn(); // Needs access to raycaster, chunkMeshes etc. - complex dependency
    // checkCollision(camera, playerVelocity); // Initial check
}

// --- Initialize Input ---
// Pass dependencies needed by interaction logic
initPlayerInputListeners(controls, camera, inventory, () => updateHotbarDisplay(inventory), scene);

// --- Initialize Hotbar Display ---
initHotbar(document.querySelectorAll('#hotbar .slot')); // Use initHotbar instead of setupHotbar
updateHotbarDisplay(inventory); // Initial display

// --- Main Game Loop ---
function animate() {
    // Request the next frame *before* doing work
    const frameRequestId = requestAnimationFrame(animate);

    // Calculate time delta, capping it to prevent large jumps
    const delta = Math.min(clock.getDelta(), 0.05); // Max delta of 50ms (20 FPS min)

    // --- Optional: Day/Night Cycle ---
    /*
    if (DATA.DAY_CYCLE.ENABLED) {
        // Example logic (needs ambientLight, directionalLight from setup)
        sunAngle = (sunAngle + delta * DATA.DAY_CYCLE.SPEED) % (2 * Math.PI);
        const cosAngle = Math.cos(sunAngle);
        const sinAngle = Math.sin(sunAngle);
        const ambientIntensityFactor = (sinAngle + 1) / 2;
        ambientLight.intensity = DATA.DAY_CYCLE.MIN_LIGHT + (DATA.DAY_CYCLE.MAX_LIGHT - DATA.DAY_CYCLE.MIN_LIGHT) * ambientIntensityFactor;
        directionalLight.position.set(cosAngle, sinAngle, 0.3 * sinAngle + 0.2).normalize();
        directionalLight.intensity = Math.max(DATA.DAY_CYCLE.MIN_SUN, DATA.DAY_CYCLE.MAX_SUN * Math.max(0, sinAngle));

        // Background/Fog updates would also go here if not using skybox/testing
        // const skyColorFactor = Math.max(0, sinAngle);
        // const nightColor = new THREE.Color(0x050510);
        // const dayColor = new THREE.Color(0x87ceeb);
        // if (!(scene.background instanceof THREE.CubeTexture) && scene.background instanceof THREE.Color) {
        //     scene.background.copy(dayColor).lerp(nightColor, 1.0 - skyColorFactor);
        //     if(scene.fog) scene.fog.color.copy(scene.background);
        // }
    }
    */

    // --- Player Updates ---
    if (controls.isLocked) {
        // 1. Calculate Player's Desired Velocity
        // Takes input (keys), current direction (controls, camera), and applies gravity/jump forces.
        // Modifies the exported `playerVelocity` vector.
        calculatePlayerVelocity(delta, camera, controls, keys);

        // 2. Step Physics and Resolve Collisions
        // Takes the desired velocity, applies it axis-by-axis, checks for collisions
        // against the world data (via getBlock), resolves them, handles step-up.
        // This function directly modifies `camera.position` and `playerVelocity`.
        // It returns the boolean state for `isOnGround`.
        const isOnGround = stepPhysics(camera, playerVelocity, delta);

        // 3. Update Player State Module
        // Let the player module know its final ground status for the next frame's jump check.
        setOnGround(isOnGround);

        // --- Infinite Fall Respawn ---
        if (camera.position.y < -50) {
             console.warn("Player fell out of world, respawning...");
             // findSuitableSpawn(); // Ideally call a robust spawn function
             // Temporary fallback:
             camera.position.set(
                 camera.position.x, // Keep X/Z
                 DATA.WORLD.MAX_HEIGHT, // Respawn high
                 camera.position.z
             );
             playerVelocity.set(0, 0, 0); // Reset velocity
             setOnGround(false); // Not on ground after respawn
        }

        // --- Optional Debug Logging ---
        // console.log(`Cam Pos: X=${camera.position.x.toFixed(1)} Y=${camera.position.y.toFixed(1)} Z=${camera.position.z.toFixed(1)}, VelY: ${playerVelocity.y.toFixed(1)}, OnGround: ${isOnGround}`);

    } else {
         // Player controls are not locked (e.g., menu open, initial screen)
         // Optionally apply damping to velocity so player slides to a stop
         const dampingFactor = Math.max(0, 1 - delta * 5); // Adjust 5 for faster/slower stop
         playerVelocity.x *= dampingFactor;
         playerVelocity.z *= dampingFactor;
         // Keep gravity acting? Or freeze player? For now, let gravity act.
         // playerVelocity.y -= DATA.WORLD.GRAVITY * delta; // Apply gravity even if not locked?
         // Or stop vertical movement:
         // playerVelocity.y = 0;
    }


    // --- UI Updates ---
    // Update UI elements that change each frame
    if (controls.isLocked) {
         // Update the block highlight box based on where the player is looking
         updateHighlightBox(controls, camera);
    }
    // updateHotbarDisplay(inventory); // Only needs to be called when inventory changes, not every frame


    // --- Render Scene ---
    try {
        // Ensure camera matrix is updated (usually handled by controls, but good practice)
        camera.updateMatrixWorld();
        // Render the scene with the updated camera position
        renderer.render(scene, camera);
    } catch (renderError) {
        console.error("!!! RENDER ERROR:", renderError);
        // Stop the loop if rendering fails catastrophically
        cancelAnimationFrame(frameRequestId);
    }
} // End of animate function

// --- Start Game ---
console.log("Generating initial world...");
generateInitialWorld();
console.log("Starting animation loop...");
animate();