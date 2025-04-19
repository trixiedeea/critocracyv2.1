// UI Module for Critocracy
// Handles all visual elements and user interactions

// Game Logic Imports (Refactored)
import {
    initializeGame, // For starting game from setup UI
    handlePlayerAction, // For Roll, End Turn, Ability buttons
    getGameState, // For checking current state in UI
    resolvePlayerChoice // For handling validated clicks on choices
} from './game.js';

// Player Data Imports
import { getPlayers, getPlayerById, PLAYER_ROLES } from './players.js'; 

// Board Helper Imports
import { 
    drawBoard, // To redraw the board
    scaleCoordinates, // To convert board coords to canvas coords
    unscaleCoordinates, // To convert canvas clicks to board coords
    setupBoard, // To initialize board state (if UI triggers it)
    findSpaceDetailsByCoords, // To find space details by coordinates
    getPathColorFromCoords, // To get path color from coordinates
    resizeCanvas, // To resize canvas based on container size
    drawAllPlayerTokens // Re-export this function
} from './board.js'; 

// Animation Imports
import { 
    animateDiceRoll, 
    animateResourceChange,
    showTurnTransition,
    animateTokenToPosition,
    animateCardFlip,
    animateCardDrawFromDeck,
    clearHighlights // Import clearHighlights from animations.js
} from './animations.js';

// Import logging functions
import { 
    logGameEvent, 
    logResourceChange, 
    logPlayerAction, 
    logPlayerMovement
} from './logging.js';

// Re-export clearHighlights
export { clearHighlights };

// ===== UI State (Restructured) =====
const elements = {
    screens: { // Group screen containers here
        startScreen: document.getElementById('start-screen'),
        playerCountScreen: document.getElementById('player-count-screen'),
        roleSelectionScreen: document.getElementById('role-selection-screen'),
        turnOrderScreen: document.getElementById('turn-order-screen'),
        gameBoardScreen: document.getElementById('game-board-screen'),
        endGameScreen: document.getElementById('end-game-screen'),
        cardView: document.getElementById('card-view')
    },
    playerConfig: { // Group player config elements
        totalPlayerCount: document.getElementById('total-player-count'),
        humanPlayerCount: document.getElementById('human-player-count'),
        playerCountConfirm: document.getElementById('player-count-confirm'),
        roleSelectionContainer: document.getElementById('role-selection-container'),
        roleConfirm: document.getElementById('role-confirm'),
        initialStartBtn: document.getElementById('start-game-btn')
    },
    gameBoard: { // Group game board elements
        boardCanvas: document.getElementById('board-canvas'),
        playerInfoPanel: document.getElementById('player-info-panel'),
        messageLog: document.getElementById('message-log'),
        rollDiceBtn: document.getElementById('roll-dice-btn'),
        endTurnBtn: document.getElementById('end-turn-btn'),
        useAbilityBtn: document.getElementById('use-ability-btn')
    },
    popups: { // Group popup elements
        diceDisplay: document.getElementById('dice-display'), 
        cardPopup: document.getElementById('card-popup'),
        cardTitle: document.getElementById('card-title'),
        cardDescription: document.getElementById('card-description'),
        cardRoleExplanation: document.getElementById('card-effects'), 
        showExplanationBtn: document.getElementById('show-card-details-btn'), 
        closeCardBtn: document.getElementById('close-card-btn'),
        trade: document.getElementById('trade-prompt-modal'),
        tradePromptText: document.getElementById('trade-prompt-details'),
        tradeAccept: document.getElementById('trade-accept-btn'),
        tradeReject: document.getElementById('trade-reject-btn'),
        tradePlayerResources: document.getElementById('trade-player-resources'),
        targetSelection: document.getElementById('target-selection-modal'),
        targetDescription: document.getElementById('target-selection-description'),
        targetPlayerList: document.getElementById('target-player-list'),
        cancelTargetBtn: document.getElementById('cancel-target-btn')
    },
    endGame: { // Group end game elements
        endGameContainer: document.getElementById('end-game-container'),
        newGameBtn: document.getElementById('new-game-btn')
    },
    cardView: { // Group card view elements
        cardContainer: document.getElementById('card-container')
    }
};

// ===== Canvas & Drawing =====
// eslint-disable-next-line no-unused-vars
let currentHighlights = []; 
const PLAYER_TOKEN_RADIUS = 10; 

// ===== Callbacks =====
let tradeResponseCallback = null;
let targetSelectionCallback = null;

// ===== Game State Management =====
const gameState = {
    players: [],
    totalPlayers: 0,
    humanPlayers: 0,
    selectedRoles: [],
    currentPlayer: null,
    roleInfo: {},
    playerColor: {},
    container: null,
    panel: null,
    rect: null,
    indicator: null,
    detailsElement: null,
    cardPopup: null,
    tokenElement: null
};

// Helper function to get player color
function getPlayerColor(role) {
    if (!gameState.playerColor[role]) {
        const roleInfo = PLAYER_ROLES[role];
        gameState.playerColor[role] = roleInfo?.color || '#808080';
    }
    return gameState.playerColor[role];
}

// Helper function to get role info
function getRoleInfo(role) {
    if (!gameState.roleInfo[role]) {
        gameState.roleInfo[role] = PLAYER_ROLES[role] || {};
    }
    return gameState.roleInfo[role];
}

// Helper function to get screen coordinates
function getScreenCoordinates(coords) {
    if (!gameState.rect) {
        const canvas = elements.gameBoard.boardCanvas;
        gameState.rect = canvas.getBoundingClientRect();
    }
    return {
        x: coords[0] * gameState.rect.width,
        y: coords[1] * gameState.rect.height
    };
}

// Helper function to get effects HTML
function getEffectsHTML(effects, player) {
    if (!effects) return '';
    return effects.map(effect => {
        const formatted = formatEffect(effect);
        return `<div class="effect">${formatted}</div>`;
    }).join('');
}

// Helper function to log UI events
function logUIEvent(eventType, playerId = null, data = {}) {
    const event = {
        type: eventType,
        timestamp: new Date().toISOString(),
        playerId,
        ...data
    };
    console.log(`UI Event:`, event);
}

// --- Initialization ---
export async function initializeUI() {
    console.log("Initializing UI...");
    
    try {
        // Validate essential UI elements exist
        validateElementsExist();
        
        // Get canvas context
        if (!elements.gameBoard.boardCanvas) {
            throw new Error("UI Init Error: Canvas element not found!");
        }
        elements.gameBoard.ctx = elements.gameBoard.boardCanvas.getContext('2d');
        
        // First hide all screens and remove any inline styles
        document.querySelectorAll('.screen').forEach(screen => {
            screen.removeAttribute('style');
            screen.style.display = 'none';
            screen.classList.remove('active');
        });
        
        // Setup event listeners
        setupEventListeners();
        
        // Set up board UI components if board is ready
        if (window.boardState && window.boardState.isInitialized) {
            console.log("Board is already initialized, setting up board UI components");
            await setupBoardUIComponents();
        } else {
            console.log("Board not yet initialized, will set up UI components when ready");
            window.addEventListener('boardInitialized', setupBoardUIComponents);
        }
        
        // Initialize canvas size
        safeResizeCanvas();
        window.addEventListener('resize', safeResizeCanvas);
        
        // Ensure start screen exists and is properly configured
        const startScreen = document.getElementById('start-screen');
        if (!startScreen) {
            throw new Error("Start screen element not found!");
        }
        
        console.log("UI Initialized successfully.");
        return true;
        
    } catch (error) {
        console.error("Critical Error initializing UI:", error);
        return false;
    }
}

/**
 * Safely handle canvas resizing with proper error handling and state management
 */
function safeResizeCanvas() {
    try {
        if (!elements.gameBoard.boardCanvas) return;
        
        const container = elements.gameBoard.boardCanvas.parentElement;
        if (!container) return;
        
        // Get container dimensions
        const rect = container.getBoundingClientRect();
        elements.gameBoard.boardCanvas.width = rect.width;
        elements.gameBoard.boardCanvas.height = rect.height;
        
        // Call the board's resize function if available
        if (typeof resizeCanvas === 'function') {
            resizeCanvas();
        }
        
        // Redraw if we're on the game board screen
        if (currentScreen === 'game-board-screen') {
            drawBoard();
            drawPlayers();
        }
    } catch (error) {
        console.error("Error resizing canvas:", error);
    }
}

/**
 * Validate that essential UI elements exist
 */
function validateElementsExist() {
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
    
    console.log("All required UI elements found");
    return true;
}

// Separate function to set up board-related UI components
async function setupBoardUIComponents() {
    // This function will be called once the board is initialized
    // It can use the board-related functions without causing duplicate initialization
    
    // Example of using findSpaceDetailsByCoords to get details about a space
    const startCoords = { x: 8, y: 472 }; // Start box coordinates
    const spaceDetails = findSpaceDetailsByCoords(startCoords);
    console.log("Start space details:", spaceDetails);
    
    // Example of using getPathColorFromCoords
    const pathColor = getPathColorFromCoords(168, 579); // Pink path first space
    console.log("Path color at (168, 579):", pathColor);
}

// --- Event Handlers Setup ---
function setupEventListeners() {
    console.log("Setting up event listeners...");
    
    // Start game button
    if (elements.playerConfig.initialStartBtn) {
        elements.playerConfig.initialStartBtn.addEventListener('click', () => {
            console.log("Start game button clicked");
            setupPlayerCountUI();
            showScreen('player-count-screen');
        });
    }
    
    // Player count confirm button
    if (elements.playerConfig.playerCountConfirm) {
        elements.playerConfig.playerCountConfirm.addEventListener('click', () => {
            const totalPlayers = parseInt(elements.playerConfig.totalPlayerCount.value);
            const humanPlayers = parseInt(elements.playerConfig.humanPlayerCount.value);
            
            if (totalPlayers >= 2 && humanPlayers >= 1 && humanPlayers <= totalPlayers) {
                setupRoleSelectionUI(totalPlayers, humanPlayers);
                showScreen('role-selection-screen');
            } else {
                console.error("Invalid player count configuration");
            }
        });
    }
    
    // Role confirm button
    if (elements.playerConfig.roleConfirm) {
        elements.playerConfig.roleConfirm.addEventListener('click', confirmRoleSelection);
    }
    
    // Game board controls
    if (elements.gameBoard.rollDiceBtn) {
        elements.gameBoard.rollDiceBtn.addEventListener('click', () => {
            handlePlayerAction('roll');
        });
    }
    
    if (elements.gameBoard.endTurnBtn) {
        elements.gameBoard.endTurnBtn.addEventListener('click', () => {
            handlePlayerAction('endTurn');
        });
    }
    
    if (elements.gameBoard.useAbilityBtn) {
        elements.gameBoard.useAbilityBtn.addEventListener('click', () => {
            handlePlayerAction('useAbility');
        });
    }
    
    // Card popup close button
    if (elements.popups.closeCardBtn) {
        elements.popups.closeCardBtn.addEventListener('click', hideCard);
    }
    
    // Trade buttons
    if (elements.popups.tradeAccept) {
        elements.popups.tradeAccept.addEventListener('click', () => {
            if (tradeResponseCallback) {
                tradeResponseCallback(true);
                tradeResponseCallback = null;
            }
            hideScreen('trade-prompt-modal');
        });
    }
    
    if (elements.popups.tradeReject) {
        elements.popups.tradeReject.addEventListener('click', () => {
            if (tradeResponseCallback) {
                tradeResponseCallback(false);
                tradeResponseCallback = null;
            }
            hideScreen('trade-prompt-modal');
        });
    }
    
    // Target selection cancel button
    if (elements.popups.cancelTargetBtn) {
        elements.popups.cancelTargetBtn.addEventListener('click', () => {
            if (targetSelectionCallback) {
                targetSelectionCallback(null);
                targetSelectionCallback = null;
            }
            hideScreen('target-selection-modal');
        });
    }
    
    // Canvas click handler
    if (elements.gameBoard.boardCanvas) {
        elements.gameBoard.boardCanvas.addEventListener('click', handleCanvasClick);
    }
    
    // Window resize handler
    window.addEventListener('resize', safeResizeCanvas);
    
    console.log("Event listeners setup complete");
}

// --- Setup Player Count UI ---
export function setupPlayerCountUI() {
    const totalPlayerCountElement = document.getElementById('total-player-count');
    const humanPlayerCountElement = document.getElementById('human-player-count');
    const playerCountConfirmBtn = document.getElementById('player-count-confirm');
    
    if (!totalPlayerCountElement || !humanPlayerCountElement || !playerCountConfirmBtn) {
        console.error("Player count UI elements not found");
        return;
    }
    
    // Set fixed total of 6 players
    if (totalPlayerCountElement) {
        // Hide or disable the total player count selector since it's fixed at 6
        const totalPlayerLabel = document.querySelector('label[for="total-player-count"]');
        if (totalPlayerLabel) {
            totalPlayerLabel.textContent = "Total Players: 6";
        }
        
        // Either hide the select element or set it to a fixed value of 6
        totalPlayerCountElement.value = "6";
        totalPlayerCountElement.disabled = true;
    }
    
    // Clear and populate human player count options (1-6)
    if (humanPlayerCountElement) {
        humanPlayerCountElement.innerHTML = '';
        for (let i = 1; i <= 6; i++) {
            const option = document.createElement('option');
            option.value = i.toString();
            option.textContent = i.toString();
            humanPlayerCountElement.appendChild(option);
        }
        humanPlayerCountElement.value = "1"; // Default to 1 human player
    }
    
    // Update handler for player count confirmation
    if (playerCountConfirmBtn) {
        // Remove any existing event listeners
        const newBtn = playerCountConfirmBtn.cloneNode(true);
        playerCountConfirmBtn.parentNode.replaceChild(newBtn, playerCountConfirmBtn);
        
        newBtn.addEventListener('click', () => {
            const totalPlayers = 6; // Fixed at 6
            const humanPlayers = parseInt(humanPlayerCountElement.value, 10) || 1;
            
            // Validate
            if (humanPlayers < 1 || humanPlayers > 6) {
                alert("Please select 1-6 human players.");
                return;
            }
            
            setupRoleSelectionUI(totalPlayers, humanPlayers);
            
            // Show the role selection screen
            showScreen('role-selection-screen');
        });
    }
}

// --- Setup Role Selection UI ---
export function setupRoleSelectionUI(totalPlayers, humanPlayers) {
    const roleConfirmButton = document.getElementById('role-confirm');
    
    // Initialize game object if it doesn't exist
    if (!window.game) {
        window.game = {
            totalPlayers: totalPlayers,
            humanPlayers: humanPlayers,
            players: [],
            addPlayer: function(name, role) {
                this.players.push({
                    name: name,
                    role: role,
                    isHuman: this.players.length < this.humanPlayers
                });
            }
        };
    } else {
        // Update existing game object
        window.game.totalPlayers = totalPlayers;
        window.game.humanPlayers = humanPlayers;
    }
    
    // Get the role selection grid container
    let roleGrid = document.querySelector('.role-selection-grid');
    if (!roleGrid) {
        console.error('Role selection grid not found in DOM');
        return;
    }
    
    // Clear any existing content
    roleGrid.innerHTML = '';
    
    // Define the roles in a 3x2 grid order
    const roles = [
        { 
            key: 'Revolutionary', 
            name: 'Revolutionary', 
            description: 'The Quietest Revolutionary That Ever There Was',
            resources: { knowledge: 14, influence: 8, money: 0 }, 
            special: "Ignores 1 sabotage per game.",
            opposition: "Colonialist",
            token: "R"
        },
        { 
            key: 'Historian', 
            name: 'Historian', 
            description: 'Rome\'s Greatest Gossip....err Historian',
            resources: { knowledge: 14, money: 8, influence: 0 }, 
            special: "Cannot have knowledge stolen.",
            opposition: "Entrepreneur",
            token: "H"
        },
        { 
            key: 'Colonialist', 
            name: 'Colonialist', 
            description: 'For The Glory Of The Empire! but to the detriment of everyone else...',
            resources: { money: 14, influence: 8, knowledge: 0 }, 
            special: "Immune to influence theft.",
            opposition: "Revolutionary",
            token: "C"
        },
        { 
            key: 'Entrepreneur', 
            name: 'Entrepreneur', 
            description: 'Making Bank Before It Was Even Legal, Literally',
            resources: { money: 14, knowledge: 8, influence: 0 }, 
            special: "Never has to miss a turn.",
            opposition: "Historian",
            token: "E"
        },
        { 
            key: 'Politician', 
            name: 'Politician', 
            description: 'A Politician With A Plan...Unless You Are Irish',
            resources: { influence: 14, money: 8, knowledge: 0 }, 
            special: "Money cannot be stolen from.",
            opposition: "Artist",
            token: "P"
        },
        { 
            key: 'Artist', 
            name: 'Artist', 
            description: 'A Brilliant Nutjob And Entertaining Loose Cannon',
            resources: { influence: 14, knowledge: 8, money: 0 }, 
            special: "Cannot be forced to change paths.",
            opposition: "Politician",
            token: "A"
        }
    ];
    
    // Create and add role cards to the grid
    roles.forEach(role => {
        const card = document.createElement('div');
        card.className = 'role-card';
        card.setAttribute('data-role', role.key);
        
        // Create card content
        const cardContent = `
            <div class="role-header">
                <h2>${role.name}</h2>
                <p class="role-description">${role.description}</p>
            </div>
            <div class="role-content">
                <div class="role-text">
                    <div class="resources">
                        ${Object.entries(role.resources)
                            .filter(([, amount]) => amount > 0)
                            .map(([resource, amount]) => 
                                `<div class="resource">${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${amount}</div>`
                            ).join('')}
                    </div>
                    <div class="special-ability">
                        <p>${role.special}</p>
                    </div>
                    <div class="opposition">
                        <p>Opposition: ${role.opposition}</p>
                    </div>
                </div>
                <div class="role-token">
                    <img src="assets/tokens/${role.token}.png" alt="${role.name}" />
                </div>
            </div>
            <div class="role-footer">
                <button class="role-select" data-role="${role.key}">Select</button>
            </div>
        `;
        
        card.innerHTML = cardContent;
        roleGrid.appendChild(card);
    });
    
    // Add click handlers to role cards
    document.querySelectorAll('.role-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking the select button
            if (e.target.classList.contains('role-select')) return;
            
            const role = card.dataset.role;
            selectRole(role);
        });
    });
    
    // Add click handlers to select buttons
    document.querySelectorAll('.role-select').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click event
            const role = button.dataset.role;
            selectRole(role);
        });
    });
    
    // Add click handler to confirm button
    if (roleConfirmButton) {
        roleConfirmButton.addEventListener('click', () => {
            confirmRoleSelection();
        });
    }
}

function selectRole(role) {
    // Deselect all cards first
    document.querySelectorAll('.role-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Deselect all buttons
    document.querySelectorAll('.role-select').forEach(button => {
        button.classList.remove('selected');
    });
    
    // Select the clicked role
    const selectedCard = document.querySelector(`.role-card[data-role="${role}"]`);
    const selectedButton = document.querySelector(`.role-select[data-role="${role}"]`);
    
    if (selectedCard && selectedButton) {
        selectedCard.classList.add('selected');
        selectedButton.classList.add('selected');
        selectedButton.textContent = 'Selected';
    }
}

function confirmRoleSelection() {
    console.log("Confirming role selection...");
    
    // Get selected roles
    const selectedRoles = [];
    const roleElements = document.querySelectorAll('.role-selection-item.selected');
    
    roleElements.forEach(element => {
        const role = element.getAttribute('data-role');
        if (role) {
            selectedRoles.push(role);
        }
    });
    
    if (selectedRoles.length === 0) {
        console.error("No roles selected");
        return;
    }
    
    // Start game with selected roles
    startGameWithSelectedRoles();
}

// --- Start Game with Selected Roles ---
function startGameWithSelectedRoles() {
    console.log("Starting game with selected roles...");
    
    // Get selected roles
    const selectedRoles = [];
    const roleElements = document.querySelectorAll('.role-selection-item.selected');
    
    roleElements.forEach(element => {
        const role = element.getAttribute('data-role');
        if (role) {
            selectedRoles.push(role);
        }
    });
    
    if (selectedRoles.length === 0) {
        console.error("No roles selected");
        return;
    }
    
    // Initialize game with selected roles
    initializeGame(selectedRoles);
    
    // Show game board
    showScreen('game-board-screen');
    
    // Update UI
    updatePlayerInfo();
    updateGameControls();
    
    console.log("Game started with roles:", selectedRoles);
}

// --- Canvas Click Handling (Update element access) ---
function handleCanvasClick(event) {
    const canvas = elements.gameBoard.boardCanvas;
    if (!canvas) return;
    
    try {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (event.clientX - rect.left) * scaleX;
        const clickY = (event.clientY - rect.top) * scaleY;
        
        const gameState = getGameState();
        if (!gameState) {
            console.error("Game state not available");
            return;
        }
        
        const playerId = gameState.currentPlayerId;
        if (!playerId) {
            console.error("No current player ID found");
            return;
        }
        
        const player = getPlayerById(playerId);
        if (!player) {
            console.error(`Player ${playerId} not found`);
            return;
        }
        
        // If no player or not their turn, ignore clicks
        if (playerId !== gameState.currentPlayerId) {
            console.log("Click ignored: Not current player's turn.");
            return;
        }

        // First, check if waiting for End of Turn card draw
        if (player.isHuman && gameState.turnState === 'AWAITING_END_OF_TURN_CARD') {
            // Convert clicked coordinates back to original board coordinates
            const [unscaledClickX, unscaledClickY] = unscaleCoordinates(clickX, clickY);
            
            // Check if click is within any End of Turn card box
            // End of turn card rectangle 1 coordinates (from gameoutline2.txt)
            const endOfTurnBox1 = {
                x: 299, y: 441,
                width: 392 - 299,
                height: 585 - 441
            };
            
            // End of turn card rectangle 2 coordinates (from gameoutline2.txt)
            const endOfTurnBox2 = {
                x: 1124, y: 454,
                width: 1217 - 1124,
                height: 600 - 454
            };
            
            // Check if click is in box 1
            if (unscaledClickX >= endOfTurnBox1.x && 
                unscaledClickX <= endOfTurnBox1.x + endOfTurnBox1.width &&
                unscaledClickY >= endOfTurnBox1.y && 
                unscaledClickY <= endOfTurnBox1.y + endOfTurnBox1.height) {
                
                console.log("End of Turn card box 1 clicked");
                handlePlayerAction(playerId, 'DRAW_END_OF_TURN_CARD', { cardBoxNumber: 1 });
                return;
            }
            
            // Check if click is in box 2
            if (unscaledClickX >= endOfTurnBox2.x && 
                unscaledClickX <= endOfTurnBox2.x + endOfTurnBox2.width &&
                unscaledClickY >= endOfTurnBox2.y && 
                unscaledClickY <= endOfTurnBox2.y + endOfTurnBox2.height) {
                
                console.log("End of Turn card box 2 clicked");
                handlePlayerAction(playerId, 'DRAW_END_OF_TURN_CARD', { cardBoxNumber: 2 });
                return;
            }
            
            console.log("Click not on an End of Turn card box. Coordinates:", unscaledClickX, unscaledClickY);
            return;
        }
        
        // Check if waiting for a board choice by a human player
        if (player.isHuman && 
            (gameState.turnState === 'AWAITING_START_CHOICE' || gameState.turnState === 'AWAITING_JUNCTION_CHOICE')) {
            
            console.log("Checking click against choices:", gameState.currentChoices);
            const [unscaledClickX, unscaledClickY] = unscaleCoordinates(clickX, clickY);
            const tolerance = 15; // Tolerance in original coordinates
            
            const clickedChoice = gameState.currentChoices.find(choice => {
                if (!choice.coordinates) return false;
                const choiceX = choice.coordinates[0];
                const choiceY = choice.coordinates[1];
                const distance = Math.sqrt(Math.pow(unscaledClickX - choiceX, 2) + Math.pow(unscaledClickY - choiceY, 2));
                return distance <= tolerance;
            });

            if (clickedChoice) {
                console.log("Valid choice clicked:", clickedChoice);
                // Call game logic with player ID and the choice object
                resolvePlayerChoice(playerId, clickedChoice); 
            } else {
                 console.log("Click did not hit a valid choice.");
            }
        } else {
            console.log("Click ignored: Not waiting for choice or not human turn.");
        }
    } catch (error) {
        console.error("Error handling canvas click:", error);
    }
}

// --- Screen Management (Fixed) ---
let currentScreen = 'start-screen';

export function showScreen(screenId) {
    console.log(`Transitioning to screen: ${screenId} from ${currentScreen}`);
    
    // First hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
        screen.classList.remove('active');
    });
    
    // Show the target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        // Remove any inline styles that might interfere
        targetScreen.removeAttribute('style');
        targetScreen.style.display = 'flex';
        targetScreen.classList.add('active');
        
        // Special handling for game board screen
        if (screenId === 'game-board-screen') {
            // Ensure game controls are visible
            const controls = document.querySelectorAll('.game-control');
            controls.forEach(control => {
                control.style.display = 'block';
                control.style.visibility = 'visible';
            });
            
            // Redraw the board if context exists
            if (elements.gameBoard.ctx) {
                drawBoard();
                drawPlayers();
            }
        }
        
        // Update current screen tracking
        currentScreen = screenId;
        
        // Verify screen is visible after a short delay
        setTimeout(() => {
            if (targetScreen.style.display !== 'flex' || !targetScreen.classList.contains('active')) {
                console.warn(`Screen ${screenId} visibility check failed, forcing display`);
                targetScreen.style.display = 'flex';
                targetScreen.classList.add('active');
            }
        }, 100);
        
        console.log(`Screen ${screenId} is now visible`);
    } else {
        console.error(`Screen not found: ${screenId}`);
    }
}

export function hideScreen(screenId) {
    const screen = document.getElementById(screenId);
    if (!screen) {
        console.error(`Screen with ID "${screenId}" not found`);
        return;
    }
    
    screen.style.display = 'none';
    screen.classList.remove('active');
    console.log(`Hidden screen: ${screenId}`);
}

/**
 * Shows the end game screen with final results
 * @param {Object} winner - The player who won the game
 * @param {Array} allPlayers - All players in the game for displaying final standings
 */
export function showEndGameScreen(winner, allPlayers = []) {
    // First switch to the end game screen
    showScreen('end-game-screen');
    
    const container = elements.endGame.endGameContainer;
    if (!container) {
        console.error("End game container not found");
        return;
    }
    
    // Create content for end game screen
    let endGameHTML = '<h2>Game Over</h2>';
    
    // Show winner
    if (winner) {
        const roleInfo = PLAYER_ROLES[winner.role];
        const playerColor = getPlayerColor(winner.role);
        
        endGameHTML += `
            <div class="winner-section">
                <h3>🏆 Winner 🏆</h3>
                <div class="player-card winner" style="border-left-color: ${playerColor}">
                    <div class="player-name">${winner.name}</div>
                    <div class="player-role">${roleInfo.name}</div>
                    <div class="player-resources">
                        <span class="resource money">💰 ${winner.resources.money ?? 0}</span> 
                        <span class="resource knowledge">🧠 ${winner.resources.knowledge ?? 0}</span>
                        <span class="resource influence">🗣️ ${winner.resources.influence ?? 0}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Show all players' final standings
    if (allPlayers.length > 0) {
        endGameHTML += '<h3>Final Standings</h3><div class="player-standings">';
        
        // Sort players - winner first, then by how far they made it
        const sortedPlayers = [...allPlayers].sort((a, b) => {
            // Winner always comes first
            if (a.id === winner?.id) return -1;
            if (b.id === winner?.id) return 1;
            
            // Then sort by finished status
            if (a.finished && !b.finished) return -1;
            if (!a.finished && b.finished) return 1;
            
            // Then by position on board if available
            if (a.boardPosition !== undefined && b.boardPosition !== undefined) {
                return b.boardPosition - a.boardPosition;
            }
            
            return 0;
        });
        
        sortedPlayers.forEach((player, index) => {
            if (player.id === winner?.id) return; // Skip winner as they're already shown
            
            const roleInfo = PLAYER_ROLES[player.role];
            const playerColor = getPlayerColor(player.role);
            
            endGameHTML += `
                <div class="player-card" style="border-left-color: ${playerColor}">
                    <div class="player-name">${index + 1}. ${player.name} ${player.finished ? '(Finished)' : ''}</div>
                    <div class="player-role">${roleInfo.name}</div>
                    <div class="player-resources">
                        <span class="resource money">💰 ${player.resources.money ?? 0}</span> 
                        <span class="resource knowledge">🧠 ${player.resources.knowledge ?? 0}</span>
                        <span class="resource influence">🗣️ ${player.resources.influence ?? 0}</span>
                    </div>
                </div>
            `;
        });
        
        endGameHTML += '</div>';
    }
    
    // Add button to start new game
    endGameHTML += `
        <div class="end-game-actions">
            <button id="new-game-btn" class="action-button">Start New Game</button>
        </div>
    `;
    
    // Set the HTML content
    container.innerHTML = endGameHTML;
    
    // Add event listener for new game button
    const newGameBtn = document.getElementById('new-game-btn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            // Reset game state and go back to start screen
            showScreen('start-screen');
        });
    }
}

// --- Drawing Functions (Update element access) ---
export function drawPlayerToken(player, coords, isAnimating = false) {
    if (!player || !coords || !elements.gameBoard.ctx) return;
    
    const ctx = elements.gameBoard.ctx;
    const tokenRadius = isAnimating ? 18 : 15; // Slightly larger during animation
    const [x, y] = coords;
    
    // Set color based on player role
    let tokenColor;
    switch (player.role) {
        case 'Colonialist':
            tokenColor = '#d4af37'; // Gold
            break;
        case 'Indigenous':
            tokenColor = '#228B22'; // Forest Green
            break;
        case 'Merchant':
            tokenColor = '#4682B4'; // Steel Blue
            break;
        case 'Curator':
            tokenColor = '#800080'; // Purple
            break;
        default:
            tokenColor = '#808080'; // Gray fallback
    }
    
    // Draw a subtle glow effect for current player or during animation
    if (player.id === getGameState().currentPlayerId || isAnimating) {
        ctx.beginPath();
        ctx.arc(x, y, tokenRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = isAnimating ? 
            `rgba(${hexToRgb(tokenColor)}, 0.3)` : 
            'rgba(255, 255, 255, 0.3)';
        ctx.fill();
    }
    
    // Draw the token circle
    ctx.beginPath();
    ctx.arc(x, y, tokenRadius, 0, Math.PI * 2);
    ctx.fillStyle = tokenColor;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add player role indicator (first letter)
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.role.charAt(0), x, y);
    
    // Optional: Add player index indicator
    if (player.index !== undefined) {
        ctx.font = 'bold 10px Arial';
        ctx.fillText(player.index + 1, x, y + tokenRadius + 10);
    }
}

export function drawPlayers() {
    if (!elements.gameBoard.ctx) return;
    
    const players = window.game?.getPlayers();
    if (!players || !Array.isArray(players)) return;
    
    players.forEach(player => {
        if (player.coords && Array.isArray(player.coords) && player.coords.length === 2) {
            drawPlayerToken(player, player.coords);
        }
    });
}

export function updatePlayerInfo() {
    const panel = elements.gameBoard.playerInfoPanel;
    if (!panel) return;

    const players = getPlayers();
    const gameState = getGameState();
    const currentPlayerId = gameState.currentPlayerId;

    let infoHTML = '<div class="player-info-grid">';
    players.forEach(player => {
        const isCurrent = player.id === currentPlayerId;
        const playerColor = getPlayerColor(player.role);
        const roleInfo = PLAYER_ROLES[player.role];
        
        infoHTML += `
            <div class="player-card ${isCurrent ? 'current-player' : ''} animate-fadeIn" style="border-left-color: ${playerColor}">
                <div class="player-name">${player.name} ${isCurrent ? '(Turn)' : ''} ${player.finished ? '(Fin)' : ''}</div>
                <div class="player-role">${roleInfo.name}</div>
                <div class="player-resources">
                    <span class="resource money">💰 ${player.resources.money ?? 0}</span> 
                    <span class="resource knowledge">🧠 ${player.resources.knowledge ?? 0}</span>
                    <span class="resource influence">🗣️ ${player.resources.influence ?? 0}</span>
                </div>
                <div class="player-status">
                     ${player.skipTurns > 0 ? `<span class="status-bad">Skip Turn (${player.skipTurns})</span>` : ''}
                     ${player.temporaryImmunityTurns > 0 ? `<span class="status-good">Immunity (${player.temporaryImmunityTurns})</span>` : ''}
                     ${player.tradeBlockedTurns > 0 ? `<span class="status-bad">Trade Block (${player.tradeBlockedTurns})</span>` : ''}
                     <span class="${player.abilityUsed ? 'status-bad' : 'status-good'}">Ability: ${player.abilityUsed ? 'Used' : 'Available'}</span>
                </div>
            </div>
        `;
    });
    infoHTML += '</div>';
    panel.innerHTML = infoHTML;
    
    // Remove animation classes after animation completes
    setTimeout(() => {
        const cards = panel.querySelectorAll('.animate-fadeIn');
        cards.forEach(card => card.classList.remove('animate-fadeIn'));
    }, 500);
}

// --- Card Display (Update element access) ---
export function showCard(cardType, cardData, playerId, deckType = null) {
    if (!document.getElementById('card-container')) {
        console.error("Card container element not found!");
        return;
    }
    
    const cardElement = document.getElementById('card-container');
    const player = getPlayerById(playerId);
    
    if (!player) {
        console.error(`Cannot show card: Player ${playerId} not found`);
        return;
    }

    // Add deckType to cardData if provided
    if (deckType) {
        cardData.deckType = deckType;
    }

    // Prepare front side content
    const frontContent = `
        <div class="card-front">
            <div class="card-title">${cardData.title || 'Card'}</div>
            <div class="card-type">${cardType}</div>
        </div>
    `;
    
    // Prepare back side content with effects
    const backContent = `
        <div class="card-back">
            <div class="card-title">${cardData.title || 'Card'}</div>
            <div class="card-type">${cardType}</div>
            <div class="card-description">${cardData.description || ''}</div>
            <div class="card-effects">
                ${getEffectsHTML(cardData.effects, player)}
            </div>
        </div>
    `;
    
    // Show the card and apply the flip animation
    showScreen('card-view');
    
    // Log the card view event
    logUIEvent('CARD_VIEW', playerId, {
        cardType,
        cardTitle: cardData.title
    });
    
    // Set initial content to front of card
    cardElement.innerHTML = frontContent;
    
    // After a short delay, flip the card to show effects
    setTimeout(() => {
        flipCardWithAnimation(cardElement, frontContent, backContent)
            .then(() => {
                // Add a listener to close the card view when clicked
                cardElement.addEventListener('click', closeCardView, { once: true });
            });
    }, 1000);
}

export function hideCard() {
    const cardPopup = document.getElementById('card-popup');
    if (!cardPopup) return;
    
    // Animate out
    cardPopup.classList.remove('visible');
    
    // After animation completes, hide the element
    setTimeout(() => {
        cardPopup.style.display = 'none';
        
        // Reset any additional elements
        const detailsElement = document.getElementById('card-additional-details');
        if (detailsElement) {
            detailsElement.style.display = 'none';
        }
        
        // Log the card closed event
        logUIEvent('CARD_POPUP_CLOSED');
    }, 300); // Match this with the CSS transition duration
}

/**
 * Close the card view when a card is clicked
 * @param {Event} event - The click event
 */
export function closeCardView() {
    hideCard();
    hideScreen('card-view');
    logUIEvent('CARD_VIEW_CLOSED');
}

// --- Game Controls Update (Update element access) ---
export function updateGameControls() {
    const gameState = getGameState();
    const currentState = gameState.turnState;
    const currentPlayer = gameState.currentPlayerId ? getPlayerById(gameState.currentPlayerId) : null;
    const isHumanTurn = currentPlayer?.isHuman === true;
    
    const { rollDiceBtn, endTurnBtn, useAbilityBtn } = elements.gameBoard;
    
    if (rollDiceBtn) rollDiceBtn.disabled = !isHumanTurn || currentState !== 'AWAITING_ROLL';
    if (endTurnBtn) {
        // Only enable end turn button if action is complete and player has drawn an end of turn card
        const canEndTurn = isHumanTurn && currentState === 'ACTION_COMPLETE' && 
                          (currentPlayer?.hasDrawnEndOfTurnCard === true || currentPlayer?.finished === true);
        endTurnBtn.disabled = !canEndTurn;
    }
    if (useAbilityBtn) useAbilityBtn.disabled = !isHumanTurn || 
                                          (currentState !== 'AWAITING_ROLL' && currentState !== 'ACTION_COMPLETE') ||
                                          (currentPlayer?.abilityUsed === true);
    
    // Update button text if waiting for end of turn card
    if (currentState === 'AWAITING_END_OF_TURN_CARD' && isHumanTurn) {
        if (endTurnBtn) {
            endTurnBtn.innerHTML = "Draw Card";
            endTurnBtn.disabled = true;
        }
        logMessage("Click on one of the End of Turn card boxes to draw a card.");
        
        // Log action for player needing to draw a card
        if (currentPlayer) {
            logUIEvent('PLAYER_ACTION', currentPlayer.id, {
                action: 'AWAITING_CARD_DRAW',
                actionType: 'END_OF_TURN',
                turnState: currentState
            });
        }
    } else {
        if (endTurnBtn) {
            endTurnBtn.innerHTML = "End Turn";
        }
    }
    
    // Show turn transition when a new player's turn begins
    if (gameState.showTurnTransition && currentPlayer) {
        // Find the previous player
        const previousPlayerIndex = (gameState.currentPlayerIndex - 1 + gameState.players.length) % gameState.players.length;
        const previousPlayer = gameState.players[previousPlayerIndex];
        
        if (previousPlayer && previousPlayer.id !== currentPlayer.id) {
            // Reset the flag
            gameState.showTurnTransition = false;
            
            // Show the transition
            animateTurnTransition(previousPlayer, currentPlayer);
            
            // Log turn change
            logUIEvent('TURN_CHANGE', currentPlayer.id, {
                previousPlayerId: previousPlayer.id,
                turnNumber: gameState.turnCount
            });
        }
    }
}

/**
 * Function to animate a transition between player turns
 * @param {Object} fromPlayer - Player whose turn is ending
 * @param {Object} toPlayer - Player whose turn is beginning
 */
export function animateTurnTransition(fromPlayer, toPlayer) {
    if (!fromPlayer || !toPlayer) return Promise.resolve();
    
    // Log the turn transition
    logGameEvent('TURN_TRANSITION', {
        fromPlayerId: fromPlayer.id,
        fromPlayerName: fromPlayer.name,
        toPlayerId: toPlayer.id,
        toPlayerName: toPlayer.name
    });
    
    // Use the imported showTurnTransition function
    if (typeof showTurnTransition === 'function') {
        return showTurnTransition(
            fromPlayer.name || 'Player', 
            toPlayer.name || 'Player',
            1500
        );
    } else {
        // Fallback if the imported function isn't available
        return new Promise(resolve => {
            const message = `${fromPlayer.name}'s turn has ended. ${toPlayer.name}'s turn begins.`;
            logMessage(message, 'turn');
            
            setTimeout(resolve, 1000);
        });
    }
}

// --- Card Display (New) ---
export function showCardPopup(card, callback) {
    const cardPopup = document.getElementById('card-popup');
    const cardTitle = document.getElementById('card-title');
    const cardDescription = document.getElementById('card-description');
    const cardEffects = document.getElementById('card-effects');
    const closeCardBtn = document.getElementById('close-card-btn');
    const showDetailsBtn = document.getElementById('show-card-details-btn');
    
    if (!cardPopup || !cardTitle || !cardDescription || !cardEffects || !closeCardBtn) {
        console.error('Card popup elements not found');
        if (callback) callback();
        return;
    }
    
    // Get the current player
    const player = getPlayerById(window.gameState?.currentPlayerId);
    if (!player) {
        console.warn('Current player not found, continuing with card popup anyway');
    }
    
    // Set card content
    cardTitle.textContent = card.title || 'Card';
    cardDescription.textContent = card.description || '';
    
    // Check if the card has a deck type for animation
    if (card.deckType) {
        // Calculate source position (from deck)
        const deckElement = document.querySelector(`.deck-${card.deckType}`);
        let sourcePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        
        if (deckElement) {
            const rect = deckElement.getBoundingClientRect();
            sourcePos = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }
        
        // Calculate target position (card popup center)
        const targetPos = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };
        
        // Animate the card draw before showing the popup
        animateCardDrawFromDeck(card.deckType, sourcePos, targetPos, () => {
            // After animation completes, show the actual popup
            showPopupAfterAnimation();
        });
    } else {
        // No animation needed, show popup immediately
        showPopupAfterAnimation();
    }
    
    function showPopupAfterAnimation() {
        // Populate effects
        cardEffects.innerHTML = '';
        if (card.effects && Array.isArray(card.effects)) {
            card.effects.forEach(effect => {
                const effectElement = document.createElement('div');
                effectElement.className = 'card-effect';
                effectElement.textContent = formatEffect(effect, player);
                cardEffects.appendChild(effectElement);
            });
        }
        
        // Show the popup with animation
        cardPopup.style.display = 'block';
        setTimeout(() => {
            cardPopup.classList.add('visible');
        }, 50);
        
        // Set up close handler
        closeCardBtn.onclick = () => {
            hideCard();
            // Ensure callback is executed after card is hidden
            if (callback) {
                console.log("Executing card popup callback");
                setTimeout(() => callback(), 100);
            }
        };
        
        // Show additional details if available
        if (showDetailsBtn && card.details) {
            showDetailsBtn.style.display = 'block';
            showDetailsBtn.onclick = () => {
                const detailsElement = document.getElementById('card-additional-details');
                if (detailsElement) {
                    detailsElement.textContent = card.details;
                    detailsElement.style.display = 'block';
                    showDetailsBtn.style.display = 'none';
                }
            };
        } else if (showDetailsBtn) {
            showDetailsBtn.style.display = 'none';
        }
        
        // Log the card view
        try {
            logUIEvent('CARD_POPUP_SHOWN', player?.id, {
                cardTitle: card.title,
                cardType: card.type || card.deckType
            });
        } catch (e) {
            console.warn("Failed to log UI event:", e);
        }
    }
}

/**
 * Formats a card effect into a readable string
 * @param {Object} effect - The effect object to format
 * @returns {string} Formatted effect text
 */
export function formatEffect(effect) {
    if (!effect) return '';
    
    if (typeof effect === 'string') {
        return effect;
    } else {
        if (effect.type) {
            switch (effect.type) {
                case 'RESOURCE_CHANGE': {
                    if (!effect.changes) return 'Resource change (no details)';
                    
                    const changes = [];
                    const { money = 0, knowledge = 0, influence = 0 } = effect.changes;
                    
                    if (money !== 0) {
                        changes.push(`Money ${money > 0 ? '+' : ''}${money}`);
                    }
                    
                    if (knowledge !== 0) {
                        changes.push(`Knowledge ${knowledge > 0 ? '+' : ''}${knowledge}`);
                    }
                    
                    if (influence !== 0) {
                        changes.push(`Influence ${influence > 0 ? '+' : ''}${influence}`);
                    }
                    
                    return `Resource Change: ${changes.join(', ')}`;
                }
                
                case 'MOVEMENT':
                    if (effect.spaces) {
                        return `Movement: ${effect.spaces > 0 ? 'Forward' : 'Backward'} ${Math.abs(effect.spaces)} spaces`;
                    } else if (effect.moveToAge) {
                        return `Movement: Move to ${effect.moveToAge}`;
                    }
                    return 'Movement (no details)';

                case 'STEAL':
                    return `Steal: ${effect.amount} ${effect.resource} from another player`;

                case 'SABOTAGE':
                    return `Sabotage: ${effect.description || 'Reduce another player\'s resources'}`;

                case 'SKIP_TURN':
                    return 'Skip Next Turn';

                case 'ALLIANCE_OFFER':
                    return 'Offer Alliance with another player';

                case 'TRADE_OFFER':
                    return 'Offer Trade with another player';

                case 'IMMUNITY': {
                    const turns = effect.turns || 1;
                    return `Immunity: Protected for ${turns} turn${turns > 1 ? 's' : ''}`;
                }

                case 'TRADE_BLOCKED': {
                    const tradeTurns = effect.turns || 1;
                    return `Trade Blocked: Cannot trade for ${tradeTurns} turn${tradeTurns > 1 ? 's' : ''}`;
                }

                default:
                    return effect.description || `Effect: ${effect.type}`;
            }
        } else {
            return effect.description || 'Unknown effect';
        }
    }
}

// --- Trade Prompt (Update element access) ---
export function promptForTradeResponse(sourcePlayer, targetPlayer, offerDetails, requestDetails, isSwap, callback) {
    if (!elements.popups.trade) {
        console.error('Trade popup element not found');
        return;
    }
    
    // Store the callback for later use
    tradeResponseCallback = callback;
    
    const popup = elements.popups.trade;
    
    // Format offer details for display
    let offerText = '';
    if (offerDetails && offerDetails.resource) {
        offerText = `${offerDetails.amount} ${offerDetails.resource}`;
    }
    
    // Format request details for display
    let requestText = '';
    if (!isSwap && requestDetails && requestDetails.resource) {
        requestText = `${requestDetails.amount} ${requestDetails.resource}`;
    } else if (isSwap && offerDetails && offerDetails.resource) {
        // For swaps, the request is for the same resource
        requestText = `${offerDetails.amount} ${offerDetails.resource}`;
    }
    
    // Create trade prompt text based on trade type
    let tradePromptText = '';
    if (isSwap) {
        tradePromptText = `${sourcePlayer.name} wants to swap ${offerText} with you. You'll give ${offerText} and receive the same amount.`;
    } else {
        tradePromptText = `${sourcePlayer.name} offers you ${offerText} in exchange for your ${requestText}`;
    }
    
    // Update trade prompt UI
    if (elements.popups.tradePromptText) {
        elements.popups.tradePromptText.textContent = tradePromptText;
    }
    
    // Display player resources for reference
    if (elements.popups.tradePlayerResources) {
        elements.popups.tradePlayerResources.textContent = 
            `Your resources: Money: ${targetPlayer.resources.money || 0}, Knowledge: ${targetPlayer.resources.knowledge || 0}, Influence: ${targetPlayer.resources.influence || 0}`;
    }
    
    // Show with animation
    popup.style.display = 'flex';
    // Delay adding visible class to trigger transition
    setTimeout(() => popup.classList.add('visible'), 10);
}

/**
 * Displays a modal for selecting a target player.
 * @param {object} sourcePlayer - The player who is selecting a target.
 * @param {Array<object>} possibleTargets - Array of players that can be targeted.
 * @param {string} description - Description of what the ability will do to the target.
 * @param {function} callback - Function to call with the selected target, or null if canceled.
 */
export function promptTargetSelection(sourcePlayer, possibleTargets, description, callback) {
    if (!elements.popups.targetSelection) {
        console.error('Target selection modal not found');
        return;
    }
    
    // Store the callback for later use
    targetSelectionCallback = callback;
    
    const modal = elements.popups.targetSelection;
    const playerList = elements.popups.targetPlayerList;
    const descriptionElement = elements.popups.targetDescription;
    
    // Update description
    if (descriptionElement) {
        descriptionElement.textContent = description;
    }
    
    // Clear any existing player options
    if (playerList) {
        playerList.innerHTML = '';
        
        // Add a button for each possible target
        possibleTargets.forEach(targetPlayer => {
            const playerButton = document.createElement('button');
            playerButton.classList.add('player-option');
            
            // Display player info
            const roleInfo = PLAYER_ROLES[targetPlayer.role];
            playerButton.innerHTML = `
                <strong>${targetPlayer.name}</strong> (${roleInfo?.name || targetPlayer.role})
                <div class="player-resources-mini">
                    💰 ${targetPlayer.resources.money || 0} | 
                    🧠 ${targetPlayer.resources.knowledge || 0} | 
                    🗣️ ${targetPlayer.resources.influence || 0}
                </div>
            `;
            
            // Add click handler
            playerButton.addEventListener('click', () => {
                // Highlight selected player
                const allButtons = playerList.querySelectorAll('.player-option');
                allButtons.forEach(btn => btn.classList.remove('selected'));
                playerButton.classList.add('selected');
                
                // Call the callback with the selected target
                if (targetSelectionCallback) {
                    targetSelectionCallback(targetPlayer);
                }
                
                // Hide the modal
                modal.style.display = 'none';
                targetSelectionCallback = null;
            });
            
            playerList.appendChild(playerButton);
        });
    }
    
    // Show the modal
    modal.style.display = 'flex';
}

// --- Message Log (Update element access) ---
export function clearMessages() {
    const log = elements.gameBoard.messageLog;
    if (log) log.innerHTML = '';
}

export function logMessage(message, type = 'info') {
    console.log(`[${type}] ${message}`);
    
    if (!elements.gameBoard.messageLog) {
        console.error("Message log element not found");
        return;
    }
    
    // Create log entry
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = message;
    
    // Add timestamp
    const timestamp = new Date().toLocaleTimeString();
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-timestamp';
    timeSpan.textContent = `[${timestamp}] `;
    logEntry.insertBefore(timeSpan, logEntry.firstChild);
    
    // Add to log
    elements.gameBoard.messageLog.appendChild(logEntry);
    
    // Scroll to bottom
    elements.gameBoard.messageLog.scrollTop = elements.gameBoard.messageLog.scrollHeight;
    
    // Log to game state
    logUIEvent('GAME_LOG_UPDATE', null, { message, type });
}

export function updateGameLog(message, type = 'info') {
    logMessage(message, type);
}

// --- Player movement animation ---
export async function animatePlayerMovement(player, fromCoords, toCoords) {
    if (!player || !fromCoords || !toCoords || !elements.gameBoard.ctx) {
        return Promise.resolve();
    }
    
    // If we have animateTokenToPosition from animations.js, use it
    if (typeof animateTokenToPosition === 'function') {
        return new Promise(resolve => {
            // Convert from board coordinates to screen coordinates using our helper function
            const screenFromCoords = getScreenCoordinates(fromCoords);
            const screenToCoords = getScreenCoordinates(toCoords);
            
            // Log the coordinates for debugging
            console.log(`Moving player from screen coordinates: (${screenFromCoords.x}, ${screenFromCoords.y}) to (${screenToCoords.x}, ${screenToCoords.y})`);
            
            // Update the player's position immediately in the game state
            // so other functions know where the player is
            player.coords = { x: toCoords[0], y: toCoords[1] };
            
            // Animate the token movement
            animateTokenToPosition(player, screenToCoords, () => {
                // Draw board and all players at their final positions
                drawBoard();
                drawPlayers();
                
                // Add a bounce effect at the end of movement
                const tokenElement = document.getElementById(`player-${player.id}-token`);
                if (tokenElement) {
                    tokenElement.classList.add('animate-bounce');
                    setTimeout(() => {
                        tokenElement.classList.remove('animate-bounce');
                    }, 500);
                }
                
                // Log the movement
                logUIEvent('PLAYER_MOVEMENT', player.id, {
                    fromCoords,
                    toCoords,
                    spaces: 1 // This could be calculated based on the path
                });
                
                resolve();
            });
        });
    } else {
        // Fallback to original animation if animateTokenToPosition isn't available
        const duration = 800; // Animation duration in ms
        const startTime = Date.now();
        const [startX, startY] = fromCoords;
        const [endX, endY] = toCoords;
        
        return new Promise(resolve => {
            function animate() {
                const now = Date.now();
                const elapsed = now - startTime;
                
                if (elapsed >= duration) {
                    // Animation complete
                    drawBoard();
                    drawPlayers(); 
                    
                    // Add a bounce effect at the end of movement
                    const tokenElement = document.getElementById(`player-${player.id}-token`);
                    if (tokenElement) {
                        tokenElement.classList.add('animate-bounce');
                        setTimeout(() => {
                            tokenElement.classList.remove('animate-bounce');
                        }, 500);
                    }
                    
                    resolve();
                    return;
                }
                
                // Calculate current position using easing
                const progress = elapsed / duration;
                const easedProgress = easeOutCubic(progress);
                
                const currentX = startX + (endX - startX) * easedProgress;
                const currentY = startY + (endY - startY) * easedProgress;
                
                // Redraw board and all players
                drawBoard();
                
                // Draw all players except the moving one
                getPlayers().forEach(p => {
                    if (p.id !== player.id) {
                        drawPlayerToken(p, [p.coords.x, p.coords.y]);
                    }
                });
                
                // Draw the moving player with animation flag
                drawPlayerToken(player, [currentX, currentY], true);
                
                requestAnimationFrame(animate);
            }
            
            animate();
        });
    }
}

// Easing function for smoother animation
function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}

// --- Resource change animation ---
export function displayResourceChangeEffect(playerId, resourceType, amount) {
    if (!playerId || !resourceType) return;
    
    const panel = elements.gameBoard.playerInfoPanel;
    if (!panel) return;
    
    // Find the player's card
    const playerCard = panel.querySelector(`.player-card[data-player-id="${playerId}"]`);
    if (!playerCard) return;
    
    // Find the specific resource element
    const resourceElement = playerCard.querySelector(`.resource.${resourceType.toLowerCase()}`);
    if (!resourceElement) return;
    
    // Get the current resource value
    const currentValue = parseInt(resourceElement.textContent) || 0;
    const newValue = currentValue + amount;
    
    // If we have the animation function from animations.js, use it
    if (typeof animateResourceChange === 'function') {
        // Animate the resource change
        animateResourceChange(resourceElement, currentValue, newValue, 800);
        
        // Create and show floating indicator
        const indicator = document.createElement('div');
        indicator.textContent = amount > 0 ? `+${amount}` : amount;
        indicator.className = 'floating-number';
        indicator.style.color = amount > 0 ? 'var(--success-color)' : 'var(--error-color)';
        
        // Position near the resource element
        const rect = resourceElement.getBoundingClientRect();
        indicator.style.left = `${rect.left + rect.width / 2}px`;
        indicator.style.top = `${rect.top}px`;
        
        document.body.appendChild(indicator);
        indicator.classList.add('animate-floating');
        
        // Remove after animation
        setTimeout(() => {
            document.body.removeChild(indicator);
        }, 1500);
        
        // Log the resource change event
        logUIEvent('RESOURCE_CHANGE', playerId, {
            resourceType: resourceType,
            amount: amount,
            oldValue: currentValue,
            newValue: newValue,
            reason: 'UI update'
        });
    } else {
        // Fallback animation
        resourceElement.classList.add('animate-pulse');
        
        // Update the display value
        resourceElement.textContent = newValue;
        
        // Create and show floating indicator
        const indicator = document.createElement('div');
        indicator.textContent = amount > 0 ? `+${amount}` : amount;
        indicator.className = 'floating-number';
        indicator.style.color = amount > 0 ? 'var(--success-color)' : 'var(--error-color)';
        
        // Position near the resource element
        const rect = resourceElement.getBoundingClientRect();
        indicator.style.left = `${rect.left + rect.width / 2}px`;
        indicator.style.top = `${rect.top}px`;
        
        document.body.appendChild(indicator);
        
        // Add animation class
        indicator.classList.add('animate-floating');
        
        // Remove after animation
        setTimeout(() => {
            document.body.removeChild(indicator);
            resourceElement.classList.remove('animate-pulse');
        }, 1500);
    }
}

// --- Active player highlighting ---
export function highlightActivePlayer(playerId) {
    if (!playerId) return;
    
    const panel = elements.gameBoard.playerInfoPanel;
    if (!panel) return;
    
    // Remove active class from all player cards
    const playerCards = panel.querySelectorAll('.player-card');
    playerCards.forEach(card => {
        card.classList.remove('active-player');
    });
    
    // Add active class to current player
    const activePlayerCard = panel.querySelector(`.player-card[data-player-id="${playerId}"]`);
    if (activePlayerCard) {
        activePlayerCard.classList.add('active-player', 'animate-pulse');
        
        // Remove pulse animation after it plays once
        setTimeout(() => {
            activePlayerCard.classList.remove('animate-pulse');
        }, 800);
    }
}

