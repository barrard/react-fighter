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
    showReadyBanner = false,
    showMatchEnd = false,
    matchWinnerId = null,
    onRematch,
    onQuit,
    rematchPending = false,
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
            gameLoopRef.current.start();

            // --- 2. CLEANUP PHASE ---
            return () => {
                console.log("FightCanvas: Unmounting. Stopping game engine...");
                if (gameLoopRef.current) {
                    gameLoopRef.current.destroy(); // Clean up listeners on unmount
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

    const winnerLabel = () => {
        if (!matchWinnerId) return "Match Over";
        if (matchWinnerId === localPlayerId) return "You Win!";
        if (matchWinnerId === player1?.id) return `${player1?.character?.name || "Player 1"} Wins`;
        if (matchWinnerId === player2?.id) return `${player2?.character?.name || "Player 2"} Wins`;
        return "Match Over";
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
                {showReadyBanner && (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                        <div className="rounded-full bg-black/70 px-6 py-2 text-sm md:text-base font-semibold tracking-wide text-white">
                            Ready... waiting for sync
                        </div>
                    </div>
                )}
                {showMatchEnd && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                        <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-900/90 px-8 py-6 text-white shadow-xl">
                            <div className="text-2xl md:text-3xl font-bold">{winnerLabel()}</div>
                            {rematchPending && (
                                <div className="text-sm text-slate-300">Waiting for opponent...</div>
                            )}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                                    onClick={onRematch}
                                    disabled={rematchPending}
                                >
                                    Rematch
                                </button>
                                <button
                                    type="button"
                                    className="rounded-full bg-slate-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
                                    onClick={onQuit}
                                >
                                    Quit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div id="status">Connecting to server...</div>
                <div id="controls">Controls: Use ← and → arrow keys to move, ↑ to jump</div>
            </div>
        </div>
    );
}
