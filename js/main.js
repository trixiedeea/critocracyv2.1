// Main entry point for Critocracy game

import { initializeUI, showScreen, setupPlayerCountUI } from './ui.js';
import { setupBoard } from './board.js'; 
import './animations.js'; // Import animations module

// Initialize the UI when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded. Initializing Critocracy UI...");

    try {
        // Ensure the start screen is visible first
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.style.display = 'flex';
            startScreen.classList.add('active');
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
        
        console.log("Critocracy UI ready. Setting up transition to player count screen...");
        
        // 3. Set up player count UI
        setupPlayerCountUI();
        
        // 4. Show player count screen
        showScreen('player-count-screen');
        
        // 5. Initialize game state
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