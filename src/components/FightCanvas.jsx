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

export default function FightCanvas({ player1, player2, localPlayerId, allPlayers, matchStartData }) {
    const { socket } = useSocket();
    const canvasRef = useRef(null);
    const gameLoopRef = useRef(null);

    useEffect(() => {
        if (socket && canvasRef.current) {
            const latencyMonitor = new LatencyMonitor(socket);
            const inputBatcher = new InputBatchHandler(socket);
            inputBatcher.init(latencyMonitor);

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
            };
        }
    }, [socket]); // This effect runs once when the component is ready

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
