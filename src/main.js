// src/main.js
import * as THREE from 'three';
import * as DATA from '../data.js';
import * as FN from '../functions.js'; // Only minimal utils now
import { initCore } from './setup.js';
import { world, chunkMeshes, addBlockData, removeBlockData } from './world/world.js'; // World state
import { generateChunkData } from './world/generation.js'; // World generation logic
import { updateChunkGeometry, regenerateAllChunkGeometries } from './world/meshing.js'; // World meshing logic
import { initPlayerInputListeners, keys } from './player/input.js'; // Input state and listeners
import { handlePlayerMovement, setOnGround, playerVelocity } from './player/player.js'; // Player movement logic
import { checkCollision } from './player/physics.js'; // Player physics logic
import { initUI, updateHighlightBox } from './ui/ui.js'; // UI setup and highlight update
import { initHotbar, updateHotbarDisplay /*, other needed exports */ } from './ui/hotbar.js';

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
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    // Day/Night Cycle (Keep disabled or move to separate module)
    /* ... */

    // Player Updates
    handlePlayerMovement(delta, camera, controls, keys); // Update velocity and apply position changes
    const isOnGround = checkCollision(camera, playerVelocity); // Check collision, get ground state
    setOnGround(isOnGround); // Update player module's ground state

    // UI Updates
    if (controls.isLocked) {
         updateHighlightBox(controls, camera); // Update highlight box position
    }
     // updateHotbarDisplay(inventory); // Update counts (only needed on change usually)

    // Render
    try {
         renderer.render(scene, camera);
    } catch (renderError) { console.error("!!! RENDER ERROR:", renderError); /* Stop loop? */ }
}

// --- Start Game ---
console.log("Generating initial world...");
generateInitialWorld();
console.log("Starting animation loop...");
animate();