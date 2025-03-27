// src/ui/hotbar.js
import * as DATA from '../../data.js';

let currentActiveSlotIndex = 0;
let hotbarSlotsRef = null; // Reference to the DOM slot elements

/**
 * Initializes hotbar elements, sets up data attributes and initial visuals.
 * @param {NodeListOf<Element>} hotbarSlots - The DOM elements for the hotbar slots.
 */
// VVV FIX: Add export keyword VVV
export function initHotbar(hotbarSlots) {
    console.log("[Hotbar] Initializing...");
    if (!hotbarSlots || hotbarSlots.length === 0) {
        console.error("[Hotbar] No hotbar slots passed to initHotbar!");
        return;
    }
    hotbarSlotsRef = hotbarSlots; // Store reference

    hotbarSlotsRef.forEach((slot, index) => {
        // ... (rest of the function remains the same) ...
         // Clear previous state
        slot.innerHTML = '';
        slot.classList.remove('active');
        delete slot.dataset.blockType;

        if (index < DATA.hotbarTypes.length) {
            const type = DATA.hotbarTypes[index];
            slot.dataset.blockType = type; // Store type in data attribute

            // --- Add visual representation (e.g., icon or label) ---
            const label = document.createElement('span');
            label.textContent = type.replace(/_/g, ' ').substring(0, 4).toUpperCase();
            label.style.pointerEvents = 'none';
            label.style.fontSize = '10px';
            label.style.lineHeight = '1.1';
            label.style.textAlign = 'center';
            slot.appendChild(label);

            // --- Add count display element ---
            const countEl = document.createElement('span');
            countEl.className = 'count';
            Object.assign(countEl.style, {
                position: 'absolute', bottom: '2px', right: '4px',
                fontSize: '14px', fontWeight: 'bold', color: 'white',
                textShadow: '1px 1px 1px black, -1px -1px 1px black, 1px -1px 1px black, -1px 1px 1px black',
                pointerEvents: 'none',
            });
            slot.appendChild(countEl);

        } else {
            slot.style.backgroundColor = 'rgba(50, 50, 50, 0.6)';
        }
        slot.addEventListener('click', () => setActiveSlot(index)); // Use internal setActiveSlot
    });

    setActiveSlot(0); // Activate the first slot by default
    console.log("[Hotbar] Initialization complete.");
}

// setActiveSlot should likely remain internal unless needed elsewhere
function setActiveSlot(index) { // Removed export, unless needed externally
    if (!hotbarSlotsRef || index < 0 || index >= hotbarSlotsRef.length || index === currentActiveSlotIndex) return;

    if (currentActiveSlotIndex >= 0 && currentActiveSlotIndex < hotbarSlotsRef.length) {
         hotbarSlotsRef[currentActiveSlotIndex]?.classList.remove('active');
    }
    currentActiveSlotIndex = index;
    hotbarSlotsRef[currentActiveSlotIndex]?.classList.add('active');
    console.log(`[Hotbar] Active slot set to: ${currentActiveSlotIndex} (Type: ${getSelectedBlockType()})`);
}

// Make sure these functions below are actually exported if needed elsewhere
export function getSelectedBlockType() {
    if (!hotbarSlotsRef || currentActiveSlotIndex < 0 || currentActiveSlotIndex >= hotbarSlotsRef.length) {
        return null;
    }
    return hotbarSlotsRef[currentActiveSlotIndex]?.dataset.blockType || null;
}

export function updateHotbarDisplay(inventory) {
     if (!hotbarSlotsRef) { console.warn("[Hotbar] Update display called before init."); return; }
     if (!inventory) { console.warn("[Hotbar] Inventory not provided for display update."); return; }

    hotbarSlotsRef.forEach((slot) => {
        const type = slot.dataset.blockType;
        const countEl = slot.querySelector('.count');
        if (type && countEl && inventory[type] !== undefined) {
            const count = inventory[type];
            countEl.textContent = count === Infinity ? '∞' : count.toString();
            countEl.style.display = (count > 0 || count === Infinity) ? 'block' : 'none';
            slot.style.opacity = (count === 0 && count !== Infinity) ? 0.5 : 1.0;
        } else if (countEl) {
             countEl.style.display = 'none';
             slot.style.opacity = 1.0;
        } else if (!type) {
             slot.style.opacity = 1.0;
        }
    });
}

export function handleDigitKey(index) {
    // Call the internal setActiveSlot function
    setActiveSlot(index);
}