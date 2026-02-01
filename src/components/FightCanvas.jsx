// src/components/FightCanvas.jsx

import { useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";

// UI Components
import { Progress } from "@/components/ui/progress";
import { Swords } from "lucide-react";

// Game Engine Imports
import GameLoop from "../game-engine/GameLoop";
import Canvas from "../game-engine/Canvas";
import InputBatchHandler from "../game-engine/InputBatchHandler";
import LatencyMonitor from "../game-engine/LatencyMonitor";

export default function FightCanvas({ player1, player2, localPlayerId, allPlayers, matchStartData, onCanvasReady }) {
    const { socket } = useSocket();
    const canvasRef = useRef(null);
    const gameLoopRef = useRef(null);
    const inputBatcherRef = useRef(null);
    const readySentRef = useRef(false);

    useEffect(() => {
        if (socket && canvasRef.current) {
            const latencyMonitor = new LatencyMonitor(socket);
            const inputBatcher = new InputBatchHandler(socket);
            inputBatcher.init(latencyMonitor);
            inputBatcherRef.current = inputBatcher;

            if (matchStartData) {
                inputBatcher.applyMatchStart(matchStartData);
            }

            // --- 1. SETUP PHASE ---
            console.log("Game Engine: Initializing in FightCanvas...");
            // We simply create the instance of GameLoop.
            // Its own constructor and socket listeners will handle starting the game.
            gameLoopRef.current = new GameLoop(
                new Canvas(socket, canvasRef.current),
                socket,
                inputBatcher,
                localPlayerId,
                allPlayers
            );

            // --- 2. CLEANUP PHASE ---
            return () => {
                console.log("FightCanvas: Unmounting. Stopping game engine...");
                if (gameLoopRef.current) {
                    gameLoopRef.current.stop(); // Call the new stop method
                }
                if (inputBatcherRef.current) {
                    inputBatcherRef.current.destroy();
                    inputBatcherRef.current = null;
                }
            };
        }
    }, [socket]); // This effect runs once when the component is ready

    useEffect(() => {
        if (matchStartData && inputBatcherRef.current) {
            inputBatcherRef.current.applyMatchStart(matchStartData);
            if (gameLoopRef.current && !gameLoopRef.current.isRunning) {
                gameLoopRef.current.start();
            }
        }
    }, [matchStartData]);

    useEffect(() => {
        if (!canvasRef.current || readySentRef.current) return;
        let attempts = 0;
        const MAX_ATTEMPTS = 5;
        const checkReady = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const ready = canvas.width > 0 && canvas.height > 0 && rect.width > 0 && rect.height > 0;
            if (ready) {
                readySentRef.current = true;
                if (typeof onCanvasReady === "function") {
                    onCanvasReady();
                }
                return;
            }
            attempts += 1;
            if (attempts < MAX_ATTEMPTS) {
                requestAnimationFrame(checkReady);
            }
        };
        requestAnimationFrame(checkReady);
    }, [onCanvasReady]);

    // The JSX for rendering the UI remains exactly the same
    return (
        <div className="space-y-4">
            {/* Player Info and Health Bars */}
            <div className="flex justify-between items-center gap-4 p-2 bg-slate-900/50 rounded-lg">
                <div className="w-full space-y-2">
                    <div className="flex justify-between font-bold text-lg">
                        <span>{player1.character?.name}</span>
                        <span>P1</span>
                    </div>
                    <Progress value={100} className="h-6 [&>div]:bg-red-500" />
                </div>
                <div className="flex flex-col items-center">
                    <Swords />
                    <div className="text-5xl font-mono bg-slate-800 px-4 py-1 rounded">99</div>
                </div>
                <div className="w-full space-y-2">
                    <div className="flex justify-between font-bold text-lg">
                        <span>P2</span>
                        <span>{player2.character?.name}</span>
                    </div>
                    <Progress value={100} className="h-6 [&>div]:bg-red-500" />
                </div>
            </div>
            {/* The Game Canvas */}
            <div className="relative w-full aspect-video bg-gray-900 rounded-md overflow-hidden">
                <canvas
                    ref={canvasRef}
                    id="game-canvas"
                    className="absolute top-0 left-0 w-full h-full"
                    width="1024"
                    height="576"
                />
                <div id="status">Connecting to server...</div>
                <div id="controls">Controls: Use ← and → arrow keys to move, ↑ to jump</div>
            </div>
        </div>
    );
}
