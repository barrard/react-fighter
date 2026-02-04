import React, { useRef, useEffect } from "react";
import { DrawPlayer, DrawFloor, DrawPunch, DrawKick } from "../game-engine/Draw";
import CONSTS from "../game-engine/contants";

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

    // Load character data once
    useEffect(() => {
        fetch(`${API_BASE}/characters`)
            .then((res) => res.json())
            .then((data) => {
                const char = data[0];
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
                if (keys.z && !player.isPunching && !player.isKicking) {
                    player.isPunching = true;
                    setTimeout(() => {
                        if (playerRef.current) playerRef.current.isPunching = false;
                    }, 200);
                }

                // Kicking (trigger on press, not hold)
                if (keys.x && !player.isKicking && !player.isPunching) {
                    player.isKicking = true;
                    setTimeout(() => {
                        if (playerRef.current) playerRef.current.isKicking = false;
                    }, 250);
                }

                // Draw player
                DrawPlayer(context, player);
                if (player.isPunching) DrawPunch(context, player);
                if (player.isKicking) DrawKick(context, player);
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
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Animation Test</h1>
            <div className="flex gap-4 mb-4 text-sm text-gray-600">
                <span><strong>Left/Right:</strong> Move</span>
                <span><strong>Down:</strong> Crouch</span>
                <span><strong>Up/Space:</strong> Jump</span>
                <span><strong>Z:</strong> Punch</span>
                <span><strong>X:</strong> Kick</span>
            </div>
            <canvas ref={canvasRef} width={CONSTS.CANVAS_WIDTH} height={CONSTS.CANVAS_HEIGHT} className="bg-blue-300 border-2 border-gray-400" />
        </div>
    );
};

export default AnimationTest;
