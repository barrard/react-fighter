import React, { useRef, useEffect } from "react";
import { DrawPlayer, DrawFloor, DrawAttack } from "../game-engine/Draw";
import CONSTS from "../game-engine/contants";
import { ATTACK_TYPES, isPunch, isKick, isRanged } from "@shared/attackTypes.js";
import { createComboState, updateForwardComboState, consumeRangedCombo } from "@shared/comboSystem.js";
import { getProjectileSpawnTick } from "@shared/projectileSim.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const AnimationTest = () => {
    const canvasRef = useRef(null);
    const playerRef = useRef(null);
    const keysRef = useRef({
        left: false,
        right: false,
        down: false,
        jump: false,
        jumpPressed: false, // Track if jump was just pressed this frame
        z: false,
        x: false,
    });
    const comboStateRef = useRef(createComboState());
    const previousInputRef = useRef({ left: false, right: false, jump: false, crouch: false, attackType: ATTACK_TYPES.NONE });

    // Load character data once
    useEffect(() => {
        fetch(`${API_BASE}/characters`)
            .then((res) => res.json())
            .then((data) => {
                const char = data.find((entry) => entry.stats?.rangedAttack) || data[0];
                const stats = char.stats;
                playerRef.current = {
                    ...stats,
                    id: "player1",
                    x: 100,
                    y: CONSTS.CANVAS_HEIGHT - CONSTS.FLOOR_HEIGHT - stats.height,
                    color: char.color,
                    characterWidth: stats.width,
                    characterHeight: stats.height,
                    isCrouching: false,
                    horizontalVelocity: 0,
                    verticalVelocity: 0,
                    isJumping: false,
                    isPunching: false,
                    isKicking: false,
                    currentAttackType: ATTACK_TYPES.NONE,
                    facing: "right",
                };
            })
            .catch((err) => console.error("Failed to load characters:", err));
    }, []);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            switch (e.code) {
                case "ArrowLeft":
                    keysRef.current.left = true;
                    break;
                case "ArrowRight":
                    keysRef.current.right = true;
                    break;
                case "ArrowDown":
                    keysRef.current.down = true;
                    break;
                case "ArrowUp":
                case "Space":
                    e.preventDefault();
                    if (!keysRef.current.jump) {
                        keysRef.current.jumpPressed = true;
                    }
                    keysRef.current.jump = true;
                    break;
                case "KeyZ":
                    keysRef.current.z = true;
                    break;
                case "KeyX":
                    keysRef.current.x = true;
                    break;
            }
        };

        const handleKeyUp = (e) => {
            switch (e.code) {
                case "ArrowLeft":
                    keysRef.current.left = false;
                    break;
                case "ArrowRight":
                    keysRef.current.right = false;
                    break;
                case "ArrowDown":
                    keysRef.current.down = false;
                    break;
                case "ArrowUp":
                case "Space":
                    keysRef.current.jump = false;
                    break;
                case "KeyZ":
                    keysRef.current.z = false;
                    break;
                case "KeyX":
                    keysRef.current.x = false;
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    // Animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        const GRAVITY = 0.8;
        const GROUND_Y = CONSTS.CANVAS_HEIGHT - CONSTS.FLOOR_HEIGHT;
        let animationFrameId;
        let isRunning = true;

        const render = () => {
            if (!isRunning) return;

            context.clearRect(0, 0, canvas.width, canvas.height);
            DrawFloor(context, canvas);

            const player = playerRef.current;
            if (player) {
                const keys = keysRef.current;
                const comboTick = Math.floor(performance.now() / (1000 / 60));

                // Crouching
                player.isCrouching = keys.down && !player.isJumping;

                // Horizontal movement
                const speed = player.movementSpeed || 5;
                if (keys.left && !player.isCrouching) {
                    player.horizontalVelocity = -speed;
                    player.facing = "left";
                } else if (keys.right && !player.isCrouching) {
                    player.horizontalVelocity = speed;
                    player.facing = "right";
                } else {
                    player.horizontalVelocity = 0;
                }

                // Apply horizontal movement
                player.x += player.horizontalVelocity;

                // Keep player in bounds
                if (player.x < 0) player.x = 0;
                if (player.x > canvas.width - player.characterWidth) {
                    player.x = canvas.width - player.characterWidth;
                }

                // Jumping - only trigger on fresh key press
                if (keys.jumpPressed && !player.isJumping) {
                    player.isJumping = true;
                    player.verticalVelocity = -(player.jumpVelocity || 15);
                }
                keys.jumpPressed = false; // Consume the press

                // Apply gravity
                if (player.isJumping) {
                    player.verticalVelocity += GRAVITY;
                    player.y += player.verticalVelocity;

                    // Land on ground
                    const groundLevel = GROUND_Y - player.characterHeight;
                    if (player.y >= groundLevel) {
                        player.y = groundLevel;
                        player.isJumping = false;
                        player.verticalVelocity = 0;
                    }
                }

                // Punching (trigger on press, not hold)
                if (keys.z && player.currentAttackType === ATTACK_TYPES.NONE) {
                    const attackType = keys.jump ? ATTACK_TYPES.HIGH_PUNCH : keys.down ? ATTACK_TYPES.LOW_PUNCH : ATTACK_TYPES.MID_PUNCH;
                    player.currentAttackType = attackType;
                    player.isPunching = true;
                    previousInputRef.current.attackType = attackType;
                    setTimeout(() => {
                        if (playerRef.current) {
                            playerRef.current.isPunching = false;
                            playerRef.current.currentAttackType = ATTACK_TYPES.NONE;
                        }
                        previousInputRef.current.attackType = ATTACK_TYPES.NONE;
                    }, player.attacks?.highPunch?.duration || 250);
                }

                // Kicking (trigger on press, not hold)
                if (keys.x && player.currentAttackType === ATTACK_TYPES.NONE) {
                    updateForwardComboState(
                        comboStateRef.current,
                        { left: keys.left, right: keys.right },
                        previousInputRef.current,
                        player.facing,
                        comboTick
                    );
                    const wantsRanged = player.rangedAttack &&
                        consumeRangedCombo(comboStateRef.current, comboTick);
                    const attackType = wantsRanged
                        ? ATTACK_TYPES.RANGED
                        : keys.jump ? ATTACK_TYPES.HIGH_KICK : keys.down ? ATTACK_TYPES.LOW_KICK : ATTACK_TYPES.MID_KICK;
                    player.currentAttackType = attackType;
                    player.isPunching = isPunch(attackType);
                    player.isKicking = isKick(attackType);
                    player.isRangedAttacking = isRanged(attackType);
                    player.attackStartTick = comboTick;
                    if (wantsRanged) {
                        player.projectileSpawnX = player.facing === "right"
                            ? player.x + (player.rangedAttack?.xOffset || player.characterWidth)
                            : player.x - (player.rangedAttack?.xOffset || player.characterWidth);
                        player.projectileSpawnHeight = player.height;
                        player.projectileSpawnTick = getProjectileSpawnTick(player.attackStartTick, player.rangedAttack);
                    }
                    previousInputRef.current.attackType = attackType;
                    setTimeout(() => {
                        if (playerRef.current) {
                            playerRef.current.isKicking = false;
                            playerRef.current.isPunching = false;
                            playerRef.current.isRangedAttacking = false;
                            playerRef.current.currentAttackType = ATTACK_TYPES.NONE;
                            playerRef.current.attackStartTick = null;
                            playerRef.current.projectileSpawnX = null;
                            playerRef.current.projectileSpawnHeight = null;
                            playerRef.current.projectileSpawnTick = null;
                        }
                        previousInputRef.current.attackType = ATTACK_TYPES.NONE;
                    }, wantsRanged ? player.rangedAttack.duration : player.attacks?.midKick?.duration || 250);
                }

                updateForwardComboState(
                    comboStateRef.current,
                    { left: keys.left, right: keys.right },
                    previousInputRef.current,
                    player.facing,
                    comboTick
                );
                previousInputRef.current.left = keys.left;
                previousInputRef.current.right = keys.right;
                previousInputRef.current.crouch = keys.down;
                previousInputRef.current.jump = keys.jump;

                // Draw player
                const frameTime = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
                DrawPlayer(context, player, frameTime);
                if (player.currentAttackType !== ATTACK_TYPES.NONE) DrawAttack(context, player, comboTick);
            }
            animationFrameId = window.requestAnimationFrame(render);
        };

        render();

        return () => {
            isRunning = false;
            window.cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="h-full flex flex-col gap-2 overflow-hidden">
            <div className="flex-shrink-0 flex items-center gap-6">
                <h1 className="text-xl font-bold">Animation Test</h1>
                <div className="flex gap-4 text-sm text-gray-600">
                    <span><strong>←/→:</strong> Move</span>
                    <span><strong>↓:</strong> Crouch</span>
                    <span><strong>↑/Space:</strong> Jump</span>
                    <span><strong>Z:</strong> Punch</span>
                    <span><strong>X:</strong> Kick</span>
                    <span><strong>→→ or ←← + X:</strong> Ranged</span>
                </div>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={CONSTS.CANVAS_WIDTH}
                    height={CONSTS.CANVAS_HEIGHT}
                    className="bg-blue-300 border-2 border-gray-400"
                    style={{ aspectRatio: `${CONSTS.CANVAS_WIDTH}/${CONSTS.CANVAS_HEIGHT}`, maxWidth: "100%", maxHeight: "100%" }}
                />
            </div>
        </div>
    );
};

export default AnimationTest;
