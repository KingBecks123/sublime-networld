// data.js

import * as THREE from 'three';

// --- Constants ---
export const PI_2 = Math.PI / 2;

export const BLOCK = {
    SIZE: 1,
    TYPES: {
        GRASS: 'grass',
        DIRT: 'dirt',
        STONE: 'stone',
        WOOD: 'wood', // Oak Planks
        LEAVES: 'leaves', // Oak Leaves
        SAND: 'sand',
        LOG: 'log', // Oak Log
        STONE_BRICK: 'stone_brick',
        GLASS: 'glass',
        // Add more block types here if needed
    }
};

export const PLAYER = {
    HEIGHT: 1.8,
    WIDTH: 0.4, // Collision width
    SPEED: 5.0,
    JUMP_FORCE: 7.0,
    REACH: 5, // Block interaction distance
};

export const WORLD = {
    GRAVITY: 15.0,
    CHUNK_SIZE: 16,
    GENERATION_RADIUS: 4,
    MAX_HEIGHT: 64,
    TERRAIN_SCALE: 30,
    TERRAIN_MAGNITUDE: 10,
};

export const DAY_CYCLE = {
    ENABLED: true,
    SPEED: 0.05,
    MAX_LIGHT: 0.7,
    MIN_LIGHT: 0.1,
    MAX_SUN: 0.6,
    MIN_SUN: 0.0,
};

// --- Texture Generation Colors ---
export const textureColors = {
    grassGreen: '#6a994e', lightGrass: '#a7c957', darkGrass: '#55803C',
    dirtBrown: '#8a5a44', darkDirt: '#6f4e37', lightDirt: '#a07158',
    stoneGrey: '#8d99ae', darkStone: '#6b788e', lightStone: '#adb5bd', crackStone: '#505A68',
    woodTan: '#a07158', darkWoodLine: '#6f4e37', woodGrain: '#583a2e',
    leavesGreen: '#55a630', darkLeaves: '#386641', holeLeaves: '#000000',
    sandYellow: '#f2e8cf', darkSand: '#e0d8b0', lightSand: '#FFFBF0',
    logBrown: '#6f4518', darkLogBark: '#4d3e2f', logRingLight: '#a07158', logRingDark: '#583a2e',
    brickGrey: '#a8a2a2', brickMortar: '#646262',
    glassBlue: '#caf0f8', glassShine: '#ffffff', glassBorder: '#a0dae8',
    fallbackMagenta: '#FF00FF', fallbackBlack: '#000000',
};

// --- External Texture Paths ---
// Assumes a 'textures' folder next to your HTML file
// Keys MUST match BLOCK.TYPES
export const blockTexturePaths = {
    [BLOCK.TYPES.GRASS]: { top: 'textures/grass_top.png', side: 'textures/grass_side.png', bottom: 'textures/dirt.png' },
    [BLOCK.TYPES.DIRT]: { all: 'textures/dirt.png' },
    [BLOCK.TYPES.STONE]: { all: 'textures/stone.png' },
    [BLOCK.TYPES.WOOD]: { all: 'textures/oak_planks.png' },
    [BLOCK.TYPES.LEAVES]: { all: 'textures/oak_leaves.png' },
    [BLOCK.TYPES.SAND]: { all: 'textures/sand.png' },
    [BLOCK.TYPES.LOG]: { top: 'textures/oak_log_top.png', side: 'textures/oak_log.png', bottom: 'textures/oak_log_top.png' },
    [BLOCK.TYPES.STONE_BRICK]: { all: 'textures/stonebrick.png' },
    [BLOCK.TYPES.GLASS]: { all: 'textures/glass.png' },
    // Add paths for new blocks here
};

export const skyboxTexturePaths = [
    'textures/skybox/px.png', // Right
    'textures/skybox/nx.png', // Left
    'textures/skybox/py.png', // Top
    'textures/skybox/ny.png', // Bottom
    'textures/skybox/pz.png', // Front
    'textures/skybox/nz.png'  // Back
];

// --- Hotbar/Inventory ---
export const hotbarTypes = [
    BLOCK.TYPES.GRASS, BLOCK.TYPES.DIRT, BLOCK.TYPES.STONE, BLOCK.TYPES.LOG, BLOCK.TYPES.LEAVES,
    BLOCK.TYPES.SAND, BLOCK.TYPES.WOOD, BLOCK.TYPES.STONE_BRICK, BLOCK.TYPES.GLASS
];

// Basic inventory representation (infinite for now)
export const initialInventory = {
    [BLOCK.TYPES.GRASS]: Infinity,
    [BLOCK.TYPES.DIRT]: Infinity,
    [BLOCK.TYPES.STONE]: Infinity,
    [BLOCK.TYPES.WOOD]: Infinity,
    [BLOCK.TYPES.LEAVES]: Infinity,
    [BLOCK.TYPES.SAND]: Infinity,
    [BLOCK.TYPES.LOG]: Infinity,
    [BLOCK.TYPES.STONE_BRICK]: Infinity,
    [BLOCK.TYPES.GLASS]: Infinity,
};

export const ATLAS = {
    // --- Configuration ---
    PATH: 'textures/atlas.png',
    TILE_SIZE: 16,          // Pixel size of one texture tile (e.g., 16x16)
    ATLAS_WIDTH: 64,        // Total width of the atlas image in pixels
    ATLAS_HEIGHT: 64,       // Total height of the atlas image in pixels

    // --- UV Mapping ---
    // Map block type names (and potentially face names) to [U_start, V_start] coordinates
    // Coordinates are normalized (0.0 to 1.0) relative to the ATLAS size.
    UV_MAP: {
        // Example based on the conceptual 64x64 atlas above:
        [BLOCK.TYPES.GRASS]: {
            top:    [0 / 64, 0 / 64], // x=0, y=0
            side:   [0 / 64, 16 / 64], // x=0, y=16
            bottom: [16 / 64, 0 / 64]  // x=16, y=0 (Using DIRT)
        },
        [BLOCK.TYPES.DIRT]: {
            all:    [16 / 64, 0 / 64]  // x=16, y=0
        },
        [BLOCK.TYPES.STONE]: {
            all:    [32 / 64, 0 / 64]  // x=32, y=0
        },
        [BLOCK.TYPES.WOOD]: { // Oak Planks
            all:    [48 / 64, 0 / 64]  // x=48, y=0
        },
        [BLOCK.TYPES.LOG]: { // Oak Log
            top:    [16 / 64, 16 / 64], // x=16, y=16
            side:   [32 / 64, 16 / 64], // x=32, y=16
            bottom: [16 / 64, 16 / 64]  // x=16, y=16
        },
        [BLOCK.TYPES.LEAVES]: { // Oak Leaves
            all:    [48 / 64, 16 / 64]  // x=48, y=16 (Assume this is on the atlas)
        },
         [BLOCK.TYPES.SAND]: {
            all:    [0 / 64, 32 / 64]  // x=0, y=32
        },
        [BLOCK.TYPES.STONE_BRICK]: {
            all:    [16 / 64, 32 / 64] // x=16, y=32
        },
        [BLOCK.TYPES.GLASS]: {
            all:    [32 / 64, 32 / 64] // x=32, y=32
        },
        // Add other blocks...
        fallback:   [48 / 64, 48 / 64] // Define a fallback position x=48, y=48
    },

    // Helper function to get UVs for a specific block type and face direction
    getBlockUVs: function(blockType, faceDir) {
        const mapping = ATLAS.UV_MAP[blockType] || ATLAS.UV_MAP.fallback;
        let uvStart;

        if (mapping.all) {
            uvStart = mapping.all;
        } else {
            // Determine face name based on direction vector [x, y, z]
            if (faceDir[1] === 1) uvStart = mapping.top;    // +Y
            else if (faceDir[1] === -1) uvStart = mapping.bottom; // -Y
            else uvStart = mapping.side;                   // All others use 'side'

            // Fallback if specific face isn't defined but 'all' isn't either
            if (!uvStart) uvStart = ATLAS.UV_MAP.fallback;
        }

        const tileU = ATLAS.TILE_SIZE / ATLAS.ATLAS_WIDTH;
        const tileV = ATLAS.TILE_SIZE / ATLAS.ATLAS_HEIGHT;

        // Return the [U_start, V_start, U_end, V_end] normalized coordinates
        return [
            uvStart[0],         // U start
            uvStart[1],         // V start
            uvStart[0] + tileU, // U end
            uvStart[1] + tileV  // V end
        ];
    }
};