// import CONSTS from "/js/contants.js";
import CONSTS from "./contants.js";
import { decodeGameStatePayload } from "@shared/stateCodec.js";
import { ATTACK_TYPES, isPunch, isKick, getAttackTypeName } from "@shared/attackTypes.js";
import { BASE_STATS } from "@shared/Characters.js";
import {
    DrawPlayer,
    DrawHealthBar,
    DrawAttack,
    DrawFaceDirection,
    DrawYou,
    DrawFloor,
    DrawInitialScene,
} from "./Draw.js";
// import { DrawPlayer, DrawPunch, DrawKick, DrawFaceDirection, DrawYou, DrawFloor, DrawInitialScene  } from "http://localhost:3000/js/Draw.js";

class GameLoop {
    constructor(myCanvas, socket, inputBatcher, localPlayerId, allPlayers) {
        this.socket = socket;
        this.localInputs = inputBatcher;
        this.myCanvas = myCanvas;
        this.canvas = myCanvas.canvas;
        this.ctx = this.canvas.getContext("2d");
        this.debugNet = import.meta.env.VITE_DEBUG_NET === "true";
        this.lastNetDebugAt = 0;

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
            FLOOR_HEIGHT,
            GRAVITY,
            SERVER_TICK_RATE,
            CANVAS_HEIGHT,
        } = CONSTS;

        this.FLOOR_Y = CANVAS_HEIGHT - FLOOR_HEIGHT;
        this.GRAVITY = GRAVITY;
        this.SERVER_TICK_RATE = SERVER_TICK_RATE;

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
        // Defer starting the loop until matchStart is applied

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

        this.onPlayerKicked = (id) => {
            const player = this.allPlayers.get(id);
            if (player) {
                player.isKicking = true;
                player.kickStartTime = Date.now();

                // Reset kick after animation duration
                setTimeout(() => {
                    player.isKicking = false;
                }, KICK_DURATION);
            }
        };
        this.socket.on("playerKicked", this.onPlayerKicked);

        // Handle player leaving
        this.onPlayerLeft = (id) => {
            // console.log("Player left:", id);
            this.allPlayers.delete(id);
        };
        this.socket.on("playerLeft", this.onPlayerLeft);

        // Modify the gameState handler for other players
        this.onGameState = (rawData) => {
            const data = decodeGameStatePayload(rawData);
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
                        // Snapshot the current drawn position as the lerp start
                        otherPlayer.prevX = otherPlayer.x;
                        otherPlayer.prevHeight = otherPlayer.height || 0;
                        otherPlayer.snapshotTime = performance.now();

                        // Set the new target
                        otherPlayer.targetX = serverPlayer.x;
                        otherPlayer.targetHeight = serverPlayer.height || 0;
                        otherPlayer.isJumping = serverPlayer.isJumping || false;
                        otherPlayer.isCrouching = serverPlayer.isCrouching || false;
                        if (serverPlayer.isCrouching) {
                            console.log("Remote player crouching:", serverPlayer.id, serverPlayer.isCrouching);
                        }
                        otherPlayer.health = serverPlayer.health;
                        if (serverPlayer.maxHealth !== undefined) {
                            otherPlayer.maxHealth = serverPlayer.maxHealth;
                        }

                        // Update other properties that don't need interpolation
                        otherPlayer.facing = serverPlayer.facing;

                        // Update attack state from server
                        otherPlayer.isPunching = serverPlayer.isPunching || false;
                        otherPlayer.isKicking = serverPlayer.isKicking || false;
                        otherPlayer.currentAttackType = serverPlayer.currentAttackType || ATTACK_TYPES.NONE;
                    }
                }
            });
            if (this.debugNet) {
                const now = performance.now();
                if (now - this.lastNetDebugAt > 1000) {
                    this.lastNetDebugAt = now;
                    const localPlayer = data.players.find((p) => p.id === this.localPlayerId);
                    const estTick = this.localInputs.getEstimatedServerTick();
                    if (localPlayer) {
                        const lastProcessedTick = localPlayer.lastProcessedTick ?? 0;
                        console.log(
                            `[CLIENT GS] simTick=${data.simulationTick} lastProc=${lastProcessedTick} estTick=${estTick} delta=${estTick - lastProcessedTick}`
                        );
                    } else {
                        console.log(
                            `[CLIENT GS] simTick=${data.simulationTick} estTick=${estTick} players=${data.players.length}`
                        );
                    }
                }
            }
        };
        this.socket.on("gs", this.onGameState);

        // Update your sendInputState function to include timestamp

        // Handle connection to the server
        // this.socket.on("connect", (s) => {
        //     console.log(s);
        //     this.localPlayerId = this.socket.id;

        //     console.log("Connected to server with ID:", this.socket.id);
        //     this.myCanvas.status.textContent = "Connected! Use arrow keys to move.";
        // });

        // Handle disconnection
        this.onDisconnect = () => {
            console.log("Disconnected from server");
            this.myCanvas.status.textContent = "Disconnected from server. Trying to reconnect...";
        };
        this.socket.on("disconnect", this.onDisconnect);
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

    destroy() {
        this.stop();
        if (this.onPlayerKicked) this.socket.off("playerKicked", this.onPlayerKicked);
        if (this.onPlayerLeft) this.socket.off("playerLeft", this.onPlayerLeft);
        if (this.onGameState) this.socket.off("gs", this.onGameState);
        if (this.onDisconnect) this.socket.off("disconnect", this.onDisconnect);
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
        localFuturePlayer.y = this.FLOOR_Y - localFuturePlayer.characterHeight - localFuturePlayer.height;
        localFuturePlayer.horizontalVelocity = serverPlayerLocal.horizontalVelocity || 0;
        localFuturePlayer.verticalVelocity = serverPlayerLocal.verticalVelocity || 0;
        localFuturePlayer.isJumping = serverPlayerLocal.isJumping || false;
        if (serverPlayerLocal.facing) {
            localFuturePlayer.facing = serverPlayerLocal.facing;
        }

        // Sync health from server (stateCodec transmits health)
        if (serverPlayerLocal.health !== undefined) localFuturePlayer.health = serverPlayerLocal.health;

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
            for (let tick = lastProcessedTick + 1; tick <= currentEstimatedTick; tick++) {
                const input = this.localInputs.inputHistory[tick];
                if (input) {
                    currentState = this.simulatePlayerMovementFrame(currentState, input);
                }
            }

            // Also replay any unsent inputs still on deck
            for (let i = 0; i < this.inputsOnDeck.length; i++) {
                currentState = this.simulatePlayerMovementFrame(currentState, this.inputsOnDeck[i]);
            }

            // Apply reconciled state
            localFuturePlayer.x = this.clampX(currentState.x);
            localFuturePlayer.y = currentState.y;
            localFuturePlayer.height = currentState.height;
            localFuturePlayer.horizontalVelocity = currentState.horizontalVelocity;
            localFuturePlayer.verticalVelocity = currentState.verticalVelocity;

            // Compute smoothing correction
            this.localX_Adjustment = futureClientPosition.x - localFuturePlayer.x;
            this.totalXBeenAdjusted = 0;

            // Uncomment for reconciliation debugging:
            // console.log(`[RECONCILE] predicted=${Math.round(futureClientPosition.x)}, serverX=${Math.round(serverPlayerLocal.x)}, afterReplay=${Math.round(localFuturePlayer.x)}, correction=${Math.round(this.localX_Adjustment)}, lastProc=${lastProcessedTick}, estTick=${currentEstimatedTick}`);

            // Prune old inputs
            this.localInputs.pruneInputsBefore(lastProcessedTick);
        }

        // Restore visual state
        Object.assign(localFuturePlayer, visualState);
    }

    // Simulate one tick of player movement — must match server logic exactly
    simulatePlayerMovementFrame(playerState, keysPressed) {
        const localPlayer = this.allPlayers.get(this.localPlayerId);
        const moveSpeed = localPlayer.movementSpeed;
        const jumpVel = localPlayer.jumpVelocity;
        const gravity = this.GRAVITY;

        const newState = { ...playerState };

        // Handle jumping
        if (keysPressed.jump && !playerState.isJumping) {
            newState.verticalVelocity = jumpVel;
            newState.startJump = true;
        }

        // Handle horizontal movement
        if (!newState.isJumping) {
            if (keysPressed.left && !keysPressed.right) {
                newState.horizontalVelocity = -moveSpeed;
            } else if (keysPressed.right && !keysPressed.left) {
                newState.horizontalVelocity = moveSpeed;
            } else if (!keysPressed.right && !keysPressed.left) {
                newState.horizontalVelocity = 0;
            } else if (keysPressed.right && keysPressed.left) {
                newState.horizontalVelocity = 0;
            }
            if (keysPressed.crouch && !newState.isCrouching) {
                newState.isCrouching = true;
            } else if (!keysPressed.crouch) {
                newState.isCrouching = false;
            }
        }

        // Update position with time-scaled movement
        newState.x += newState.horizontalVelocity;
        newState.x = this.clampX(newState.x);
        newState.height -= newState.verticalVelocity;

        // Handle landing
        if (newState.height <= 0 && newState.isJumping) {
            newState.height = 0;
            newState.verticalVelocity = 0;
            newState.isJumping = false;
        } else if (newState.isJumping) {
            newState.verticalVelocity += gravity;
        }

        // Update y position based on height (use localPlayer's characterHeight)
        // Crouch is purely visual - doesn't affect physics y position
        newState.y = this.FLOOR_Y - localPlayer.characterHeight - newState.height;
        if (newState.startJump) {
            newState.startJump = false;
            newState.isJumping = true;
        }
        return newState;
    }

    clampX(x) {
        const localPlayer = this.allPlayers.get(this.localPlayerId);
        const width = localPlayer?.characterWidth || 50;
        const canvasWidth = this.canvas?.width || CONSTS.CANVAS_WIDTH;
        const maxX = Math.max(0, canvasWidth - width);
        return Math.max(0, Math.min(maxX, x));
    }
    // Updated updateLocalPlayerGameLoop with smoother local prediction
    updateLocalPlayerGameLoop() {
        if (!this.localPlayerId) return;
        if (!this.localInputs.isMatchStarted) return;
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
        // Use character-specific stats from player object
        const moveSpeed = player.movementSpeed;
        const jumpVel = player.jumpVelocity;

        // Apply horizontal movement with time scaling
        if (onGround) {
            const keysPressed = this.localInputs.keysPressed;
            // Direct ground control
            if (keysPressed.left && !keysPressed.right) {
                this.horizontalVelocity = -moveSpeed;
            } else if (keysPressed.right && !keysPressed.left) {
                this.horizontalVelocity = moveSpeed;
            } else if (!keysPressed.right && !keysPressed.left) {
                this.horizontalVelocity = 0;
            }
            if (keysPressed.jump) {
                // Apply jump if needed (only if on ground)
                this.isJumping = true;
                player.isJumping = this.isJumping;

                player.verticalVelocity = jumpVel;
            }

            //crouch
            if (keysPressed.crouch && !player.isCrouching) {
                player.isCrouching = true;
            } else if (!keysPressed.crouch) {
                player.isCrouching = false;
            }
        }

        // Local prediction for directional attack animations
        const keys = this.localInputs.keysPressed;
        const attackType = keys.attackType || ATTACK_TYPES.NONE;
        if (attackType !== ATTACK_TYPES.NONE && !player.currentAttackType) {
            const typeName = getAttackTypeName(attackType);
            const attackStats = BASE_STATS.attacks[typeName];
            const duration = attackStats?.duration || (isPunch(attackType) ? player.punchDuration : player.kickDuration) || 300;

            player.currentAttackType = attackType;
            player.isPunching = isPunch(attackType);
            player.isKicking = isKick(attackType);

            setTimeout(() => {
                player.currentAttackType = ATTACK_TYPES.NONE;
                player.isPunching = false;
                player.isKicking = false;
            }, duration);
        }

        // Apply horizontal velocity with smoothing
        player.x += this.horizontalVelocity;
        // Constrain player within boundaries
        player.x = this.clampX(player.x);
        const adj = this.localX_Adjustment != 0 ? Math.floor(this.localX_Adjustment / 3) : this.localX_Adjustment;
        this.totalXBeenAdjusted += adj;
        if (Math.abs(this.totalXBeenAdjusted) < Math.abs(this.localX_Adjustment)) {
            player.x += adj;
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
            player.y = this.FLOOR_Y - player.characterHeight - player.height;
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

        const now = performance.now();

        // Update any round-end animation timers
        this.allPlayers.forEach((player) => {
            if (!player) return;
            const animation = player.roundAnimation;
            if (!animation) {
                player.isCelebrating = false;
                player.isKnockedDown = false;
                player.roundAnimationElapsed = 0;
                return;
            }
            if (animation.startTime == null) {
                animation.startTime = now;
            }
            if (animation.duration && !animation.expiresAt) {
                animation.expiresAt = animation.startTime + animation.duration;
            }
            const elapsed = Math.max(0, now - (animation.startTime || now));
            const expiresAt = animation.expiresAt;
            if (expiresAt && now >= expiresAt) {
                player.roundAnimation = null;
                player.isCelebrating = false;
                player.isKnockedDown = false;
                player.roundAnimationElapsed = 0;
                return;
            }
            player.roundAnimationElapsed = elapsed;
            player.isCelebrating = animation.type === "celebrate";
            player.isKnockedDown = animation.type === "knockdown";
        });

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Interpolate remote players between their last two server snapshots
        // Server sends updates every 3 ticks at 60Hz = every 50ms
        const SNAPSHOT_INTERVAL_MS = (3 / this.SERVER_TICK_RATE) * 1000;
        this.allPlayers.forEach((localPlayer) => {
            localPlayer.currentFrame = this.frame;
            if (localPlayer.id !== this.localPlayerId && localPlayer.snapshotTime !== undefined) {
                const elapsed = now - localPlayer.snapshotTime;
                const t = Math.min(elapsed / SNAPSHOT_INTERVAL_MS, 1);

                if (localPlayer.targetX !== undefined && localPlayer.prevX !== undefined) {
                    localPlayer.x = localPlayer.prevX + (localPlayer.targetX - localPlayer.prevX) * t;
                }
                if (localPlayer.targetHeight !== undefined && localPlayer.prevHeight !== undefined) {
                    localPlayer.height = localPlayer.prevHeight + (localPlayer.targetHeight - localPlayer.prevHeight) * t;
                    localPlayer.y = this.FLOOR_Y - localPlayer.characterHeight - localPlayer.height;
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
            DrawPlayer(this.ctx, player, now);
            DrawHealthBar(this.ctx, player);

            // Draw attack animations (directional punch/kick)
            const attackType = player.currentAttackType || ATTACK_TYPES.NONE;
            const hasRoundAnimation = Boolean(player.roundAnimation);
            if (
                !hasRoundAnimation &&
                (attackType !== ATTACK_TYPES.NONE || player.isPunching || player.isKicking)
            ) {
                DrawAttack(this.ctx, player);
            }

            // Draw direction indicator (eyes on head)
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
