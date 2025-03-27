// src/ui/ui.js
import * as THREE from 'three'; // Needed for highlight box mesh types if passed around
import { initHotbar, updateHotbarDisplay as updateHotbarDisplayFn } from './hotbar.js'; // Import hotbar functions
import { initHighlightBox, updateHighlightBox as updateHighlightBoxFn } from './highlight.js'; // Import highlight functions

export let domElements = {}; // Export DOM elements if other modules need direct access (use sparingly)
let internalHighlightMesh = null; // Keep highlight mesh reference internal to UI module

/**
 * Initializes main UI elements, listeners for blocker/controls, and sub-modules.
 * @param {THREE.PointerLockControls} controls - The pointer lock controls instance.
 * @param {object} materials - Object containing shared materials (e.g., materials.highlightMaterial).
 * @param {function} triggerAudioResume - Callback function to resume audio context on first lock.
 * @returns {object} Object containing references needed elsewhere (e.g., highlight mesh).
 */
export function initUI(controls, materials, triggerAudioResume) {
    console.log("[UI] Initializing UI...");
    domElements.blocker = document.getElementById('blocker');
    domElements.instructions = document.getElementById('instructions');
    domElements.crosshair = document.getElementById('crosshair');
    domElements.hotbar = document.getElementById('hotbar');
    domElements.textureToggleBtn = document.getElementById('texture-toggle');
    domElements.hotbarSlots = document.querySelectorAll('#hotbar .slot');

    if (!domElements.blocker || !domElements.instructions || !domElements.hotbar || !domElements.hotbarSlots || !domElements.textureToggleBtn) {
         console.error("[UI] Essential UI DOM elements not found! Check index.html.");
         // Potentially throw error or prevent further initialization
    }

    // --- Blocker / Pointer Lock Listener ---
    if (domElements.instructions) {
        domElements.instructions.addEventListener('click', () => {
            console.log("[UI] Instructions clicked!");
            try {
                controls.lock();
                console.log("[UI] controls.lock() called.");
            } catch (e) {
                console.error("[UI] Error calling controls.lock():", e);
            }
        });
    }

    controls.addEventListener('lock', () => {
        console.log("[UI] PointerLockControls: Locked");
        if (domElements.instructions) domElements.instructions.style.display = 'none';
        if (domElements.blocker) domElements.blocker.style.display = 'none';
        if (triggerAudioResume) triggerAudioResume(); // Call the audio resume callback
    });

    controls.addEventListener('unlock', () => {
        console.log("[UI] PointerLockControls: Unlocked");
        if (domElements.blocker) domElements.blocker.style.display = 'flex'; // Use 'flex' as defined in CSS
        if (domElements.instructions) domElements.instructions.style.display = ''; // Reset display
    });

    // --- Texture Toggle Button (Disabled for Atlas) ---
    if (domElements.textureToggleBtn) {
        domElements.textureToggleBtn.textContent = `Textures: Atlas`;
        domElements.textureToggleBtn.disabled = true;
         // Add listener back here if functionality is re-implemented
         // domElements.textureToggleBtn.addEventListener('click', () => { /* ... */ });
    }

    // --- Initialize Sub-modules ---
    initHotbar(domElements.hotbarSlots); // Initialize hotbar elements
    internalHighlightMesh = initHighlightBox(materials.highlightMaterial); // Create highlight mesh

    console.log("[UI] UI Initialization complete.");

    // Return only what's strictly needed by other modules (like the mesh to add to scene)
    return { highlightMesh: internalHighlightMesh };
}

/**
 * Wrapper function to update the highlight box.
 * Needs controls and camera passed each frame from the main loop.
 */
export function updateHighlightBox(controls, camera) {
    updateHighlightBoxFn(controls, camera); // Call the specific function from highlight.js
}

/**
 * Wrapper function to update the hotbar display.
 * Needs the current inventory state passed in.
 */
export function updateHotbarDisplay(inventory) {
    updateHotbarDisplayFn(inventory); // Call the specific function from hotbar.js
}