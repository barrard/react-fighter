// src/components/FightCanvas.jsx

import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";

// UI Components
import { Progress } from "@/components/ui/progress";
import { Swords } from "lucide-react";

// Game Engine Imports
import GameLoop from "../game-engine/GameLoop";
import Canvas from "../game-engine/Canvas";
import InputBatchHandler from "../game-engine/InputBatchHandler";
import { getLatencyMonitor } from "../game-engine/latencySingleton";

export default function FightCanvas({
    player1,
    player2,
    localPlayerId,
    allPlayers,
    matchStartData,
    onCanvasReady,
    timerSeconds = 99,
    roundNumber = 0,
    roundScores,
    roundOutcome = null,
    roundWinnerId = null,
}) {
    const { socket } = useSocket();
    const canvasRef = useRef(null);
    const gameLoopRef = useRef(null);
    const inputBatcherRef = useRef(null);
    const readySentRef = useRef(false);
    const [hudHealth, setHudHealth] = useState({ p1: 100, p2: 100 });
    const maxWins = 3;

    const getHealthPercent = (playerId) => {
        if (!playerId) return 100;
        const p = allPlayers?.get?.(playerId);
        if (!p) return 100;
        const maxHealth = p.maxHealth || 100;
        const health = Math.max(0, Math.min(p.health ?? maxHealth, maxHealth));
        return maxHealth > 0 ? Math.round((health / maxHealth) * 100) : 0;
    };

    useEffect(() => {
        if (socket && canvasRef.current) {
            const latencyMonitor = getLatencyMonitor(socket);
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
        if (inputBatcherRef.current && gameLoopRef.current && matchStartData == null) {
            inputBatcherRef.current.resetForRound();
            if (gameLoopRef.current.isRunning) {
                gameLoopRef.current.stop();
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

    useEffect(() => {
        if (!allPlayers) return;
        let isMounted = true;
        const timer = setInterval(() => {
            if (!isMounted) return;
            const next = {
                p1: getHealthPercent(player1?.id),
                p2: getHealthPercent(player2?.id),
            };
            setHudHealth((prev) => {
                if (prev.p1 === next.p1 && prev.p2 === next.p2) return prev;
                return next;
            });
        }, 100);
        return () => {
            isMounted = false;
            clearInterval(timer);
        };
    }, [allPlayers, player1?.id, player2?.id]);

    const renderScoreMarks = (wins = 0) => {
        const marks = [];
        for (let i = 0; i < maxWins; i += 1) {
            const filled = i < wins;
            marks.push(
                <span
                    key={i}
                    className={`h-2 w-2 rounded-full ${filled ? "bg-emerald-400" : "bg-slate-600"}`}
                />
            );
        }
        return <div className="flex items-center gap-1">{marks}</div>;
    };

    // The JSX for rendering the UI remains exactly the same
    return (
        <div className="space-y-4">
            {/* Player Info and Health Bars */}
            <div className="flex justify-between items-center gap-4 p-2 bg-slate-900/50 rounded-lg">
                <div className="w-full space-y-2">
                    <div className="flex justify-between font-bold text-lg">
                        <span>{player1?.character?.name || "Player 1"}</span>
                        <span className="flex items-center gap-2">
                            {renderScoreMarks(roundScores?.player1Wins)}
                            P1
                        </span>
                    </div>
                    <Progress value={hudHealth.p1} className="h-6 [&>div]:bg-red-500" />
                </div>
                <div className="flex flex-col items-center">
                    <Swords />
                    <div className="text-5xl font-mono bg-slate-800 px-4 py-1 rounded">{timerSeconds}</div>
                </div>
                <div className="w-full space-y-2">
                    <div className="flex justify-between font-bold text-lg">
                        <span className="flex items-center gap-2">
                            P2
                            {renderScoreMarks(roundScores?.player2Wins)}
                        </span>
                        <span>{player2?.character?.name || "Player 2"}</span>
                    </div>
                    <Progress value={hudHealth.p2} className="h-6 [&>div]:bg-red-500" />
                </div>
            </div>
            {roundNumber > 0 && roundScores && (
                <div className="flex justify-between text-sm text-slate-300">
                    <span>Round {roundNumber}</span>
                    <span>
                        P1 {roundScores.player1Wins} - {roundScores.player2Wins} P2
                    </span>
                </div>
            )}
            {roundOutcome && (
                <div className="text-center text-sm text-slate-200">
                    {roundOutcome === "draw"
                        ? "Round ended in a draw"
                        : `Round winner: ${roundWinnerId === localPlayerId ? "You" : "Opponent"}`}
                </div>
            )}
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
