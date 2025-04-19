// Main entry point for Critocracy game

import { initializeUI } from './ui.js';
import { setupBoard } from './board.js'; 
import './animations.js'; // Import animations module

// Initialize the UI when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded. Initializing Critocracy UI...");

    try {
        // First, ensure all screens are hidden
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
            screen.classList.remove('active');
        });
        
        // Wait for a small delay to ensure all elements are loaded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify all required elements exist
        const requiredElements = [
            'start-screen', 
            'player-count-screen', 
            'role-selection-screen',
            'turn-order-screen',
            'game-board-screen',
            'end-game-screen',
            'board-canvas',
            'roll-dice-btn',
            'end-turn-btn',
            'card-popup'
        ];
        
        for (const elementId of requiredElements) {
            if (!document.getElementById(elementId)) {
                throw new Error(`Required UI element not found: ${elementId}`);
            }
        }
        
        // 1. Initialize Board Module (Load images, set up canvas)
        const boardReady = await setupBoard(); 
        if (!boardReady) {
            throw new Error("Board module failed to initialize (images/canvas).");
        }

        // 2. Initialize UI (Setup screens, event listeners)
        const uiReady = initializeUI();
        if (!uiReady) {
            throw new Error("UI failed to initialize.");
        }
        
        // 3. Initialize game state
        window.game = {
            state: 'SETUP',
            players: [],
            currentPlayer: null,
            turnOrder: [],
            totalPlayers: 0,
            humanPlayers: 0
        };
        
        console.log("Initialization complete. Ready for player input.");
        
    } catch (error) {
        console.error("Critical initialization error:", error);
        alert("There was an error initializing the game. Please refresh the page and try again.");
    }
});