// src/components/FightCanvas.jsx

import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";

// UI Components
import { Progress } from "@/components/ui/progress";
import { Swords } from "lucide-react";

// Game Engine Imports
import { useGameEngine } from "../game-engine/useGameEngine";

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
    const readySentRef = useRef(false);
    const [hudHealth, setHudHealth] = useState({ p1: 100, p2: 100 });

    const { inputBatcherRef } = useGameEngine({ socket, canvasRef, allPlayers, localPlayerId, matchStartData });
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

    return (
        <div className="h-full flex flex-col gap-1 overflow-hidden">
            {/* HUD: Health Bars + Timer */}
            <div className="flex-shrink-0 flex justify-between items-center gap-4 px-2 py-1 bg-slate-900/50 rounded-lg">
                <div className="w-full space-y-1">
                    <div className="flex justify-between font-bold text-sm">
                        <span>{player1?.character?.name || "Player 1"}</span>
                        <span className="flex items-center gap-1">
                            {renderScoreMarks(roundScores?.player1Wins)}
                            P1
                        </span>
                    </div>
                    <Progress value={hudHealth.p1} className="h-4 [&>div]:bg-red-500" />
                </div>
                <div className="flex flex-col items-center flex-shrink-0">
                    <Swords className="h-4 w-4" />
                    <div className="text-3xl font-mono bg-slate-800 px-3 py-0.5 rounded leading-tight">{timerSeconds}</div>
                    {roundNumber > 0 && (
                        <div className="text-xs text-slate-400">Rd {roundNumber}</div>
                    )}
                </div>
                <div className="w-full space-y-1">
                    <div className="flex justify-between font-bold text-sm">
                        <span className="flex items-center gap-1">
                            P2
                            {renderScoreMarks(roundScores?.player2Wins)}
                        </span>
                        <span>{player2?.character?.name || "Player 2"}</span>
                    </div>
                    <Progress value={hudHealth.p2} className="h-4 [&>div]:bg-red-500" />
                </div>
            </div>

            {roundOutcome && (
                <div className="flex-shrink-0 text-center text-xs text-slate-200">
                    {roundOutcome === "draw"
                        ? "Round ended in a draw"
                        : `Round winner: ${roundWinnerId === localPlayerId ? "You" : "Opponent"}`}
                </div>
            )}

            {/* Game Canvas - fills remaining space, maintains 16:9 */}
            <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                <div
                    className="relative bg-gray-900 rounded-md overflow-hidden"
                    style={{ aspectRatio: "16/9", maxWidth: "100%", maxHeight: "100%", width: "100%" }}
                >
                    <canvas
                        ref={canvasRef}
                        id="game-canvas"
                        className="absolute inset-0 w-full h-full"
                        width="1024"
                        height="576"
                    />
                    {showReadyBanner && (
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                            <div className="rounded-full bg-black/70 px-6 py-2 text-sm font-semibold tracking-wide text-white">
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
                </div>
            </div>
        </div>
    );
}
