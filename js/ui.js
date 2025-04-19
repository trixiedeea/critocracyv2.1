// UI Module for Critocracy
// Handles all visual elements and user interactions

// Game Logic Imports (Refactored)
import {
    initializeGame, // For starting game from setup UI
    handlePlayerAction, // For Roll, End Turn, Ability buttons
    getGameState, // For checking current state in UI
    resolvePlayerChoice // For handling validated clicks on choices
    // REMOVED imports: addPlayer, setupRoleSelectionPhase, handleHumanMoveClick, handleHumanCardClick, endPlayerTurn, getCurrentPlayer, advanceToTurnOrderPhase, determineTurnOrder, handlePathChoice
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
    resizeCanvas // To resize canvas based on container size
} from './board.js'; 

// Animation Imports
import { 
    animateScreenTransition, 
    animateDiceRoll, 
    animateResourceChange,
    showTurnTransition,
    animateTokenToPosition,
    animateCardFlip,
    animateCardDrawFromDeck
} from './animations.js';

// Import logging functions
import { 
    logGameEvent, 
    logResourceChange, 
    logPlayerAction, 
    logPlayerMovement
} from './logging.js';

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
let currentHighlights = []; 
const PLAYER_TOKEN_RADIUS = 10; 

// ===== Callbacks =====
let tradeResponseCallback = null;
let targetSelectionCallback = null;
let currentScreen = 'start-screen'; // Keep track of currently visible screen

// --- Initialization ---
export function initializeUI() {
    console.log("Initializing UI...");
    
    try {
        // Validate essential UI elements exist
        validateElementsExist();
        
        // Get canvas context
        if (!elements.gameBoard.boardCanvas) {
            throw new Error("UI Init Error: Canvas element not found!");
        }
        elements.gameBoard.ctx = elements.gameBoard.boardCanvas.getContext('2d');
        
        // Setup event listeners
        setupEventListeners();
        
        // Show the start screen
        showScreen('start-screen');
        
        // Set up board UI components if board is ready
        if (window.boardState && window.boardState.isInitialized) {
            console.log("Board is already initialized, setting up board UI components");
            setupBoardUIComponents();
        } else {
            console.log("Board not yet initialized, will set up UI components when ready");
            window.addEventListener('boardInitialized', setupBoardUIComponents);
        }
        
        console.log("UI Initialized.");
        return true;
        
    } catch (error) {
        console.error("Error initializing UI:", error);
        return false;
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
function setupBoardUIComponents() {
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
    console.log("Setting up UI event listeners...");

    // --- Setup Screens ---
    elements.playerConfig.initialStartBtn?.addEventListener('click', () => {
        console.log("Start button clicked - transitioning to player count screen");
        setupPlayerCountUI();
        
        // Force remove any inline display styles that could interfere
        const playerCountScreen = document.getElementById('player-count-screen');
        if (playerCountScreen) {
            playerCountScreen.style.removeProperty('display');
        }
        
        // Show player count screen
        showScreen('player-count-screen');
        
        // Double-check that the screen is visible
        setTimeout(() => {
            const pcScreen = document.getElementById('player-count-screen');
            if (pcScreen) {
                console.log(`Player count screen visibility check: display=${pcScreen.style.display}, classes=${pcScreen.classList}`);
                // Force display if it's still not visible
                if (pcScreen.style.display === 'none') {
                    pcScreen.style.display = 'flex';
                    pcScreen.classList.add('active');
                }
            }
        }, 100);
    });
    
    elements.playerConfig.playerCountConfirm?.addEventListener('click', () => {
        const totalPlayers = parseInt(elements.playerConfig.totalPlayerCount.value);
        const humanPlayers = parseInt(elements.playerConfig.humanPlayerCount.value);
        
        setupRoleSelectionUI(totalPlayers, humanPlayers);
        showScreen('role-selection-screen');
    });
    
    elements.playerConfig.roleConfirm?.addEventListener('click', () => {
        startGameWithSelectedRoles();
    });
    
    // --- Game Board --- 
    elements.gameBoard.boardCanvas?.addEventListener('click', handleCanvasClick);
    elements.gameBoard.rollDiceBtn?.addEventListener('click', () => {
        const playerId = getGameState().currentPlayerId;
        if (playerId) handlePlayerAction(playerId, 'ROLL_DICE');
    });
    elements.gameBoard.endTurnBtn?.addEventListener('click', () => {
        const playerId = getGameState().currentPlayerId;
        if (playerId) handlePlayerAction(playerId, 'END_TURN');
    });
    elements.gameBoard.useAbilityBtn?.addEventListener('click', () => {
         const playerId = getGameState().currentPlayerId;
         if (playerId) handlePlayerAction(playerId, 'USE_ABILITY');
    });

    // --- Popups ---
    elements.popups.closeCardBtn?.addEventListener('click', hideCard);
    elements.popups.showExplanationBtn?.addEventListener('click', () => {
        if (elements.popups.cardRoleExplanation) elements.popups.cardRoleExplanation.style.display = 'block';
        if (elements.popups.showExplanationBtn) elements.popups.showExplanationBtn.style.display = 'none';
    });
    elements.popups.tradeAccept?.addEventListener('click', () => {
        if (tradeResponseCallback) tradeResponseCallback(true);
        if (elements.popups.trade) elements.popups.trade.style.display = 'none';
        tradeResponseCallback = null; 
    });
    elements.popups.tradeReject?.addEventListener('click', () => {
        if (tradeResponseCallback) tradeResponseCallback(false);
        if (elements.popups.trade) elements.popups.trade.style.display = 'none';
        tradeResponseCallback = null; 
    });
    
    // Target Selection Modal
    elements.popups.cancelTargetBtn?.addEventListener('click', () => {
        if (targetSelectionCallback) targetSelectionCallback(null);
        if (elements.popups.targetSelection) elements.popups.targetSelection.style.display = 'none';
        targetSelectionCallback = null;
    });
    
    // --- End Game ---
    elements.endGame.newGameBtn?.addEventListener('click', () => window.location.reload()); 
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
    const selectedCard = document.querySelector('.role-card.selected');
    if (!selectedCard) {
        alert('Please select a role first');
        return;
    }
    
    const role = selectedCard.dataset.role;
    const playerName = document.getElementById('player-name').value;
    
    if (!playerName) {
        alert('Please enter your name first');
        return;
    }
    
    // Add player to game
    window.game.addPlayer(playerName, role);
    
    // Update UI to show selected role is no longer available
    selectedCard.style.opacity = '0.5';
    selectedCard.style.pointerEvents = 'none';
    
    // Check if all roles are filled
    if (window.game.players.length === window.game.totalPlayers) {
        // All roles filled, move to next screen
        showScreen('turn-order-screen');
    } else {
        // More roles to fill, update UI
        updateRoleSelectionUI();
    }
}

function updateRoleSelectionUI() {
    // Update the title to show how many more roles need to be filled
    const remainingPlayers = window.game.totalPlayers - window.game.players.length;
    const title = document.querySelector('.role-selection-title h3');
    title.textContent = `Select Your Character (${remainingPlayers} more to go)`;
    
    // Disable already selected roles
    window.game.players.forEach(player => {
        const roleCard = document.querySelector(`.role-card[data-role="${player.role}"]`);
        if (roleCard) {
            roleCard.style.opacity = '0.5';
            roleCard.style.pointerEvents = 'none';
        }
    });
}

// --- Start Game with Selected Roles ---
function startGameWithSelectedRoles(playerConfigs) {
    console.log("Starting game with player configurations:", playerConfigs);
    
    // Validate player configs
    if (!playerConfigs || playerConfigs.length < 2) {
        alert("At least 2 players are required to start the game.");
        return;
    }
    
    // Check for duplicate roles (should be handled earlier, but just in case)
    const roles = playerConfigs.map(player => player.role);
    const uniqueRoles = new Set(roles);
    if (uniqueRoles.size !== roles.length) {
        console.warn("Duplicate roles detected. Each role should be unique.");
    }
    
    // Initialize the game with these configurations
    initializeGame(playerConfigs).then(success => {
        if (success) {
            console.log("Game initialized successfully!");
            showScreen('game-board-screen');
        } else {
            console.error("Failed to initialize game");
            alert("There was an error starting the game. Please try again.");
        }
    }).catch(error => {
        console.error("Error initializing game:", error);
        alert("There was an error starting the game. Please try again.");
    });
}

// --- Canvas Click Handling (Update element access) ---
function handleCanvasClick(event) {
    const canvas = elements.gameBoard.boardCanvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;
    
    const gameState = getGameState();
    const playerId = gameState.currentPlayerId;
    const player = getPlayerById(playerId);
    
    // If no player or not their turn, ignore clicks
    if (!player || playerId !== gameState.currentPlayerId) {
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
}

// --- Screen Management (Fixed) ---
export function showScreen(screenId) {
    console.log(`Showing screen: ${screenId}`);
    
    // Get target screen element
    const targetScreen = document.getElementById(screenId);
    if (!targetScreen) {
        console.error(`Screen with ID "${screenId}" not found`);
        return;
    }
    
    // Track previous screen for transition
    const previousScreen = currentScreen;
    
    // Use animated screen transition if available
    if (typeof animateScreenTransition === 'function' && previousScreen) {
        animateScreenTransition(previousScreen, screenId);
    } else {
        // Fallback if no animation function available
        // Hide all screens first
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
            screen.classList.remove('active');
        });
        
        // Show target screen with proper background
        targetScreen.style.display = 'flex';
        targetScreen.classList.add('active');
    }
    
    // Update current screen tracking
    currentScreen = screenId;
    
    // Special handling for game board screen
    if (screenId === 'game-board-screen') {
        // Small delay to ensure screen is visible before drawing
        setTimeout(() => {
            console.log("Drawing game board and players");
            drawBoard();
            drawPlayers();
            updatePlayerInfo();
            updateGameControls();
            
            // Show appropriate controls
            const gameControls = document.getElementById('controls');
            if (gameControls) gameControls.style.display = 'flex';
            
            const rollDiceBtn = document.getElementById('roll-dice-btn');
            const endTurnBtn = document.getElementById('end-turn-btn');
            if (rollDiceBtn) rollDiceBtn.style.display = 'block';
            if (endTurnBtn) endTurnBtn.style.display = 'block';
        }, 50);
    } else {
        // Hide game controls on non-game screens
        const gameControls = document.getElementById('controls');
        if (gameControls) gameControls.style.display = 'none';
    }
    
    // Ensure start button is visible on start screen
    if (screenId === 'start-screen') {
        const startButton = document.getElementById('start-game-btn');
        if (startButton) startButton.style.display = 'block';
    }
}

/**
 * Hide a specific screen
 * @param {string} screenId - ID of the screen to hide
 */
export function hideScreen(screenId) {
    const screen = document.getElementById(screenId);
    if (!screen) {
        console.error(`Screen with ID "${screenId}" not found`);
        return;
    }
    
    // Hide the screen
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
    const log = elements.gameBoard.messageLog;
    if (!log) {
        // If message log not available, log to console at minimum
        console.log(`${type.toUpperCase()}: ${message}`);
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `message-${type}`, 'animate-slideInUp');
    
    messageDiv.textContent = message;
    
    // Add timestamp
    const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const timeSpan = document.createElement('span');
    timeSpan.textContent = timestamp;
    timeSpan.style.fontSize = '0.8em';
    timeSpan.style.color = '#888';
    timeSpan.style.marginRight = '5px';
    
    messageDiv.insertBefore(timeSpan, messageDiv.firstChild);
    
    // Add to log and animate in
    log.appendChild(messageDiv);
    
    // Remove animation class after it completes
    messageDiv.addEventListener('animationend', function() {
        messageDiv.classList.remove('animate-slideInUp');
    });
    
    // Scroll to bottom with smooth animation
    log.scrollTop = log.scrollHeight;
    
    // Also log to console for debugging
    if (type === 'error') console.error(message);
    else if (type === 'warn') console.warn(message);
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

/**
 * Test if the resizeCanvas function is available and call it if so
 * This function provides a safe wrapper to call resizeCanvas
 */
function safeResizeCanvas() {
    // Import resizeCanvas from board.js directly
    try {
        resizeCanvas();
    } catch (e) {
        console.warn('Error calling resizeCanvas:', e);
    }
}

/**
 * Update game components and UI elements
 */
export function updateGameComponents() {
    // Handle board resizing
    safeResizeCanvas();
    
    // Update player information
    updatePlayerInfo();
    
    // Update turn controls
    updateGameControls();
}

// --- Highlight Management ---

/**
 * Highlight available choices for starting path or junction
 * @param {Array} choices - Array of choice objects with coordinates
 */
export function highlightChoices(choices) {
    if (!Array.isArray(choices) || choices.length === 0) {
        console.warn("Invalid choices array passed to highlightChoices.");
        return;
    }
    console.log("Highlighting choices:", choices);
    
    // Clear old highlights
    clearHighlights();
    
    // Add new highlights
    currentHighlights = [...choices];
    
    // Redraw the board with highlights
    try {
        if (typeof drawBoard === 'function') {
            drawBoard(); // Redraws board, spaces, etc.
        }
    } catch (error) {
        console.error("Error during drawBoard in highlightChoices:", error);
    }
    
    // Draw the highlight markers on the board
    try {
        const ctx = elements.gameBoard.ctx;
        if (ctx) {
            // Determine if it's a junction choice or starting path
            const isJunction = choices.some(choice => choice.type === 'junction');
            const isStartingPath = choices.some(choice => choice.type === 'start');
            
            // Get the player's current position to determine arrow directions
            const player = getPlayerById(getGameState().currentPlayerId);
            const playerCoords = player?.coords;
            
            // Draw highlight circles and directional arrows for each choice
            choices.forEach(choice => {
                if (!choice.coordinates) return;
                
                // Use scaleCoordinates function from board.js if available
                let scaledX, scaledY;
                if (typeof scaleCoordinates === 'function') {
                    [scaledX, scaledY] = scaleCoordinates(choice.coordinates[0], choice.coordinates[1]);
                } else {
                    // Fallback if scaleCoordinates is not available
                    const canvas = elements.gameBoard.boardCanvas;
                    const scale = Math.min(
                        canvas.width / 1536,  // Original board width
                        canvas.height / 1024  // Original board height
                    );
                    scaledX = choice.coordinates[0] * scale;
                    scaledY = choice.coordinates[1] * scale;
                }
                
                const boardScale = window.boardState?.scale || 1;
                const radius = 25 * boardScale; // Highlight circle size
                
                // Determine the highlight color based on path color if available
                let highlightColor = 'rgba(255, 255, 0, 0.3)'; // Default yellow
                let outlineColor = 'rgba(255, 215, 0, 0.8)'; // Default gold
                
                if (choice.pathColor) {
                    switch(choice.pathColor.toLowerCase()) {
                        case 'purple':
                            highlightColor = 'rgba(156, 84, 222, 0.4)'; // Purple
                            outlineColor = 'rgba(156, 84, 222, 0.9)';
                            break;
                        case 'blue':
                            highlightColor = 'rgba(27, 61, 229, 0.4)'; // Blue
                            outlineColor = 'rgba(27, 61, 229, 0.9)';
                            break;
                        case 'cyan':
                            highlightColor = 'rgba(0, 255, 255, 0.4)'; // Cyan
                            outlineColor = 'rgba(0, 255, 255, 0.9)';
                            break;
                        case 'pink':
                            highlightColor = 'rgba(255, 102, 255, 0.4)'; // Pink
                            outlineColor = 'rgba(255, 102, 255, 0.9)';
                            break;
                    }
                }
            
                // Draw pulsing highlight circle
                drawPulsingCircle(ctx, scaledX, scaledY, radius, highlightColor, outlineColor);
                
                // Draw directional arrow if it's a junction choice
                if ((isJunction || isStartingPath) && playerCoords) {
                    // Calculate direction from player to choice
                    const dx = choice.coordinates[0] - playerCoords.x;
                    const dy = choice.coordinates[1] - playerCoords.y;
                    
                    // Draw animated arrow pointing to the choice
                    drawAnimatedArrow(ctx, scaledX, scaledY, dx, dy, outlineColor);
                    
                    // If it's a path choice, add the path color label
                    if (choice.pathColor) {
                        drawPathLabel(ctx, scaledX, scaledY, choice.pathColor, radius * 1.5);
                    }
                }
            });
            
            // Start animation loop for pulsing highlights
            if (window.highlightAnimationFrame) {
                cancelAnimationFrame(window.highlightAnimationFrame);
            }
            animateHighlights();
        }
    } catch (error) {
        console.error("Error during highlight drawing:", error);
    }
}

/**
 * Draws a pulsing circle highlight
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Center x-coordinate
 * @param {number} y - Center y-coordinate
 * @param {number} radius - Base radius
 * @param {string} fillColor - Fill color
 * @param {string} strokeColor - Stroke color
 */
function drawPulsingCircle(ctx, x, y, radius, fillColor, strokeColor) {
    // Store the circle data for animation
    if (!window.pulsingCircles) {
        window.pulsingCircles = [];
    }
    
    window.pulsingCircles.push({
        x, y, 
        baseRadius: radius,
        fillColor, 
        strokeColor,
        phase: Math.random() * Math.PI * 2 // Random starting phase
    });
}

/**
 * Draws an animated arrow pointing toward a choice
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Destination x-coordinate
 * @param {number} y - Destination y-coordinate
 * @param {number} dx - Direction x component
 * @param {number} dy - Direction y component
 * @param {string} color - Arrow color
 */
function drawAnimatedArrow(ctx, x, y, dx, dy, color) {
    // Store the arrow data for animation
    if (!window.animatedArrows) {
        window.animatedArrows = [];
    }
    
    // Normalize direction
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 0.001) return; // Avoid division by zero
    
    const ndx = dx / length;
    const ndy = dy / length;
    
    // Calculate arrow starting point (some distance away from the destination)
    const arrowLength = 60;
    const startX = x - ndx * arrowLength;
    const startY = y - ndy * arrowLength;
    
    window.animatedArrows.push({
        startX, startY, endX: x, endY: y,
        dx: ndx, dy: ndy,
        color,
        phase: Math.random() * Math.PI * 2 // Random starting phase
    });
}

/**
 * Draws a path color label
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Center x-coordinate
 * @param {number} y - Center y-coordinate
 * @param {string} pathColor - Color name
 * @param {number} offset - Vertical offset from center
 */
function drawPathLabel(ctx, x, y, pathColor, offset) {
    ctx.save();
    
    // Create background for text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    const textWidth = pathColor.length * 7 + 20; // Rough estimate of text width
    ctx.roundRect(x - textWidth/2, y - offset - 15, textWidth, 25, 5);
    ctx.fill();
    
    // Draw the path color text
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pathColor.toLowerCase(); // Use the actual color
    ctx.fillText(pathColor, x, y - offset);
    
    ctx.restore();
}

/**
 * Animates all highlighted elements
 */
function animateHighlights() {
    const canvas = elements.gameBoard.boardCanvas;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const animate = () => {
        // Redraw the board first to clear previous frame
        if (typeof drawBoard === 'function') {
            drawBoard();
        }
        
        // Draw all pulsing circles
        if (window.pulsingCircles && window.pulsingCircles.length > 0) {
            ctx.save();
            
            window.pulsingCircles.forEach(circle => {
                // Update phase
                circle.phase += 0.05;
                
                // Calculate pulse effect (0.8 to 1.2 times the base radius)
                const pulseFactor = 0.8 + 0.4 * (Math.sin(circle.phase) * 0.5 + 0.5);
                const currentRadius = circle.baseRadius * pulseFactor;
                
                // Draw circle with current radius
                ctx.beginPath();
                ctx.arc(circle.x, circle.y, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = circle.fillColor;
                ctx.fill();
                ctx.strokeStyle = circle.strokeColor;
                ctx.lineWidth = 2;
                ctx.stroke();
            });
            
            ctx.restore();
        }
        
        // Draw all animated arrows
        if (window.animatedArrows && window.animatedArrows.length > 0) {
            ctx.save();
            
            window.animatedArrows.forEach(arrow => {
                // Update phase
                arrow.phase += 0.1;
                
                // Draw the arrow with moving dash pattern
                ctx.beginPath();
                ctx.moveTo(arrow.startX, arrow.startY);
                ctx.lineTo(arrow.endX, arrow.endY);
                
                ctx.strokeStyle = arrow.color;
                ctx.lineWidth = 4;
                
                // Animated dash pattern
                const dashOffset = performance.now() / 100 % 16;
                ctx.setLineDash([8, 8]);
                ctx.lineDashOffset = -dashOffset;
                
                ctx.stroke();
                
                // Draw arrowhead
                const headSize = 12;
                const angle = Math.atan2(arrow.dy, arrow.dx);
                
                ctx.beginPath();
                ctx.moveTo(arrow.endX, arrow.endY);
                ctx.lineTo(
                    arrow.endX - headSize * Math.cos(angle - Math.PI/6),
                    arrow.endY - headSize * Math.sin(angle - Math.PI/6)
                );
                ctx.lineTo(
                    arrow.endX - headSize * Math.cos(angle + Math.PI/6),
                    arrow.endY - headSize * Math.sin(angle + Math.PI/6)
                );
                ctx.closePath();
                
                ctx.fillStyle = arrow.color;
                ctx.fill();
                
                // Add a pulsing glow effect to the arrowhead
                const glowSize = 5 + 3 * Math.sin(arrow.phase);
                ctx.shadowColor = arrow.color;
                ctx.shadowBlur = glowSize;
                ctx.fill();
                
                // Reset shadow for next arrow
                ctx.shadowBlur = 0;
            });
            
            ctx.restore();
        }
        
        // Continue animation loop
        window.highlightAnimationFrame = requestAnimationFrame(animate);
    };
    
    // Start the animation loop
    window.highlightAnimationFrame = requestAnimationFrame(animate);
}

/**
 * Clears all highlights from the board
 */
export function clearHighlights() {
    currentHighlights = [];
    
    // Stop any highlight animations
    if (window.highlightAnimationFrame) {
        cancelAnimationFrame(window.highlightAnimationFrame);
        window.highlightAnimationFrame = null;
    }
    
    // Clear stored highlights
    window.pulsingCircles = [];
    window.animatedArrows = [];
    
    // Redraw the board to clear highlights
    try {
        if (typeof drawBoard === 'function') {
            drawBoard();
        }
    } catch (error) {
        console.error("Error during clearHighlights:", error);
    }
}

// For backward compatibility
export function updateGameLog(message, type = 'info') {
    logMessage(message, type);
}

// --- Dice Roll Animation ---

// Preload sound effects
const SOUND_EFFECTS = {
    diceRoll: new Audio('assets/sounds/dice-roll.mp3')
};

// Make sure sounds are ready to play
SOUND_EFFECTS.diceRoll.load();

/**
 * Show dice roll animation with the specified result
 * @param {boolean|number} startOrResult - If boolean true, starts animation; if boolean false, shows final result; if number, shows that specific result directly
 * @param {number} [result] - The dice roll result (1-6), only used when first param is boolean false
 */
export function showDiceRollAnimation(startOrResult, result) {
    const diceDisplay = elements.popups.diceDisplay;
    if (!diceDisplay) {
        console.error("Dice display element not found");
        return;
    }
    
    // If first parameter is boolean, handle animation start/end logic
    if (typeof startOrResult === 'boolean') {
        if (startOrResult === true) {
            // Starting animation - clear any previous content
            diceDisplay.innerHTML = '';
            
            // Create dice element
            const diceElement = document.createElement('div');
            diceElement.className = 'dice dice-animation';
            diceElement.textContent = Math.floor(Math.random() * 6) + 1;
            
            // Show the dice display
            diceDisplay.appendChild(diceElement);
            diceDisplay.style.display = 'flex';
            
            // Play dice roll sound
            SOUND_EFFECTS.diceRoll.currentTime = 0;
            SOUND_EFFECTS.diceRoll.play().catch(e => console.warn("Could not play dice sound:", e));
            
            // Get sound duration to sync animation
            const soundDuration = SOUND_EFFECTS.diceRoll.duration * 1000 || 1200; // Fallback if duration unavailable
            
            // Use the imported animateDiceRoll from animations.js
            // This will override the default animation with a better one
            if (typeof animateDiceRoll === 'function') {
                // We pass null as the final value since we're just starting the animation
                // The animation will show random values and last as long as the sound
                animateDiceRoll(diceElement, null, soundDuration);
            } else {
                // Fallback to our internal animation if animateDiceRoll isn't available
                // Ensure any previous animations are cleared
                if (window.diceAnimationInterval) {
                    clearInterval(window.diceAnimationInterval);
                }
                
                // Set up animation to show random values
                let animationFrames = 0;
                // Calculate number of frames based on sound duration (avg 12 frames per 1000ms)
                const totalFrames = Math.ceil(soundDuration / 80); 
                window.diceAnimationInterval = setInterval(() => {
                    if (animationFrames < totalFrames) {
                        const randomValue = Math.floor(Math.random() * 6) + 1;
                        diceElement.textContent = randomValue;
                        animationFrames++;
                    } else {
                        // End the random animation
                        clearInterval(window.diceAnimationInterval);
                        window.diceAnimationInterval = null;
                    }
                }, soundDuration / totalFrames); // Space frames evenly across sound duration
            }
        } else {
            // Ending animation with result
            const diceElement = diceDisplay.querySelector('.dice');
            if (diceElement) {
                // Clear any ongoing animations
                if (window.diceAnimationInterval) {
                    clearInterval(window.diceAnimationInterval);
                    window.diceAnimationInterval = null;
                }
                
                // Update classes for result display
                diceElement.classList.remove('dice-animation');
                diceElement.classList.add('dice-result');
                
                // Use the imported animateDiceRoll for the final result animation
                if (typeof animateDiceRoll === 'function') {
                    // This will animate to the final value
                    animateDiceRoll(diceElement, result, 500).then(() => {
                        // Add pulse effect after animation completes
                        diceElement.style.animation = 'dicePulse 0.5s ease-in-out';
                    });
                } else {
                    // Fallback to simple display
                    diceElement.textContent = result;
                    // Add a pulse effect
                    diceElement.style.animation = 'none';
                    void diceElement.offsetWidth; // Force reflow
                    diceElement.style.animation = 'dicePulse 0.5s ease-in-out';
                }
                
                // Log the dice roll
                logMessage(`Rolled a ${result}!`, 'dice');
            }
        }
    } else if (typeof startOrResult === 'number') {
        // Showing a specific number directly (shorthand version)
        
        // Clear any existing content and animations
        diceDisplay.innerHTML = '';
        if (window.diceAnimationInterval) {
            clearInterval(window.diceAnimationInterval);
            window.diceAnimationInterval = null;
        }
        
        // Create dice element showing the result directly
        const diceElement = document.createElement('div');
        diceElement.className = 'dice dice-result';
        
        // Display the result with or without animation
        if (typeof animateDiceRoll === 'function') {
            // Set initial value to avoid flash of empty content
            diceElement.textContent = '?';
            diceDisplay.appendChild(diceElement);
            diceDisplay.style.display = 'flex';
            
            // Play shorter dice sound for direct display
            SOUND_EFFECTS.diceRoll.currentTime = 0.5; // Skip to middle of sound
            SOUND_EFFECTS.diceRoll.play().catch(e => console.warn("Could not play dice sound:", e));
            
            // Animate directly to final value with short animation
            animateDiceRoll(diceElement, startOrResult, 300).then(() => {
                diceElement.style.animation = 'dicePulse 0.5s ease-in-out';
            });
        } else {
            // Fallback simple display
            diceElement.textContent = startOrResult;
            diceDisplay.appendChild(diceElement);
            diceDisplay.style.display = 'flex';
            
            // Add a pulse effect
            diceElement.style.animation = 'dicePulse 0.5s ease-in-out';
        }
        
        // Log the dice roll
        logMessage(`Rolled a ${startOrResult}!`, 'dice');
    }
}

/**
 * Hide the dice roll animation
 * @param {number} delay - Optional delay in milliseconds before hiding the dice
 */
export function hideDiceRollAnimation(delay = 1500) {
    const diceDisplay = elements.popups.diceDisplay;
    if (!diceDisplay) {
        console.error("Dice display element not found");
        return;
    }
    
    // Clear any ongoing animation interval
    if (window.diceAnimationInterval) {
        clearInterval(window.diceAnimationInterval);
        window.diceAnimationInterval = null;
    }
    
    // Add fade-out effect
    const diceElement = diceDisplay.querySelector('.dice');
    if (diceElement) {
        diceElement.style.transition = 'opacity 0.5s ease-out';
        
        setTimeout(() => {
            diceElement.style.opacity = '0';
            
            // Hide the display after fade completes
            setTimeout(() => {
                diceDisplay.style.display = 'none';
                // Clean up for next use
                diceDisplay.innerHTML = '';
            }, 500);
        }, delay);
    } else {
        // If no dice element found, just hide after delay
        setTimeout(() => {
            diceDisplay.style.display = 'none';
            diceDisplay.innerHTML = '';
        }, delay);
    }
}

// --- Utility Functions ---
// Helper function to get player color based on role
function getPlayerColor(role) {
    // Updated colors to match the PATH_COLORS from board-data.js
    // Path colors from board-data.js:
    // Purple: #9C54DE - Age of Expansion
    // Blue: #1B3DE5 - Age of Resistance
    // Cyan: #00FFFF - Age of Reckoning
    // Pink: #FF66FF - Age of Legacy
    const PLAYER_COLORS = {
        HISTORIAN: '#9C54DE',   // Purple - Age of Expansion
        REVOLUTIONARY: '#1B3DE5', // Blue - Age of Resistance
        COLONIALIST: '#00FFFF', // Cyan - Age of Reckoning
        ENTREPRENEUR: '#FF66FF', // Pink - Age of Legacy
        POLITICIAN: '#8A2BE2',   // Additional color
        ARTIST: '#FF69B4'       // Additional color
    };
    return PLAYER_COLORS[role] || '#808080';
}

// Helper function to convert hex color to rgb for opacity support
function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        parseInt(result[1], 16) + ',' + parseInt(result[2], 16) + ',' + parseInt(result[3], 16) :
        '255,255,255';
}

/**
 * Display a card with information about the current action
 * @param {Object} cardData - Data to display on the card
 */
export function showActionCard(cardData) {
    console.log("showActionCard called with:", cardData);
    
    // First, ensure the action card container exists
    let actionCardContainer = document.getElementById('action-card-container');
    let actionCard, title, message, buttonContainer;
    
    // If container doesn't exist, create it
    if (!actionCardContainer) {
        console.log("Creating action card container dynamically");
        // Create container
        actionCardContainer = document.createElement('div');
        actionCardContainer.id = 'action-card-container';
        actionCardContainer.className = 'popup';
        actionCardContainer.style.position = 'fixed';
        actionCardContainer.style.top = '0';
        actionCardContainer.style.left = '0';
        actionCardContainer.style.width = '100%';
        actionCardContainer.style.height = '100%';
        actionCardContainer.style.display = 'none';
        actionCardContainer.style.justifyContent = 'center';
        actionCardContainer.style.alignItems = 'center';
        actionCardContainer.style.zIndex = '1000';
        actionCardContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        
        // Create card structure
        const cardHTML = `
            <div id="action-card" class="action-card" style="background-color: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 0 20px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; width: 80%; max-width: 500px;">
                <div class="card-header" style="margin-bottom: 15px; text-align: center;">
                    <h3 id="action-card-title" style="margin: 0;">Action Card</h3>
                </div>
                <div class="card-content" style="flex: 1; display: flex; flex-direction: column;">
                    <div id="action-card-message" class="card-message-container" style="margin-bottom: 20px; line-height: 1.5;"></div>
                    <div id="action-card-buttons" class="card-buttons" style="display: flex; justify-content: center; gap: 10px;"></div>
                </div>
            </div>
        `;
        
        // Add to container
        actionCardContainer.innerHTML = cardHTML;
        
        // Add to document
        document.body.appendChild(actionCardContainer);
        
        console.log("Action card container created and added to document");
    }
    
    // Now get all needed elements
    actionCard = document.getElementById('action-card');
    title = document.getElementById('action-card-title');
    message = document.getElementById('action-card-message');
    buttonContainer = document.getElementById('action-card-buttons');
    
    // Verify elements exist
    if (!actionCard || !title || !message || !buttonContainer) {
        console.error("Action card elements not found or could not be created:", {
            actionCard: !!actionCard,
            title: !!title,
            message: !!message,
            buttonContainer: !!buttonContainer
        });
        
        // Try to get or create them individually if missing
        if (!actionCard && actionCardContainer) {
            console.log("Creating action card element");
            actionCard = document.createElement('div');
            actionCard.id = 'action-card';
            actionCard.className = 'action-card';
            actionCardContainer.appendChild(actionCard);
        }
        
        if (actionCard) {
            if (!title) {
                console.log("Creating title element");
                title = document.createElement('h3');
                title.id = 'action-card-title';
                actionCard.appendChild(title);
            }
            
            if (!message) {
                console.log("Creating message element");
                message = document.createElement('div');
                message.id = 'action-card-message';
                actionCard.appendChild(message);
            }
            
            if (!buttonContainer) {
                console.log("Creating button container");
                buttonContainer = document.createElement('div');
                buttonContainer.id = 'action-card-buttons';
                actionCard.appendChild(buttonContainer);
            }
        } else {
            console.error("Failed to create action card elements");
            return false;
        }
    }
    
    // Add dynamic card styling based on type
    actionCard.className = 'action-card';
    if (cardData.type) {
        actionCard.classList.add(`card-type-${cardData.type.toLowerCase()}`);
    }
    
    // Set card content
    title.textContent = cardData.title || 'Action Card';
    
    // For message, either set direct text or use animated typing effect
    if (cardData.useTypeAnimation) {
        message.textContent = '';
        animateTypeText(message, cardData.message || '', 30);
    } else {
        message.textContent = cardData.message || '';
    }
    
    // Clear any existing buttons
    buttonContainer.innerHTML = '';
    
    // Add buttons if specified
    if (Array.isArray(cardData.buttons) && cardData.buttons.length > 0) {
        cardData.buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.className = 'action-card-button';
            btn.textContent = button.text || 'OK';
            
            if (button.class) {
                btn.classList.add(button.class);
            }
            
            // Add click handler
            btn.addEventListener('click', () => {
                // Hide card
                hideActionCard();
                
                // Execute button action if provided
                if (typeof button.action === 'function') {
                    button.action();
                }
            });
            
            buttonContainer.appendChild(btn);
        });
    } else {
        // Default OK button
        const okButton = document.createElement('button');
        okButton.className = 'action-card-button';
        okButton.textContent = 'OK';
        okButton.addEventListener('click', hideActionCard);
        buttonContainer.appendChild(okButton);
    }
    
    // Log card display if logging function is available
    try {
        // Use the imported logGameEvent function
        logGameEvent('CARD_DISPLAYED', {
            cardType: cardData.type || 'generic',
            cardTitle: cardData.title || 'Action Card',
            playerId: window.gameState?.currentPlayerId,
            hasButtons: Array.isArray(cardData.buttons) && cardData.buttons.length > 0
        });
    } catch (e) {
        console.warn('Logging card display failed:', e);
    }
    
    // Add styles if not already added
    if (!document.getElementById('action-card-styles')) {
        addCardStyles();
    }
    
    // Show the card container
    actionCardContainer.style.display = 'flex';
    
    // Show the card with animation
    actionCard.style.display = 'flex';
    
    // Ensure the animation triggers by forcing a reflow
    void actionCard.offsetWidth;
    
    // Add the "shown" class for animation
    actionCard.classList.add('shown');
    
    console.log("Action card successfully displayed");
    return true;
}

/**
 * Animate typing text effect
 * @param {HTMLElement} element - Element to append text to
 * @param {string} text - Text to animate
 * @param {number} speed - Typing speed in ms
 */
function animateTypeText(element, text, speed = 30) {
    let i = 0;
    element.textContent = '';
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

/**
 * Hide the action card with an exit animation
 */
export function hideActionCard() {
    const actionCardContainer = document.getElementById('action-card-container');
    if (!actionCardContainer) return;
    
    const actionCard = document.getElementById('action-card');
    if (!actionCard) return;
    
    // Add exit animation class
    actionCard.classList.remove('shown');
    actionCard.classList.add('card-exit');
    
    // Remove the card after animation completes
    setTimeout(() => {
        // Just hide the container rather than removing it
        actionCardContainer.style.display = 'none';
        
        // Reset classes for next use
        actionCard.classList.remove('card-exit');
        
        // Clear content for cleanliness
        const messageEl = document.getElementById('action-card-message');
        const buttonsEl = document.getElementById('action-card-buttons');
        
        if (messageEl) messageEl.textContent = '';
        if (buttonsEl) buttonsEl.innerHTML = '';
    }, 500);
}

// Add these styles to the page for card animations
function addCardStyles() {
    if (document.getElementById('card-animation-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'card-animation-styles';
    styleElement.textContent = `
        #action-card-container {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            pointer-events: auto;
        }
        
        .action-card {
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            overflow: hidden;
            width: 320px;
            max-width: 90vw;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            transition: opacity 0.4s ease-out, transform 0.4s ease-out;
        }
        
        .action-card.visible {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        
        .action-card.card-exit {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
            transition: opacity 0.3s ease-in, transform 0.3s ease-in;
        }
        
        .card-header {
            padding: 15px;
            display: flex;
            align-items: center;
            color: white;
        }
        
        .card-icon {
            font-size: 24px;
            margin-right: 10px;
        }
        
        .card-header h3 {
            margin: 0;
            font-size: 18px;
        }
        
        .card-content {
            padding: 20px;
        }
        
        .card-content h4 {
            margin-top: 0;
            margin-bottom: 10px;
            color: #333;
        }
        
        .card-message-container {
            margin-bottom: 15px;
            min-height: 40px;
            line-height: 1.4;
        }
        
        .player-info {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        
        .player-token {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            margin-right: 10px;
        }
        
        .token-description {
            margin-top: 5px;
            font-size: 12px;
            color: #666;
            font-style: italic;
        }
        
        .dice-result {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 15px 0;
            font-size: 24px;
            transition: transform 0.3s ease;
        }
        
        .dice-icon {
            margin-right: 10px;
        }
        
        .result-number {
            font-weight: bold;
            font-size: 32px;
        }
        
        .highlight-pulse {
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        .card-buttons {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
        }
        
        .card-button {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            background-color: #4a6fa5;
            color: white;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.2s;
            opacity: 0;
            transform: translateY(10px);
            animation: button-enter 0.5s forwards;
        }
        
        .card-button:hover {
            background-color: #3a5980;
            transform: translateY(-2px);
        }
        
        .card-button.button-clicked {
            animation: button-click 0.3s forwards;
        }
        
        @keyframes button-enter {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes button-click {
            0% { transform: scale(1); }
            50% { transform: scale(0.95); }
            100% { transform: scale(1); }
        }
    `;
    
    document.head.appendChild(styleElement);
}

// Add the styles when the file loads
(function() {
    // Add card styles when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addCardStyles);
    } else {
        addCardStyles();
    }
})();

/**
 * Highlight a card deck to indicate it can be clicked
 * @param {string} deckType - The type of deck to highlight (purple, blue, cyan, pink, end_of_turn)
 */
export function highlightDeck(deckType) {
    const deckTypes = {
        'purple': 'expansion',
        'blue': 'resistance',
        'cyan': 'reckoning', 
        'pink': 'legacy',
        'end_of_turn': 'end_of_turn'
    };
    
    const normalizedType = deckTypes[deckType.toLowerCase()] || deckType.toLowerCase();
    
    // Clear any existing highlights
    clearDeckHighlights();
    
    // Get the deck element based on type
    const deckElement = document.querySelector(`.card-deck.${normalizedType}`);
    if (!deckElement) {
        console.error(`Deck element for ${deckType} not found`);
        return;
    }
    
    // Add pulsing highlight class
    deckElement.classList.add('deck-highlight');
    
    // Add a message guiding the player
    logMessage(`Click on the ${deckType} deck to draw a card`, 'info');
    
    // Set up a flashing animation
    if (window.deckHighlightInterval) {
        clearInterval(window.deckHighlightInterval);
    }
    
    let opacity = 0.4;
    let increasing = true;
    
    window.deckHighlightInterval = setInterval(() => {
        if (increasing) {
            opacity += 0.05;
            if (opacity >= 0.9) {
                increasing = false;
            }
        } else {
            opacity -= 0.05;
            if (opacity <= 0.3) {
                increasing = true;
            }
        }
        
        deckElement.style.boxShadow = `0 0 15px 5px rgba(255, 255, 255, ${opacity})`;
    }, 50);
    
    // If it's end_of_turn, highlight both end of turn decks
    if (normalizedType === 'end_of_turn') {
        const secondDeckElement = document.querySelector('.card-deck.end_of_turn_2');
        if (secondDeckElement) {
            secondDeckElement.classList.add('deck-highlight');
            
            // Add same animation to second end of turn deck
            window.deckHighlightInterval2 = setInterval(() => {
                secondDeckElement.style.boxShadow = `0 0 15px 5px rgba(255, 255, 255, ${opacity})`;
            }, 50);
        }
    }
    
    // Auto-clear the highlight after 10 seconds if player doesn't click
    window.deckHighlightTimeout = setTimeout(() => {
        clearDeckHighlights();
    }, 10000);
}

/**
 * Clear all deck highlights
 */
function clearDeckHighlights() {
    // Clear intervals and timeouts
    if (window.deckHighlightInterval) {
        clearInterval(window.deckHighlightInterval);
        window.deckHighlightInterval = null;
    }
    
    if (window.deckHighlightInterval2) {
        clearInterval(window.deckHighlightInterval2);
        window.deckHighlightInterval2 = null;
    }
    
    if (window.deckHighlightTimeout) {
        clearTimeout(window.deckHighlightTimeout);
        window.deckHighlightTimeout = null;
    }
    
    // Remove highlight classes from all decks
    document.querySelectorAll('.card-deck').forEach(deck => {
        deck.classList.remove('deck-highlight');
        deck.style.boxShadow = '';
    });
}

// Actually use currentHighlights and PLAYER_TOKEN_RADIUS in a utility function
export function getHighlightedSpaces() {
    return currentHighlights;
}

export function getPlayerTokenRadius() {
    return PLAYER_TOKEN_RADIUS;
}

// In the animatePlayerMovement function, use screenFromCoords
function getScreenCoordinates(fromCoords) {
    // Use the existing screenFromCoords variable
    if (typeof scaleCoordinates === 'function') {
        return { 
            x: scaleCoordinates(fromCoords[0], fromCoords[1])[0],
            y: scaleCoordinates(fromCoords[0], fromCoords[1])[1]
        };
    } else {
        // Fallback if scaleCoordinates isn't available
        const canvas = elements.gameBoard.boardCanvas;
        const scaleX = canvas.width / 1536; // Assuming 1536 is original board width
        const scaleY = canvas.height / 1024; // Assuming 1024 is original board height
        
        return {
            x: fromCoords[0] * scaleX,
            y: fromCoords[1] * scaleY
        };
    }
}

// Use the imported functions from board.js
export function initializeBoard() {
    // This is now a utility function that can be called explicitly if needed
    // but it won't be called automatically during UI initialization
    console.log("Manually initializing board from UI module...");
    setupBoard().then(result => {
        if (result.canvas && result.ctx) {
            console.log("Board setup successful");
            setupBoardUIComponents();
        } else {
            console.error("Board setup failed");
        }
    });
}

// Use animateCardFlip in a helper function
export function flipCardWithAnimation(cardElement, frontContent, backContent) {
    return new Promise(resolve => {
        // Use the imported animateCardFlip function
        animateCardFlip(
            cardElement,
            // This function is called when the card is flipped halfway
            () => {
                // Update the card content with the back content
                cardElement.innerHTML = backContent;
            },
            // This function is called when the animation completes
            () => {
                resolve();
            }
        );
    });
}

// Use the logging functions in a utility function that will be called
// from various parts of the UI when events occur
export function logUIEvent(eventType, playerId, details = {}) {
    console.log(`UI Event: ${eventType} for player ${playerId}`, details);
    
    switch (eventType) {
        case 'RESOURCE_CHANGE':
            if (details.resourceType && details.amount) {
                logResourceChange(playerId, details.resourceType, details.amount, details.reason || 'UI event');
            }
            break;
            
        case 'PLAYER_ACTION':
            logPlayerAction(playerId, details.action || 'unknown action', details);
            break;
            
        case 'PLAYER_MOVEMENT':
            if (details.fromCoords && details.toCoords) {
                logPlayerMovement(playerId, details.fromCoords, details.toCoords, details.spaces || 1);
            }
            break;
            
        default:
            // Log generic event
            logGameEvent(eventType, {
                playerId,
                ...details
            });
    }
}

/**
 * Helper function to generate HTML for card effects
 * @param {Object} effects - The effects object from a card
 * @param {Object} player - The current player
 * @returns {string} HTML string for effects
 */
function getEffectsHTML(effects, player) {
    if (!effects || !player) return '';
    
    // Check if effects is a role-based object
    if (typeof effects === 'object' && !Array.isArray(effects)) {
        // If we have a specific effect for this player's role, show that
        if (effects[player.role]) {
            const effect = effects[player.role];
            return `
                <div class="effect role-specific">
                    <h4>${player.role} Effect:</h4>
                    <p>${effect.description || 'No description available.'}</p>
                    ${getEffectDetailsHTML(effect)}
                </div>
            `;
        }
        
        // Otherwise, show effects for all roles
        return Object.entries(effects)
            .map(([role, effect]) => `
                <div class="effect ${role === player.role ? 'current-role' : ''}">
                    <h4>${role}:</h4>
                    <p>${effect.description || 'No description available.'}</p>
                    ${getEffectDetailsHTML(effect)}
                </div>
            `)
            .join('');
    }
    
    // If effects is an array, show each effect
    if (Array.isArray(effects)) {
        return effects
            .map(effect => `
                <div class="effect">
                    <p>${effect.description || 'No description available.'}</p>
                    ${getEffectDetailsHTML(effect)}
                </div>
            `)
            .join('');
    }
    
    return '';
}

/**
 * Helper function to generate HTML for specific effect details
 * @param {Object} effect - The effect object
 * @returns {string} HTML string for effect details
 */
function getEffectDetailsHTML(effect) {
    if (!effect) return '';
    
    let detailsHTML = '';
    
    // Resource changes
    if (effect.changes) {
        const changes = [];
        if (effect.changes.money) changes.push(`Money: ${effect.changes.money >= 0 ? '+' : ''}${effect.changes.money}`);
        if (effect.changes.knowledge) changes.push(`Knowledge: ${effect.changes.knowledge >= 0 ? '+' : ''}${effect.changes.knowledge}`);
        if (effect.changes.influence) changes.push(`Influence: ${effect.changes.influence >= 0 ? '+' : ''}${effect.changes.influence}`);
        
        if (changes.length > 0) {
            detailsHTML += `<div class="effect-details resource-changes">${changes.join(', ')}</div>`;
        }
    }
    
    // Movement effects
    if (effect.movement) {
        const moveText = effect.movement > 0 
            ? `Move forward ${effect.movement} spaces` 
            : `Move backward ${Math.abs(effect.movement)} spaces`;
        detailsHTML += `<div class="effect-details movement">${moveText}</div>`;
    }
    
    // Other effects
    if (effect.skipTurn) {
        detailsHTML += `<div class="effect-details negative">Skip next turn</div>`;
    }
    
    if (effect.extraTurn) {
        detailsHTML += `<div class="effect-details positive">Take an extra turn</div>`;
    }
    
    if (effect.immunity) {
        detailsHTML += `<div class="effect-details positive">Gain immunity for ${effect.immunity} turns</div>`;
    }
    
    return detailsHTML;
}

/**
 * Draw all player tokens on the board
 * This function calls the underlying board function to render all player tokens
 */
export function drawAllPlayerTokens() {
    // First clear any existing player tokens from the canvas
    if (elements.gameBoard.ctx) {
        const canvas = elements.gameBoard.boardCanvas;
        if (canvas) {
            // Only clear the player tokens, not the entire board
            // This requires knowledge of where players are drawn
            // For simplicity, we'll redraw the entire board
            drawBoard();
        }
    }
    
    // Get all players from the game state
    const players = getPlayers();
    if (!players || players.length === 0) {
        console.warn('No players to draw');
        return;
    }
    
    // Draw each player token at their current position
    players.forEach(player => {
        if (player && player.currentCoords) {
            drawPlayerToken(player, player.currentCoords);
        }
    });
}

