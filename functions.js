// functions.js

import * as THREE from 'three';
import { BLOCK, textureColors, WORLD, blockTexturePaths, ATLAS } from './data.js';

// --- Coordinate Helpers (Remain the same) ---

export function getChunkCoordinates(x, z) {
    const cx = Math.floor(x / WORLD.CHUNK_SIZE);
    const cz = Math.floor(z / WORLD.CHUNK_SIZE);
    return { cx, cz };
}

export function getLocalCoordinates(x, y, z, cx, cz) {
    const lx = x - cx * WORLD.CHUNK_SIZE;
    const ly = y;
    const lz = z - cz * WORLD.CHUNK_SIZE;
    return { lx, ly, lz };
}

export function getWorldCoordinates(lx, ly, lz, cx, cz) {
    const x = lx + cx * WORLD.CHUNK_SIZE;
    const y = ly;
    const z = lz + cz * WORLD.CHUNK_SIZE;
    return { x, y, z };
}

export function getChunkKey(cx, cz) {
    return `${cx},${cz}`;
}

export function getLocalBlockKey(lx, ly, lz) {
    return `${lx},${ly},${lz}`;
}

export function getWorldBlockKey(x, y, z) {
     // Ensure inputs are numbers before flooring
     const floorX = Math.floor(Number(x));
     const floorY = Math.floor(Number(y));
     const floorZ = Math.floor(Number(z));
     if (isNaN(floorX) || isNaN(floorY) || isNaN(floorZ)) {
        console.error("Invalid input to getWorldBlockKey:", x, y, z);
        return "invalid,invalid,invalid";
     }
     return `${floorX},${floorY},${floorZ}`;
}

// --- Noise Placeholder (Remains the same) ---
export function simpleNoise(x, z) {
    // Simple sine/cosine combination for basic variation
    let freq1 = 1 / WORLD.TERRAIN_SCALE;
    let freq2 = 2 / WORLD.TERRAIN_SCALE;
    let val = 0.6 * Math.sin(x * freq1) * Math.cos(z * freq1);
    val += 0.4 * Math.sin(x * freq2) * Math.cos(z * freq2);
    return val * WORLD.TERRAIN_MAGNITUDE;
}

// --- World Access (MODIFIED with logging) ---
export function getBlock(world, x, y, z, caller = 'unknown') { // Added caller parameter
    const worldX = Math.floor(x);
    const worldY = Math.floor(y);
    const worldZ = Math.floor(z);

    // --- Add Logging ---
    const isCollisionCheck = caller === 'collision';
    // Log less frequently during collision to avoid flooding the console
    const shouldLog = !isCollisionCheck || Math.random() < 0.005; // Log other calls always, collision ~0.5% of time

    if (shouldLog) {
        // console.log(`[getBlock Caller: ${caller}] Checking Coords: ${worldX},${worldY},${worldZ}`);
    }
    // --- End Logging ---


    // Basic boundary check (prevent checking outside reasonable world height)
    if (isNaN(worldY) || worldY < 0 || worldY >= WORLD.MAX_HEIGHT + 10) {
        // if (shouldLog) console.log(`[getBlock] Out of bounds Y: ${worldY}`);
        return null;
    }

    const { cx, cz } = getChunkCoordinates(worldX, worldZ);
    if (isNaN(cx) || isNaN(cz)) {
        // if (shouldLog) console.log(`[getBlock] Invalid Chunk Coords: ${cx}, ${cz}`);
        return null;
    }

    const chunkKey = getChunkKey(cx, cz);
    const chunk = world.get(chunkKey);

    if (chunk) {
        const { lx, ly, lz } = getLocalCoordinates(worldX, worldY, worldZ, cx, cz);
        if (isNaN(lx) || isNaN(ly) || isNaN(lz)) {
             // if (shouldLog) console.log(`[getBlock] Invalid Local Coords: ${lx}, ${ly}, ${lz}`);
             return null;
        }
        const localKey = getLocalBlockKey(lx, ly, lz);
        const blockType = chunk.get(localKey); // Returns block type or undefined

        // if (shouldLog) console.log(`[getBlock] Found in ${chunkKey}/${localKey}: ${blockType}`);
        return blockType;
    } else {
        // if (shouldLog) console.log(`[getBlock] Chunk ${chunkKey} not found.`);
        return null; // Chunk doesn't exist
    }
}

// --- World Population (Replaces addBlock for initial generation) ---
/**
 * Sets the block type in the world data map. Does not create meshes.
 * Used during initial world generation.
 * @returns {boolean} True if the block data was set, false otherwise.
 */
export function setBlockData(world, x, y, z, type) {
    const worldX = Math.floor(x);
    const worldY = Math.floor(y);
    const worldZ = Math.floor(z);

    // Basic bounds check
    if (isNaN(worldY) || worldY < 0 || worldY >= WORLD.MAX_HEIGHT) return false;

    const { cx, cz } = getChunkCoordinates(worldX, worldZ);
     if (isNaN(cx) || isNaN(cz)) return false;

    const chunkKey = getChunkKey(cx, cz);

    let chunk = world.get(chunkKey);
    if (!chunk) {
        chunk = new Map();
        world.set(chunkKey, chunk);
    }

    const { lx, ly, lz } = getLocalCoordinates(worldX, worldY, worldZ, cx, cz);
    if (isNaN(lx) || isNaN(ly) || isNaN(lz)) return false;
    const localKey = getLocalBlockKey(lx, ly, lz);

    chunk.set(localKey, type);
    return true;
}


// --- World Modification (Player Actions) ---
// These now only modify the data model and trigger geometry updates elsewhere

/**
 * Updates the world data model to add a block.
 * @returns {boolean} True if the data was successfully updated, false otherwise.
 */
export function addBlockData(world, x, y, z, type) {
    const worldX = Math.floor(x);
    const worldY = Math.floor(y);
    const worldZ = Math.floor(z);

    if (isNaN(worldY) || worldY < 0 || worldY >= WORLD.MAX_HEIGHT) return false;

    const { cx, cz } = getChunkCoordinates(worldX, worldZ);
    if (isNaN(cx) || isNaN(cz)) return false;

    const chunkKey = getChunkKey(cx, cz);
    let chunk = world.get(chunkKey);

    if (!chunk) {
        console.error(`Attempted to add block data to non-existent chunk: ${chunkKey}`);
        return false;
    }

    const { lx, ly, lz } = getLocalCoordinates(worldX, worldY, worldZ, cx, cz);
    if (isNaN(lx) || isNaN(ly) || isNaN(lz)) return false;

    const localKey = getLocalBlockKey(lx, ly, lz);

    // Don't place if a block already exists there
    if (chunk.has(localKey)) return false;

    chunk.set(localKey, type);
    return true;
}

/**
 * Updates the world data model to remove a block (sets it to null/undefined).
 * @returns {string | null} The type of the block removed, or null if no block was found.
 */
export function removeBlockData(world, x, y, z) {
    const worldX = Math.floor(x);
    const worldY = Math.floor(y);
    const worldZ = Math.floor(z);
     if (isNaN(worldX) || isNaN(worldY) || isNaN(worldZ)) return null;

    const { cx, cz } = getChunkCoordinates(worldX, worldZ);
     if (isNaN(cx) || isNaN(cz)) return null;

    const chunkKey = getChunkKey(cx, cz);
    const chunk = world.get(chunkKey);

    if (!chunk) return null; // Chunk doesn't exist

    const { lx, ly, lz } = getLocalCoordinates(worldX, worldY, worldZ, cx, cz);
    if (isNaN(lx) || isNaN(ly) || isNaN(lz)) return null;

    const localKey = getLocalBlockKey(lx, ly, lz);

    if (!chunk.has(localKey)) return null; // No block data exists there

    const blockType = chunk.get(localKey);
    chunk.delete(localKey); // Remove the block entry (effectively making it air)
    return blockType;
}


// --- Texture Generation / Loading ---

// Helper to draw noise on canvas
function drawNoise(ctx, colors, count, size = 1, bounds = { minX: 0, minY: 0, maxX: 16, maxY: 16 }) {
    try {
        if (!Array.isArray(colors)) colors = [colors];
        const rangeX = bounds.maxX - bounds.minX;
        const rangeY = bounds.maxY - bounds.minY;
        if (rangeX <= 0 || rangeY <= 0) return; // Avoid infinite loop if bounds are bad
        for (let i = 0; i < count; i++) {
            const x = bounds.minX + Math.floor(Math.random() * rangeX);
            const y = bounds.minY + Math.floor(Math.random() * rangeY);
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillRect(x, y, size, size);
        }
    } catch (e) {
        console.error("Error during drawNoise:", e, { colors, count, size, bounds });
    }
}

// Generates a single CanvasTexture procedurally
export function generateBlockTexture(type, side = 'all') {
    let canvas = null; // Initialize outside try block
    try {
        canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Failed to get 2D context for texture generation");
            return null; // Return null if context creation fails
        }

        // --- Drawing Logic based on type/side ---
        switch (type) {
            case BLOCK.TYPES.GRASS:
                if (side === 'top') {
                    ctx.fillStyle = textureColors.grassGreen; ctx.fillRect(0, 0, 16, 16);
                    drawNoise(ctx, [textureColors.lightGrass, textureColors.darkGrass], 25);
                } else if (side === 'bottom') {
                    ctx.fillStyle = textureColors.dirtBrown; ctx.fillRect(0, 0, 16, 16);
                    drawNoise(ctx, [textureColors.darkDirt, textureColors.lightDirt], 20);
                } else { // Side
                    ctx.fillStyle = textureColors.dirtBrown; ctx.fillRect(0, 0, 16, 16);
                    drawNoise(ctx, [textureColors.darkDirt, textureColors.lightDirt], 20, 1, { minY: 3, maxX: 16, maxY: 16, minX: 0 });
                    ctx.fillStyle = textureColors.grassGreen; ctx.fillRect(0, 0, 16, 4);
                    drawNoise(ctx, [textureColors.lightGrass, textureColors.darkGrass], 15, 1, { minY: 0, maxX: 16, maxY: 4, minX: 0 });
                    drawNoise(ctx, [textureColors.dirtBrown, textureColors.darkDirt], 5, 1, { minY: 2, maxX: 16, maxY: 5, minX: 0 });
                }
                break;
            case BLOCK.TYPES.DIRT:
                ctx.fillStyle = textureColors.dirtBrown; ctx.fillRect(0, 0, 16, 16);
                drawNoise(ctx, [textureColors.darkDirt, textureColors.lightDirt], 35);
                break;
            case BLOCK.TYPES.STONE:
                ctx.fillStyle = textureColors.stoneGrey; ctx.fillRect(0, 0, 16, 16);
                drawNoise(ctx, [textureColors.darkStone, textureColors.lightStone], 40);
                ctx.fillStyle = textureColors.crackStone;
                if (Math.random() > 0.7) ctx.fillRect(Math.floor(Math.random() * 10) + 3, 2, 1, Math.floor(Math.random() * 8) + 4);
                if (Math.random() > 0.7) ctx.fillRect(2, Math.floor(Math.random() * 10) + 3, Math.floor(Math.random() * 8) + 4, 1);
                break;
            case BLOCK.TYPES.WOOD: // Oak Planks
                ctx.fillStyle = textureColors.woodTan; ctx.fillRect(0, 0, 16, 16);
                ctx.fillStyle = textureColors.darkWoodLine;
                for (let x = 0; x < 16; x += 4) { if (x > 0) ctx.fillRect(x - 1, 0, 1, 16); }
                drawNoise(ctx, textureColors.woodGrain, 20, 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                for (let x = 0; x < 16; x += 4) { ctx.fillRect(x, 0, 1, 16); }
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                for (let x = 0; x < 16; x += 4) { if (x > 0) ctx.fillRect(x - 2, 0, 1, 16); }
                break;
            case BLOCK.TYPES.LEAVES: // Oak Leaves
                ctx.fillStyle = textureColors.leavesGreen; ctx.fillRect(0, 0, 16, 16);
                drawNoise(ctx, textureColors.darkLeaves, 35, 2);
                ctx.globalCompositeOperation = 'destination-out';
                drawNoise(ctx, '#FFF', 10, 2);
                drawNoise(ctx, '#FFF', 15, 1);
                ctx.globalCompositeOperation = 'source-over';
                break;
            case BLOCK.TYPES.SAND:
                ctx.fillStyle = textureColors.sandYellow; ctx.fillRect(0, 0, 16, 16);
                drawNoise(ctx, [textureColors.darkSand, textureColors.lightSand], 45);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.lineWidth = 1;
                for (let i = -16; i < 16; i += 4) {
                    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 16, 16); ctx.stroke();
                }
                break;
            case BLOCK.TYPES.LOG: // Oak Log
                if (side === 'top' || side === 'bottom') {
                    ctx.fillStyle = textureColors.logRingLight; ctx.fillRect(0, 0, 16, 16);
                    ctx.strokeStyle = textureColors.logRingDark; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.stroke();
                    ctx.strokeStyle = textureColors.logRingDark; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.arc(8, 8, 4, 0, Math.PI * 2); ctx.stroke();
                    ctx.beginPath(); ctx.arc(8, 8, 2, 0, Math.PI * 2); ctx.stroke();
                    ctx.fillStyle = textureColors.logRingDark; ctx.beginPath(); ctx.arc(8, 8, 1, 0, Math.PI * 2); ctx.fill();
                } else { // Side (bark)
                    ctx.fillStyle = textureColors.logBrown; ctx.fillRect(0, 0, 16, 16);
                    drawNoise(ctx, [textureColors.darkLogBark], 30, 1, {minX:0, minY:0, maxX:16, maxY:16});
                    for(let i=0; i<8; i++) {
                        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(Math.random()*16, 0, 1, 16);
                        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(Math.random()*16, 0, 1, 16);
                    }
                }
                break;
            case BLOCK.TYPES.STONE_BRICK:
                ctx.fillStyle = textureColors.brickMortar; ctx.fillRect(0, 0, 16, 16);
                ctx.fillStyle = textureColors.brickGrey;
                ctx.fillRect(0, 0, 7, 7); ctx.fillRect(9, 0, 7, 7);
                ctx.fillRect(0, 9, 7, 7); ctx.fillRect(9, 9, 7, 7);
                const brickBounds = [ {minX:0, minY:0, maxX:7, maxY:7}, {minX:9, minY:0, maxX:16, maxY:7}, {minX:0, minY:9, maxX:7, maxY:16}, {minX:9, minY:9, maxX:16, maxY:16} ];
                brickBounds.forEach(bounds => { drawNoise(ctx, [textureColors.darkStone, textureColors.lightStone], 8, 1, bounds); });
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(0, 0, 7, 1); ctx.fillRect(9, 0, 7, 1); ctx.fillRect(0, 9, 7, 1); ctx.fillRect(9, 9, 7, 1);
                ctx.fillRect(0, 0, 1, 7); ctx.fillRect(9, 0, 1, 7); ctx.fillRect(0, 9, 1, 7); ctx.fillRect(9, 9, 1, 7);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.fillRect(0, 6, 7, 1); ctx.fillRect(9, 6, 7, 1); ctx.fillRect(0, 15, 7, 1); ctx.fillRect(9, 15, 7, 1);
                ctx.fillRect(6, 0, 1, 7); ctx.fillRect(15, 0, 1, 7); ctx.fillRect(6, 9, 1, 7); ctx.fillRect(15, 9, 1, 7);
                break;
            case BLOCK.TYPES.GLASS:
                ctx.fillStyle = textureColors.glassBlue; ctx.globalAlpha = 0.5; ctx.fillRect(0, 0, 16, 16); ctx.globalAlpha = 1.0;
                ctx.strokeStyle = textureColors.glassBorder; ctx.globalAlpha = 0.7; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, 15, 15); ctx.globalAlpha = 1.0;
                ctx.strokeStyle = textureColors.glassShine; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(2, 14); ctx.lineTo(5, 11); ctx.moveTo(11, 5); ctx.lineTo(14, 2); ctx.moveTo(2,2); ctx.lineTo(4,4); ctx.stroke();
                ctx.globalAlpha = 1.0;
                break;
            case 'fallback': // Explicit fallback case
                 ctx.fillStyle = textureColors.fallbackMagenta || '#FF00FF'; ctx.fillRect(0, 0, 16, 16);
                 ctx.fillStyle = textureColors.fallbackBlack || '#000000'; ctx.fillRect(0, 0, 8, 8); ctx.fillRect(8, 8, 8, 8);
                 break;
            default: // Any other unknown type also gets fallback
                console.warn(`Generating fallback texture for unknown type: ${type}`);
                ctx.fillStyle = textureColors.fallbackMagenta || '#FF00FF'; ctx.fillRect(0, 0, 16, 16);
                ctx.fillStyle = textureColors.fallbackBlack || '#000000'; ctx.fillRect(0, 0, 8, 8); ctx.fillRect(8, 8, 8, 8);
                break;
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;

    } catch (error) {
        console.error(`Error generating texture for type: ${type}, side: ${side}`, error);
        // Attempt to return a very basic fallback texture even if drawing failed
        try {
             if (!canvas) { // If canvas creation itself failed
                canvas = document.createElement('canvas');
                canvas.width = 16; canvas.height = 16;
             }
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.fillStyle = '#FF00FF'; ctx.fillRect(0, 0, 16, 16);
                ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 8, 8); ctx.fillRect(8, 8, 8, 8);
                const fallbackTexture = new THREE.CanvasTexture(canvas);
                fallbackTexture.magFilter = THREE.NearestFilter;
                fallbackTexture.minFilter = THREE.NearestFilter;
                return fallbackTexture;
            }
        } catch (fallbackError) {
            console.error("CRITICAL: Failed even to create emergency fallback texture:", fallbackError);
        }
        return null; // Return null if absolutely everything failed
    }
}


// Loads a single texture using TextureLoader
export function loadTexture(textureLoader, path) {
    try {
        const texture = textureLoader.load(path);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return texture;
    } catch (error) {
        console.error(`Failed to load texture: ${path}`, error);
        // Return a fallback texture generated procedurally
        return generateBlockTexture('fallback'); // Ensure fallback generation is robust
    }
}

// --- Material Creation ---

/**
 * Disposes materials and their textures (if applicable).
 * Be careful calling this if textures are shared or might be reused.
 */
export function disposeMaterials(materials) {
    console.log("Disposing old materials...");
    Object.values(materials).forEach(material => {
        if (!material) return; // Skip if material is null/undefined
        try {
            if (Array.isArray(material)) {
                material.forEach(m => {
                    if (m && m.map) m.map.dispose(); // Dispose texture
                    if (m) m.dispose(); // Dispose material
                });
            } else {
                if (material.map) material.map.dispose(); // Dispose texture
                material.dispose(); // Dispose material
            }
        } catch (e) {
            console.error("Error disposing material:", material, e);
        }
    });
    console.log("Materials disposed.");
}


// Creates the blockMaterials object based on the chosen source
export function createBlockMaterials(useProcedural, textureLoader) {
    console.log(`Executing createBlockMaterials... (Procedural: ${useProcedural})`); // Debug Start
    const materials = {};
    let fallbackMaterial = null; // Define higher scope

    // --- Create Fallback Material Robustly ---
    try {
        const fallbackTexture = generateBlockTexture('fallback');
        if (!fallbackTexture) {
            console.error("CRITICAL: Failed to generate fallback texture map!");
            // Create a simple colored material if texture fails
             fallbackMaterial = new THREE.MeshStandardMaterial({
                color: 0xff00ff, // Magenta color
                name: 'fallback-color'
            });
        } else {
             fallbackMaterial = new THREE.MeshStandardMaterial({
                map: fallbackTexture,
                name: 'fallback'
            });
        }
        console.log("Fallback material created successfully.");
    } catch (fallbackError) {
        console.error("CRITICAL ERROR CREATING FALLBACK MATERIAL:", fallbackError);
        // Cannot continue without fallback, return empty object to avoid undefined
        return {};
    }
    // Ensure fallback is assigned even if generate failed but didn't throw above
    if (!fallbackMaterial) {
         console.error("Fallback material is still null after creation attempt, using basic color.");
          fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff00ff, name: 'fallback-critical-fail' });
    }
    // Assign fallback to the map immediately to ensure it exists
    materials['fallback'] = fallbackMaterial;


    // --- Create Materials for Each Block Type ---
    for (const type of Object.values(BLOCK.TYPES)) {
        // Skip if type is somehow invalid
        if (!type) continue;

        // Ensure materials[type] is initialized with fallback before try block
        materials[type] = fallbackMaterial;

        try {
            const materialOptions = { name: type };
            let textureData = null;
            let isMultiSide = false;

            const needsMultiSide = (type === BLOCK.TYPES.GRASS || type === BLOCK.TYPES.LOG);

            if (!useProcedural) {
                textureData = blockTexturePaths[type];
                if (!textureData) {
                    console.warn(`Missing texture path for type: ${type}. Using fallback.`);
                    // materials[type] is already fallback from above
                    continue; // Skip to next type
                }
                isMultiSide = needsMultiSide && textureData.side && textureData.top;
            } else {
                isMultiSide = needsMultiSide;
            }

            if (type === BLOCK.TYPES.LEAVES || type === BLOCK.TYPES.GLASS) {
                materialOptions.transparent = true;
                materialOptions.side = THREE.DoubleSide;
                if (type === BLOCK.TYPES.LEAVES) materialOptions.alphaTest = 0.1;
                materialOptions.depthWrite = (type === BLOCK.TYPES.LEAVES);
            }

            // --- Material Array or Single Material ---
            if (isMultiSide) {
                const sideTex = useProcedural ? generateBlockTexture(type, 'side') : loadTexture(textureLoader, textureData.side);
                const topTex = useProcedural ? generateBlockTexture(type, 'top') : loadTexture(textureLoader, textureData.top);
                let bottomTexPath = textureData?.bottom || textureData?.top || textureData?.side;
                const bottomTex = useProcedural ? generateBlockTexture(type, 'bottom') : loadTexture(textureLoader, bottomTexPath);

                // Use fallback texture if any generation/loading failed
                 const safeSideTex = sideTex || fallbackMaterial.map;
                 const safeTopTex = topTex || fallbackMaterial.map;
                 const safeBottomTex = bottomTex || fallbackMaterial.map;

                 // Ensure textures are actually textures before assigning
                 if(!(safeSideTex instanceof THREE.Texture)) throw new Error(`Side texture for ${type} is not a Texture`);
                 if(!(safeTopTex instanceof THREE.Texture)) throw new Error(`Top texture for ${type} is not a Texture`);
                 if(!(safeBottomTex instanceof THREE.Texture)) throw new Error(`Bottom texture for ${type} is not a Texture`);

                // Create material array
                materials[type] = [
                    new THREE.MeshStandardMaterial({ ...materialOptions, map: safeSideTex }), // px
                    new THREE.MeshStandardMaterial({ ...materialOptions, map: safeSideTex }), // nx
                    new THREE.MeshStandardMaterial({ ...materialOptions, map: safeTopTex }),  // py
                    new THREE.MeshStandardMaterial({ ...materialOptions, map: safeBottomTex }),// ny
                    new THREE.MeshStandardMaterial({ ...materialOptions, map: safeSideTex }), // pz
                    new THREE.MeshStandardMaterial({ ...materialOptions, map: safeSideTex }), // nz
                ];

            } else { // Single texture/material
                const texturePath = textureData ? textureData.all : null; // Get path only if using external
                const texture = useProcedural
                    ? generateBlockTexture(type, 'all')
                    : loadTexture(textureLoader, texturePath); // Pass path here

                 // Use fallback texture if generation/loading failed
                 const safeTexture = texture || fallbackMaterial.map;
                 if(!(safeTexture instanceof THREE.Texture)) throw new Error(`Single texture for ${type} is not a Texture`);

                 materialOptions.map = safeTexture;
                 materials[type] = new THREE.MeshStandardMaterial(materialOptions);
            }

             // Sanity check after creation
            if (!materials[type]) {
                console.warn(`Material creation failed silently for ${type}, assigning fallback.`);
                materials[type] = fallbackMaterial;
            }

        } catch (error) {
             console.error(`Error creating material for ${type}:`, error);
             // Ensure fallback is assigned on error
             materials[type] = fallbackMaterial;
        }
    } // End loop through block types

    console.log(`Finished creating materials. Returning:`, materials); // Debug End

    // Final safety check before returning
    if (typeof materials !== 'object' || materials === null) {
        console.error("CRITICAL: materials variable is not an object before return!", materials);
        return { 'fallback': fallbackMaterial }; // Return object with at least fallback
    }
    return materials;
}


// --- Sound (Remain the same) ---
export async function loadSoundFile(audioListener, url) {
    if (!audioListener || !audioListener.context || audioListener.context.state !== 'running') {
        console.warn(`AudioContext not ready, cannot load sound: ${url}`); return null;
    }
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${url}`);
        const arrayBuffer = await response.arrayBuffer();
        if (audioListener.context.state !== 'running') { console.warn(`AudioContext closed before decoding sound: ${url}`); return null; }
        const audioBuffer = await audioListener.context.decodeAudioData(arrayBuffer);
        console.log("Loaded sound:", url);
        return audioBuffer;
    } catch (error) { console.error(`Failed to load or decode sound ${url}:`, error); return null; }
}

export function playSound(audioListener, audioBuffer, volume = 0.5, detune = 0) {
     if (!audioBuffer || !audioListener || !audioListener.context || audioListener.context.state !== 'running') return;
    const sound = new THREE.Audio(audioListener);
    sound.setBuffer(audioBuffer);
    sound.setVolume(volume);
    if (detune !== 0) sound.setDetune(detune);
    sound.play();
}

// --- Geometry Generation Data ---
const CUBE_FACES = [
    // side, vertices (x,y,z), normal, base UV corners [[u,v],[u,v]...]
    { dir: [-1, 0, 0], corners: [ [0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1] ], uvCorners: [ [0, 1], [0, 0], [1, 1], [1, 0] ] }, // Left (-X)
    { dir: [1, 0, 0], corners: [ [1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0] ], uvCorners: [ [0, 1], [0, 0], [1, 1], [1, 0] ] }, // Right (+X)
    { dir: [0, -1, 0], corners: [ [1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0] ], uvCorners: [ [1, 1], [0, 1], [1, 0], [0, 0] ] }, // Bottom (-Y)
    { dir: [0, 1, 0], corners: [ [0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0] ], uvCorners: [ [0, 1], [1, 1], [0, 0], [1, 0] ] }, // Top (+Y)
    { dir: [0, 0, -1], corners: [ [1, 1, 0], [1, 0, 0], [0, 1, 0], [0, 0, 0] ], uvCorners: [ [0, 1], [0, 0], [1, 1], [1, 0] ] }, // Back (-Z)
    { dir: [0, 0, 1], corners: [ [0, 1, 1], [0, 0, 1], [1, 1, 1], [1, 0, 1] ], uvCorners: [ [0, 1], [0, 0], [1, 1], [1, 0] ] }, // Front (+Z)
];

function isBlockTransparent(blockType) { /* ... (same) ... */ }

/**
 * Generates merged mesh geometry data for a specific chunk using Texture Atlas UVs.
 */
export function generateChunkGeometryData(world, cx, cz) {
    const chunkKey = getChunkKey(cx, cz);
    // console.log(`   [FN] generateChunkGeometryData START for ${chunkKey}`); // Keep logs if needed

    const chunk = world.get(chunkKey);
    if (!chunk || chunk.size === 0) { /* ... (return null) ... */ }

    const geometries = {
        opaque: { positions: [], normals: [], uvs: [], indices: [] },
        transparent: { positions: [], normals: [], uvs: [], indices: [] },
    };
    const opaqueIndexOffset = { count: 0 };
    const transparentIndexOffset = { count: 0 };

    const startX = cx * WORLD.CHUNK_SIZE;
    const startY = 0;
    const startZ = cz * WORLD.CHUNK_SIZE;

    for (let ly = 0; ly < WORLD.MAX_HEIGHT; ++ly) {
        for (let lz = 0; lz < WORLD.CHUNK_SIZE; ++lz) {
            for (let lx = 0; lx < WORLD.CHUNK_SIZE; ++lx) {
                const localKey = getLocalBlockKey(lx, ly, lz);
                const blockType = chunk.get(localKey);

                if (!blockType) continue;

                const isTransparent = isBlockTransparent(blockType);
                const targetGeometry = isTransparent ? geometries.transparent : geometries.opaque;
                const indexOffset = isTransparent ? transparentIndexOffset : opaqueIndexOffset;

                const worldX = startX + lx;
                const worldY = startY + ly;
                const worldZ = startZ + lz;

                // Check neighbours for exposed faces
                // VVVV MODIFIED LOOP VVVV
                for (const { dir, corners, uvCorners } of CUBE_FACES) { // Use uvCorners now
                    const neighborX = worldX + dir[0];
                    const neighborY = worldY + dir[1];
                    const neighborZ = worldZ + dir[2];
                    const neighborType = getBlock(world, neighborX, neighborY, neighborZ, 'geometry'); // Pass caller

                    if (isBlockTransparent(neighborType) && (!isTransparent || neighborType !== blockType) ) {

                        // --- Get UV coordinates from ATLAS ---
                        const [uStart, vStart, uEnd, vEnd] = ATLAS.getBlockUVs(blockType, dir);
                        // ---

                        const baseIndex = indexOffset.count;
                        // Add vertices for this face
                        for(let i = 0; i < corners.length; i++) {
                            const corner = corners[i];
                            targetGeometry.positions.push(worldX + corner[0], worldY + corner[1], worldZ + corner[2]);
                            targetGeometry.normals.push(dir[0], dir[1], dir[2]);

                            // --- Calculate Atlas UV for this vertex ---
                            // uvCorners[i] gives [0 or 1, 0 or 1] for the base face UV
                            const cornerUV = uvCorners[i];
                            const atlasU = uStart + cornerUV[0] * (uEnd - uStart);
                            const atlasV = vStart + cornerUV[1] * (vEnd - vStart);
                            targetGeometry.uvs.push(atlasU, atlasV);
                            // ---
                        }

                        // Add indices (same as before)
                        targetGeometry.indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
                        targetGeometry.indices.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);
                        indexOffset.count += 4;
                    }
                }
                // ^^^^ END MODIFIED LOOP ^^^^
            }
        }
    }

    // console.log(`   [FN] generateChunkGeometryData END for ${chunkKey}. ...`); // Keep logs if needed

    if (geometries.opaque.indices.length === 0 && geometries.transparent.indices.length === 0) {
        return null;
    }
    return geometries;
}