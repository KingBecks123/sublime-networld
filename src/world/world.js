// src/world/world.js
import * as FN from '../../functions.js'; // Generic utils
import * as DATA from '../../data.js';

export const world = new Map(); // Map<chunkKey, Map<localBlockKey, blockType>>
export const chunkMeshes = new Map(); // Map<chunkKey, { opaque: Mesh | null, transparent: Mesh | null }>

export function getBlock(x, y, z, caller = 'unknown') {
    // Use the previously refined getBlock logic, but access 'world' directly
    const worldX = Math.floor(x);
    const worldY = Math.floor(y);
    const worldZ = Math.floor(z);

    // const shouldLog = /* ... logging condition ... */ ;
    // if (shouldLog) console.log(`[getBlock Caller: ${caller}] ...`);

    if (isNaN(worldY) || worldY < 0 || worldY >= DATA.WORLD.MAX_HEIGHT + 10) return null;
    const { cx, cz } = FN.getChunkCoordinates(worldX, worldZ);
    if (isNaN(cx) || isNaN(cz)) return null;
    const chunkKey = FN.getChunkKey(cx, cz);
    const chunk = world.get(chunkKey);

    if (chunk) {
        const { lx, ly, lz } = FN.getLocalCoordinates(worldX, worldY, worldZ, cx, cz);
        if (isNaN(lx) || isNaN(ly) || isNaN(lz)) return null;
        const localKey = FN.getLocalBlockKey(lx, ly, lz);
        const blockType = chunk.get(localKey);
        return blockType;
    }
    return null;
}

export function addBlockData(x, y, z, type) {
    // Use previous addBlockData logic, accessing 'world' directly
    const worldX = Math.floor(x); /* ... */ const worldY = Math.floor(y); /* ... */ const worldZ = Math.floor(z); /* ... */
    if (isNaN(worldY) || worldY < 0 || worldY >= DATA.WORLD.MAX_HEIGHT) return false;
    const { cx, cz } = FN.getChunkCoordinates(worldX, worldZ);
    if (isNaN(cx) || isNaN(cz)) return false;
    const chunkKey = FN.getChunkKey(cx, cz);
    let chunk = world.get(chunkKey);
    if (!chunk) { console.error(`Add: Chunk ${chunkKey} not found`); return false; }
    const { lx, ly, lz } = FN.getLocalCoordinates(worldX, worldY, worldZ, cx, cz);
    if (isNaN(lx) || isNaN(ly) || isNaN(lz)) return false;
    const localKey = FN.getLocalBlockKey(lx, ly, lz);
    if (chunk.has(localKey)) return false; // Don't overwrite
    chunk.set(localKey, type);
    return true;
}

 export function removeBlockData(x, y, z) {
    // Use previous removeBlockData logic, accessing 'world' directly
    const worldX = Math.floor(x); /* ... */ const worldY = Math.floor(y); /* ... */ const worldZ = Math.floor(z); /* ... */
    if (isNaN(worldX) || isNaN(worldY) || isNaN(worldZ)) return null;
    const { cx, cz } = FN.getChunkCoordinates(worldX, worldZ);
    if (isNaN(cx) || isNaN(cz)) return null;
    const chunkKey = FN.getChunkKey(cx, cz);
    const chunk = world.get(chunkKey);
    if (!chunk) return null;
    const { lx, ly, lz } = FN.getLocalCoordinates(worldX, worldY, worldZ, cx, cz);
    if (isNaN(lx) || isNaN(ly) || isNaN(lz)) return null;
    const localKey = FN.getLocalBlockKey(lx, ly, lz);
    if (!chunk.has(localKey)) return null;
    const blockType = chunk.get(localKey);
    chunk.delete(localKey);
    return blockType;
}