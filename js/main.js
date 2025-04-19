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
        
        // Wait for all assets to load
        await new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
        
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
            const element = document.getElementById(elementId);
            if (!element) {
                throw new Error(`Required UI element not found: ${elementId}`);
            }
            // Ensure elements are properly hidden
            if (element.classList.contains('screen')) {
                element.style.display = 'none';
                element.classList.remove('active');
            }
        }
        
        // 1. Initialize Board Module (Load images, set up canvas)
        console.log("Setting up board...");
        const boardReady = await setupBoard(); 
        if (!boardReady) {
            throw new Error("Board module failed to initialize (images/canvas).");
        }
        console.log("Board setup complete.");

        // 2. Initialize UI (Setup screens, event listeners)
        console.log("Initializing UI...");
        const uiReady = await initializeUI();
        if (!uiReady) {
            throw new Error("UI failed to initialize.");
        }
        console.log("UI initialization complete.");
        
        // 3. Initialize game state
        window.game = {
            state: 'SETUP',
            players: [],
            currentPlayer: null,
            turnOrder: [],
            totalPlayers: 0,
            humanPlayers: 0
        };
        
        // 4. Show the start screen explicitly
        console.log("Displaying start screen...");
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            // Remove any existing styles first
            startScreen.removeAttribute('style');
            // Set display and active class
            startScreen.style.display = 'flex';
            startScreen.classList.add('active');
            
            // Ensure start button is visible and styled
            const startButton = document.getElementById('start-game-btn');
            if (startButton) {
                startButton.removeAttribute('style');
                startButton.style.display = 'block';
                startButton.style.visibility = 'visible';
                startButton.style.opacity = '1';
            }
        }
        
        console.log("Initialization complete. Start screen should be visible.");
        
    } catch (error) {
        console.error("Critical initialization error:", error);
        // Create a more user-friendly error display
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border: 2px solid red;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            z-index: 9999;
        `;
        errorDiv.innerHTML = `
            <h2 style="color: red; margin-bottom: 10px;">Initialization Error</h2>
            <p style="margin-bottom: 15px;">${error.message}</p>
            <button onclick="location.reload()" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Refresh Page
            </button>
        `;
        document.body.appendChild(errorDiv);
    }
});