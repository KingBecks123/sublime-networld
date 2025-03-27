// src/world/generation.js
import * as THREE from 'three';
import * as DATA from '../../data.js';
import { ATLAS } from '../../data.js';
import * as FN from '../../functions.js';
import { world, getBlock } from './world.js'; // Import world map and getBlock

/**
 * Populates the world data map for a single chunk.
 */
export function generateChunkData(cx, cz) {
    const chunkKey = FN.getChunkKey(cx, cz);
    if (world.has(chunkKey)) return; // Already generated

    const chunkMap = new Map();
    world.set(chunkKey, chunkMap);

    const startX = cx * DATA.WORLD.CHUNK_SIZE;
    const startZ = cz * DATA.WORLD.CHUNK_SIZE;

    for (let lx = 0; lx < DATA.WORLD.CHUNK_SIZE; lx++) {
        for (let lz = 0; lz < DATA.WORLD.CHUNK_SIZE; lz++) {
            const worldX = startX + lx;
            const worldZ = startZ + lz;
            const baseHeight = DATA.WORLD.MAX_HEIGHT / 3;
            const noiseVal = FN.simpleNoise(worldX, worldZ);
            const terrainHeight = Math.floor(baseHeight + noiseVal);
            const stoneHeight = Math.max(0, terrainHeight - 3);

            for (let worldY = 0; worldY <= terrainHeight && worldY < DATA.WORLD.MAX_HEIGHT; worldY++) {
                let blockType;
                // ... (Determine blockType based on height/water level - same logic) ...
                if (worldY === terrainHeight) blockType = DATA.BLOCK.TYPES.GRASS;
                else if (worldY >= stoneHeight) blockType = DATA.BLOCK.TYPES.DIRT;
                else blockType = DATA.BLOCK.TYPES.STONE;
                const waterLevel = baseHeight - Math.abs(DATA.WORLD.TERRAIN_MAGNITUDE / 2) + 1;
                 if (worldY <= waterLevel + 1 && blockType !== DATA.BLOCK.TYPES.STONE) {
                     blockType = (worldY <= waterLevel) ? DATA.BLOCK.TYPES.SAND : DATA.BLOCK.TYPES.GRASS;
                 }

                // Set data directly in the imported world map
                const { lx: currentLX, ly: currentLY, lz: currentLZ } = FN.getLocalCoordinates(worldX, worldY, worldZ, cx, cz);
                const localKey = FN.getLocalBlockKey(currentLX, currentLY, currentLZ);
                chunkMap.set(localKey, blockType);
            }
        }
    }
}

// --- Geometry Generation Data --- (Copied from functions.js, uses imported getBlock)
 const CUBE_FACES = [
     // side, vertices (x,y,z), normal, base UV corners [[u,v],[u,v]...]
     { dir: [-1, 0, 0], corners: [ [0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1] ], uvCorners: [ [0, 1], [0, 0], [1, 1], [1, 0] ] }, // Left (-X)
     { dir: [1, 0, 0], corners: [ [1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0] ], uvCorners: [ [0, 1], [0, 0], [1, 1], [1, 0] ] }, // Right (+X)
     { dir: [0, -1, 0], corners: [ [1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0] ], uvCorners: [ [1, 1], [0, 1], [1, 0], [0, 0] ] }, // Bottom (-Y)
     { dir: [0, 1, 0], corners: [ [0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0] ], uvCorners: [ [0, 1], [1, 1], [0, 0], [1, 0] ] }, // Top (+Y)
     { dir: [0, 0, -1], corners: [ [1, 1, 0], [1, 0, 0], [0, 1, 0], [0, 0, 0] ], uvCorners: [ [0, 1], [0, 0], [1, 1], [1, 0] ] }, // Back (-Z)
     { dir: [0, 0, 1], corners: [ [0, 1, 1], [0, 0, 1], [1, 1, 1], [1, 0, 1] ], uvCorners: [ [0, 1], [0, 0], [1, 1], [1, 0] ] }, // Front (+Z)
 ];

function isBlockTransparent(blockType) {
     return !blockType || blockType === DATA.BLOCK.TYPES.GLASS || blockType === DATA.BLOCK.TYPES.LEAVES;
}

export function generateChunkGeometryData(cx, cz) {
    const chunkKey = FN.getChunkKey(cx, cz);
    const chunk = world.get(chunkKey); // Access imported world map
    if (!chunk || chunk.size === 0) { return null; }

    const geometries = { opaque: { positions: [], normals: [], uvs: [], indices: [] }, transparent: { positions: [], normals: [], uvs: [], indices: [] } };
    const opaqueIndexOffset = { count: 0 }; const transparentIndexOffset = { count: 0 };
    const startX = cx * DATA.WORLD.CHUNK_SIZE; const startY = 0; const startZ = cz * DATA.WORLD.CHUNK_SIZE;

    for (let ly = 0; ly < DATA.WORLD.MAX_HEIGHT; ++ly) {
        for (let lz = 0; lz < DATA.WORLD.CHUNK_SIZE; ++lz) {
            for (let lx = 0; lx < DATA.WORLD.CHUNK_SIZE; ++lx) {
                const localKey = FN.getLocalBlockKey(lx, ly, lz);
                const blockType = chunk.get(localKey);
                if (!blockType) continue;

                const isTransparent = isBlockTransparent(blockType);
                const targetGeometry = isTransparent ? geometries.transparent : geometries.opaque;
                const indexOffset = isTransparent ? transparentIndexOffset : opaqueIndexOffset;
                const worldX = startX + lx; const worldY = startY + ly; const worldZ = startZ + lz;

                for (const { dir, corners, uvCorners } of CUBE_FACES) {
                    const neighborX = worldX + dir[0]; const neighborY = worldY + dir[1]; const neighborZ = worldZ + dir[2];
                    const neighborType = getBlock(neighborX, neighborY, neighborZ, 'geometry'); // Use imported getBlock

                    if (isBlockTransparent(neighborType) && (!isTransparent || neighborType !== blockType) ) {
                        const [uStart, vStart, uEnd, vEnd] = ATLAS.getBlockUVs(blockType, dir);
                        const baseIndex = indexOffset.count;
                        for(let i = 0; i < corners.length; i++) {
                            const corner = corners[i];
                            targetGeometry.positions.push(worldX + corner[0], worldY + corner[1], worldZ + corner[2]);
                            targetGeometry.normals.push(dir[0], dir[1], dir[2]);
                            const cornerUV = uvCorners[i];
                            const atlasU = uStart + cornerUV[0] * (uEnd - uStart);
                            const atlasV = vStart + cornerUV[1] * (vEnd - vStart);
                            targetGeometry.uvs.push(atlasU, atlasV);
                        }
                        targetGeometry.indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
                        targetGeometry.indices.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);
                        indexOffset.count += 4;
                    }
                }
            }
        }
    }
    if (geometries.opaque.indices.length === 0 && geometries.transparent.indices.length === 0) return null;
    return geometries;
}