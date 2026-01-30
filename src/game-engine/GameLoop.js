// import CONSTS from "/js/contants.js";
import CONSTS from "./contants.js";
import { DrawPlayer, DrawPunch, DrawKick, DrawFaceDirection, DrawYou, DrawFloor, DrawInitialScene } from "./Draw.js";
// import { DrawPlayer, DrawPunch, DrawKick, DrawFaceDirection, DrawYou, DrawFloor, DrawInitialScene  } from "http://localhost:3000/js/Draw.js";

class GameLoop {
    constructor(myCanvas, socket, inputBatcher, localPlayerId, allPlayers) {
        this.socket = socket;
        this.localInputs = inputBatcher;
        this.myCanvas = myCanvas;
        this.canvas = myCanvas.canvas;
        this.ctx = this.canvas.getContext("2d");

        this.allPlayers = allPlayers;
        this.localPlayerId = localPlayerId;

        this.isJumping = false;
        this.isKicking = false;
        this.isPunching = false;
        this.horizontalVelocity = 0;
        this.frame = 0;
        this.prevFrame = 0;
        this.prevFrameSent = 0;
        this.inputsOnDeck = [];
        this.localX_Adjustment = 0;
        this.totalXBeenAdjusted = 0;
        this.pendingServerState = null;
        setInterval(() => {
            const diff = this.frame - this.prevFrame;
            // console.log({ prevFrame: this.prevFrame, frame: this.frame, diff });
            this.prevFrame = this.frame;
        }, 1000);

        const {
            PREDICTION_BUFFER_MS,
            inputCooldown,
            // INTERPOLATION_AMOUNT,
            INTERPOLATION_DELAY,
            PLAYER_WIDTH,
            PLAYER_HEIGHT,
            MOVEMENT_SPEED,
            FLOOR_HEIGHT,
            JUMP_VELOCITY,
            GRAVITY,
            AIR_RESISTANCE,
            GROUND_FRICTION,
            PUNCH_DURATION,
            KICK_DURATION,
            ARM_WIDTH,
            ARM_HEIGHT,
            ARM_Y_OFFSET,
            LEG_WIDTH,
            LEG_HEIGHT,
            FLOOR_Y,
            LEG_Y_OFFSET,
            SERVER_TICK_RATE,
            CANVAS_HEIGHT,
        } = CONSTS;

        this.FLOOR_Y = CANVAS_HEIGHT - FLOOR_HEIGHT;
        this.MOVEMENT_SPEED = MOVEMENT_SPEED;
        this.JUMP_VELOCITY = JUMP_VELOCITY;
        this.GRAVITY = GRAVITY;
        this.SERVER_TICK_RATE = SERVER_TICK_RATE;
        this.AIR_RESISTANCE = AIR_RESISTANCE;
        this.GROUND_FRICTION = GROUND_FRICTION;
        this.PUNCH_DURATION = PUNCH_DURATION;
        this.KICK_DURATION = KICK_DURATION;
        this.ARM_WIDTH = ARM_WIDTH;
        this.ARM_HEIGHT = ARM_HEIGHT;
        this.ARM_Y_OFFSET = ARM_Y_OFFSET;
        this.LEG_WIDTH = LEG_WIDTH;
        this.LEG_HEIGHT = LEG_HEIGHT;
        this.PLAYER_HEIGHT = PLAYER_HEIGHT;
        this.PLAYER_WIDTH = PLAYER_WIDTH;

        this.animationFrameId = null; // Add this to track the loop
        this.isRunning = false; // Add a flag to prevent multiple loops

        this.init();
    }

    init() {
        this.localInputs.gameLoop = this;
        // this.socket.on("initServerPlayers", (serverData) => {
        //     debugger;

        //     // console.log("Received init serverData:", serverData);
        //     // if (this.localPlayerId != serverData.playerId) {
        //     //     this.localPlayerId = serverData.playerId;
        //     // }

        //     // Add all existing players
        //     serverData.players.forEach((serverPlayer) => {
        //         // Set initial y position on the floor
        //         serverPlayer.y = this.FLOOR_Y - this.PLAYER_HEIGHT;
        //         // Set default facing direction if not provided
        //         serverPlayer.facing = serverPlayer.facing || "right";
        //         // Initialize interpolation targets
        //         serverPlayer.targetX = serverPlayer.x;
        //         // serverPlayer.targetHeight = serverPlayer.height || 0;
        //         this.allPlayers.set(serverPlayer.id, serverPlayer);
        //     });

        // });
        // console.log("this.Players initialized:", this.allPlayers.size);
        // this.gameLoop.bind(this)();
        // Start the game loop ONLY if it's not already running
        if (!this.isRunning) {
            this.start();
        }

        // Handle new player joining
        // this.socket.on("playerJoined", (serverPlayer) => {
        //     debugger;
        //     // console.log("New serverPlayer joined:", serverPlayer.id);
        //     // Set initial y position on the floor
        //     serverPlayer.y = this.FLOOR_Y - this.PLAYER_HEIGHT;
        //     // Set default facing direction if not provided
        //     serverPlayer.facing = serverPlayer.facing || "right";
        //     // Initialize interpolation targets
        //     serverPlayer.targetX = serverPlayer.x;
        //     // serverPlayer.targetHeight = serverPlayer.height || 0;
        //     this.allPlayers.set(serverPlayer.id, serverPlayer);
        // });

        this.socket.on("playerKicked", (id) => {
            const player = this.allPlayers.get(id);
            if (player) {
                player.isKicking = true;
                player.kickStartTime = Date.now();

                // Reset kick after animation duration
                setTimeout(() => {
                    player.isKicking = false;
                }, KICK_DURATION);
            }
        });

        // Handle player leaving
        this.socket.on("playerLeft", (id) => {
            // console.log("Player left:", id);
            this.allPlayers.delete(id);
        });

        // Modify the gameState handler for other players
        this.socket.on("gameState", (data) => {
            // const serverTime = Date.now();
            data.players.forEach((serverPlayer) => {
                if (serverPlayer.id === this.localPlayerId) {
                    // Defer reconciliation to next frame so sendBatch runs first
                    this.pendingServerState = serverPlayer;
                } else {
                    // Other players - interpolate movement
                    let otherPlayer = this.allPlayers.get(serverPlayer.id);
                    if (!otherPlayer) {
                        debugger;
                        //THIS SHOULD NEVER HAPPEN
                        throw new Error("Other player not found in allPlayers map: " + serverPlayer.id);
                        // console.log("Creating new remote player:", serverPlayer.id);
                        // otherPlayer = {
                        //     id: serverPlayer.id,
                        //     x: serverPlayer.x,
                        //     y: this.FLOOR_Y - this.PLAYER_HEIGHT - (serverPlayer.height || 0),
                        //     targetHeight: serverPlayer.height || 0,
                        //     color: "#" + Math.floor(Math.random() * 16777215).toString(16),
                        //     facing: serverPlayer.facing || "right",
                        //     targetX: serverPlayer.x,
                        //     // height: serverPlayer.height || 0,
                        //     isPunching: false,
                        //     isKicking: false,
                        //     isJumping: serverPlayerLocal.isJumping || false,
                        // };
                        // this.allPlayers.set(serverPlayer.id, otherPlayer);
                    } else {
                        // Existing player - update targets for interpolation
                        otherPlayer.targetX = serverPlayer.x;
                        otherPlayer.targetHeight = serverPlayer.height || 0;
                        otherPlayer.isJumping = serverPlayer.isJumping || false;
                        otherPlayer.y = this.FLOOR_Y - this.PLAYER_HEIGHT - (serverPlayer.height || 0);

                        // Preserve visual state
                        const visualState = {
                            color: otherPlayer.color,
                            isPunching: otherPlayer.isPunching,
                            isKicking: otherPlayer.isKicking,
                        };

                        // Update other properties that don't need interpolation
                        otherPlayer.facing = serverPlayer.facing;

                        // Restore visual state
                        Object.assign(otherPlayer, visualState);
                    }
                }
            });
        });

        // Update your sendInputState function to include timestamp

        // Handle connection to the server
        // this.socket.on("connect", (s) => {
        //     console.log(s);
        //     this.localPlayerId = this.socket.id;

        //     console.log("Connected to server with ID:", this.socket.id);
        //     this.myCanvas.status.textContent = "Connected! Use arrow keys to move.";
        // });

        // Handle disconnection
        this.socket.on("disconnect", () => {
            console.log("Disconnected from server");
            this.myCanvas.status.textContent = "Disconnected from server. Trying to reconnect...";
        });
    }
    // NEW: Add a start() method
    start() {
        if (this.isRunning) return;
        console.log("GameLoop started.");
        this.isRunning = true;
        this.gameLoop(); // Kick off the loop
    }

    // NEW: Add a stop() method for cleanup
    stop() {
        if (!this.isRunning) return;
        console.log("GameLoop stopped.");
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    handleServerUpdateLocalPlayer(serverPlayerLocal) {
        if (!this.localPlayerId) return;
        const localFuturePlayer = this.allPlayers.get(this.localPlayerId);
        if (!localFuturePlayer) return;

        // Preserve visual state
        const visualState = {
            color: localFuturePlayer.color,
            id: localFuturePlayer.id,
            isPunching: localFuturePlayer.isPunching,
            isKicking: localFuturePlayer.isKicking,
        };
        const futureClientPosition = {
            x: localFuturePlayer.x,
            y: localFuturePlayer.y,
            height: localFuturePlayer.height,
        };

        // 1. Apply authoritative server state
        localFuturePlayer.x = serverPlayerLocal.x;
        localFuturePlayer.height = serverPlayerLocal.height || 0;
        localFuturePlayer.y = this.FLOOR_Y - this.PLAYER_HEIGHT - localFuturePlayer.height;
        localFuturePlayer.horizontalVelocity = serverPlayerLocal.horizontalVelocity || 0;
        localFuturePlayer.verticalVelocity = serverPlayerLocal.verticalVelocity || 0;
        localFuturePlayer.isJumping = serverPlayerLocal.isJumping || false;
        if (serverPlayerLocal.facing) {
            localFuturePlayer.facing = serverPlayerLocal.facing;
        }

        // Sync character-specific stats from server
        if (serverPlayerLocal.movementSpeed !== undefined) localFuturePlayer.movementSpeed = serverPlayerLocal.movementSpeed;
        if (serverPlayerLocal.jumpVelocity !== undefined) localFuturePlayer.jumpVelocity = serverPlayerLocal.jumpVelocity;
        if (serverPlayerLocal.characterWidth !== undefined) localFuturePlayer.characterWidth = serverPlayerLocal.characterWidth;
        if (serverPlayerLocal.characterHeight !== undefined) localFuturePlayer.characterHeight = serverPlayerLocal.characterHeight;

        // 2. Tick-based reconciliation
        const lastProcessedTick = serverPlayerLocal.lastProcessedTick || 0;
        const currentEstimatedTick = this.localInputs.getEstimatedServerTick();

        if (lastProcessedTick > 0 && currentEstimatedTick > lastProcessedTick) {
            let currentState = {
                x: localFuturePlayer.x,
                y: localFuturePlayer.y,
                height: localFuturePlayer.height,
                horizontalVelocity: localFuturePlayer.horizontalVelocity,
                verticalVelocity: localFuturePlayer.verticalVelocity,
                facing: localFuturePlayer.facing,
                isJumping: localFuturePlayer.isJumping || localFuturePlayer.height > 0,
            };

            // Replay unprocessed inputs from inputHistory
            const replayRange = currentEstimatedTick - lastProcessedTick;
            let replayedCount = 0;
            let replayedWithMovement = 0;
            for (let tick = lastProcessedTick + 1; tick <= currentEstimatedTick; tick++) {
                const input = this.localInputs.inputHistory[tick];
                if (input) {
                    replayedCount++;
                    if (input.ArrowLeft || input.ArrowRight || input.ArrowUp) replayedWithMovement++;
                    currentState = this.simulatePlayerMovementFrame(currentState, input);
                }
            }

            // Also replay any unsent inputs still on deck
            const onDeckCount = this.inputsOnDeck.length;
            for (let i = 0; i < this.inputsOnDeck.length; i++) {
                currentState = this.simulatePlayerMovementFrame(currentState, this.inputsOnDeck[i]);
            }

            // Apply reconciled state
            localFuturePlayer.x = currentState.x;
            localFuturePlayer.y = currentState.y;
            localFuturePlayer.height = currentState.height;
            localFuturePlayer.horizontalVelocity = currentState.horizontalVelocity;
            localFuturePlayer.verticalVelocity = currentState.verticalVelocity;

            // Compute smoothing correction
            const prevAdjustment = this.localX_Adjustment;
            this.localX_Adjustment = futureClientPosition.x - localFuturePlayer.x;
            this.totalXBeenAdjusted = 0;

            // Debug log
            if (this._reconLogCount === undefined) this._reconLogCount = 0;
            if (this._reconLogCount < 30) {
                const delta = Math.round(futureClientPosition.x - serverPlayerLocal.x);
                console.log(`[RECONCILE] predicted=${Math.round(futureClientPosition.x)}, serverX=${Math.round(serverPlayerLocal.x)}, afterReplay=${Math.round(localFuturePlayer.x)}, correction=${Math.round(this.localX_Adjustment)}, delta=${delta}, replay=${replayedCount}/${replayRange}ticks(${replayedWithMovement}mov), onDeck=${onDeckCount}, lastProc=${lastProcessedTick}, estTick=${currentEstimatedTick}`);
                this._reconLogCount++;
            }

            // Prune old inputs
            this.localInputs.pruneInputsBefore(lastProcessedTick);
        } else {
            if (this._reconLogCount === undefined) this._reconLogCount = 0;
            if (this._reconLogCount < 30) {
                console.log(`[RECONCILE-SKIP] serverX=${Math.round(serverPlayerLocal.x)}, clientX=${Math.round(futureClientPosition.x)}, lastProc=${lastProcessedTick}, estTick=${currentEstimatedTick}, noReplay`);
                this._reconLogCount++;
            }
        }

        // Restore visual state
        Object.assign(localFuturePlayer, visualState);
    }

    // Simulate one tick of player movement — must match server logic exactly
    simulatePlayerMovementFrame(playerState, keysPressed) {
        const localPlayer = this.allPlayers.get(this.localPlayerId);
        const moveSpeed = localPlayer?.movementSpeed || this.MOVEMENT_SPEED;
        const jumpVel = localPlayer?.jumpVelocity || this.JUMP_VELOCITY;
        const gravity = this.GRAVITY;

        const newState = { ...playerState };

        // Handle jumping
        if (keysPressed.ArrowUp && !playerState.isJumping) {
            newState.verticalVelocity = jumpVel;
            newState.startJump = true;
        }

        // Handle horizontal movement
        if (!newState.isJumping) {
            if (keysPressed.ArrowLeft && !keysPressed.ArrowRight) {
                newState.horizontalVelocity = -moveSpeed;
            } else if (keysPressed.ArrowRight && !keysPressed.ArrowLeft) {
                newState.horizontalVelocity = moveSpeed;
            } else if (!keysPressed.ArrowRight && !keysPressed.ArrowLeft) {
                newState.horizontalVelocity = 0;
            } else if (keysPressed.ArrowRight && keysPressed.ArrowLeft) {
                newState.horizontalVelocity = 0;
            }
            if (keysPressed.ArrowDown && !newState.isCrouching) {
                newState.isCrouching = true;
            } else if (!keysPressed.ArrowDown) {
                newState.isCrouching = false;
            }
        }

        // Update position with time-scaled movement
        newState.x += newState.horizontalVelocity;
        newState.height -= newState.verticalVelocity;

        // Handle landing
        if (newState.height <= 0 && newState.isJumping) {
            newState.height = 0;
            newState.verticalVelocity = 0;
            newState.isJumping = false;
        } else if (newState.isJumping) {
            newState.verticalVelocity += gravity;
        }

        // Update y position based on height
        newState.y = this.FLOOR_Y - this.PLAYER_HEIGHT / (newState.isCrouching ? 2 : 1) - newState.height;
        if (newState.startJump) {
            newState.startJump = false;
            newState.isJumping = true;
        }
        return newState;
    }
    // Updated updateLocalPlayerGameLoop with smoother local prediction
    updateLocalPlayerGameLoop() {
        if (!this.localPlayerId) return;
        let player = this.allPlayers.get(this.localPlayerId);
        if (!player) return;

        // Check if player is on the ground or in the air
        const onGround = !this.isJumping;
        player.isJumping = this.isJumping;

        // console.log({
        //     "pcGL.currentTick Start": player.currentTick,
        //     "pcGL.currentFrame Start": player.currentFrame,
        //     x: player.x,
        //     y: player.y,
        //     height: player.height,
        //     horizontalVelocity: player.horizontalVelocity,
        //     verticalVelocity: player.verticalVelocity,
        //     facing: player.facing,
        //     isJumping: player.isJumping,
        // });
        this.inputsOnDeck.push({
            ...this.localInputs.keysPressed,
            frame: this.frame,
            serverTick: this.localInputs.getEstimatedServerTick(),
        });
        // Use character-specific stats, falling back to static constants
        const moveSpeed = player.movementSpeed || this.MOVEMENT_SPEED;
        const jumpVel = player.jumpVelocity || this.JUMP_VELOCITY;

        // Apply horizontal movement with time scaling
        if (onGround) {
            const keysPressed = this.localInputs.keysPressed;
            // Direct ground control
            if (keysPressed.ArrowLeft && !keysPressed.ArrowRight) {
                this.horizontalVelocity = -moveSpeed;
            } else if (keysPressed.ArrowRight && !keysPressed.ArrowLeft) {
                this.horizontalVelocity = moveSpeed;
            } else if (!keysPressed.ArrowRight && !keysPressed.ArrowLeft) {
                this.horizontalVelocity = 0;
            }
            if (keysPressed.ArrowUp) {
                // Apply jump if needed (only if on ground)
                this.isJumping = true;
                player.isJumping = this.isJumping;

                player.verticalVelocity = jumpVel;
            }

            //crouch
            if (keysPressed.ArrowDown && !player.isCrouching) {
                player.isCrouching = true;
            } else if (!keysPressed.ArrowDown) {
                player.isCrouching = false;
            }
        }

        // Apply horizontal velocity with smoothing
        player.x += this.horizontalVelocity;
        // Constrain player within boundaries //NEEDS TODO BETTER
        player.x = Math.max(0, Math.min(this.canvas.width - (player.characterWidth || this.PLAYER_WIDTH), player.x));
        const adj = this.localX_Adjustment != 0 ? Math.floor(this.localX_Adjustment / 3) : this.localX_Adjustment;
        this.totalXBeenAdjusted += adj;
        if (Math.abs(this.totalXBeenAdjusted) < Math.abs(this.localX_Adjustment)) {
            player.x += adj;
            if (this._smoothLogCount === undefined) this._smoothLogCount = 0;
            if (this._smoothLogCount < 20 && adj !== 0) {
                console.log(`[SMOOTH] adj=${adj}, totalAdj=${this.totalXBeenAdjusted}, target=${this.localX_Adjustment}, x=${Math.round(player.x)}, hVel=${this.horizontalVelocity}`);
                this._smoothLogCount++;
            }
        }

        // console.log({
        //     "Math.floor(this.localX_Adjustment / 3)": Math.floor(this.localX_Adjustment / 3),
        //     playerX: player.x,
        // });

        // Apply gravity and jumping physics with time scaling
        if (this.isJumping) {
            player.height -= player.verticalVelocity;
            player.verticalVelocity += this.GRAVITY;

            // Check if player has landed on the floor
            if (player.height <= 0) {
                player.height = 0;
                player.verticalVelocity = 0;
                this.isJumping = false;
                this.localInputs.isJumping = false;
                player.isJumping = false;
            }
            player.y = this.FLOOR_Y - this.PLAYER_HEIGHT - player.height;
        }
        // console.log({
        //     "pcGL.currentTick end": player.currentTick,
        //     "pcGL.currentFrame end": player.currentFrame,

        //     x: player.x,
        //     y: player.y,
        //     height: player.height,
        //     horizontalVelocity: player.horizontalVelocity,
        //     verticalVelocity: player.verticalVelocity,
        //     facing: player.facing,
        //     isJumping: player.isJumping,
        // });
    }

    gameLoop() {
        if (!this.isRunning) return; // Stop the loop if the flag is false

        // Debug current players
        // const localPlayer = this.allPlayers.get(this.localPlayerId);
        // const remotePlayers = Array.from(this.allPlayers.values()).filter((p) => p.id !== this.localPlayerId);

        // console.log({ frame: this.frame });
        if (this.frame - this.prevFrameSent == 3) {
            this.prevFrameSent = this.frame;
            const p = this.allPlayers.get(this.localPlayerId);
            // console.log({
            //     isMoving: p.isMoving,
            //     ArrowRight: this.localInputs.keysPressed["ArrowRight"],
            //     ArrowLeft: this.localInputs.keysPressed["ArrowLeft"],
            //     ArrowUp: this.localInputs.keysPressed["ArrowUp"],
            // });
            this.localInputs.sendBatch();
        }

        // Reconcile with the latest server state AFTER sendBatch
        // (ensures inputHistory is up to date and only one reconcile per frame)
        if (this.pendingServerState) {
            this.handleServerUpdateLocalPlayer(this.pendingServerState);
            this.pendingServerState = null;
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply interpolation to other players ONLY ONCE
        this.allPlayers.forEach((localPlayer) => {
            // Skip local localPlayer
            localPlayer.currentFrame = this.frame;
            if (localPlayer.id !== this.localPlayerId) {
                // Only interpolate remote players
                if (localPlayer.targetX !== undefined) {
                    localPlayer.x = localPlayer.targetX;
                }
                if (localPlayer.targetHeight !== undefined) {
                    localPlayer.height = localPlayer.targetHeight;
                    localPlayer.y = this.FLOOR_Y - this.PLAYER_HEIGHT - localPlayer.height;
                }
            }
        });
        // Update local player position for responsive feel
        this.updateLocalPlayerGameLoop();

        // Draw floor
        DrawFloor(this.ctx, this.canvas);

        // Draw all players
        this.allPlayers.forEach((player) => {
            // Draw player rectangle
            DrawPlayer(this.ctx, player);

            // Draw punching animation (arm extension)
            if (player.isPunching || (player.id === this.localPlayerId && this.isPunching)) {
                DrawPunch(this.ctx, player);
            }

            // Draw kicking animation (leg extension)
            if (player.isKicking || (player.id === this.localPlayerId && this.isKicking)) {
                DrawKick(this.ctx, player);
            }
            // Draw direction indicator (triangle pointing in the facing direction)
            DrawFaceDirection(this.ctx, player);

            // Highlight current player
            if (player.id === this.localPlayerId) {
                DrawYou(this.ctx, player);
            }
        });

        // Update player count
        this.myCanvas.status.textContent = `Connected Players: ${this.allPlayers.size}`;
        this.frame++;

        // Continue game loop
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }
}

export default GameLoop;
