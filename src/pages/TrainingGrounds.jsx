import React, { useRef, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import CONSTS from "../game-engine/contants";
import { useGameEngine } from "../game-engine/useGameEngine";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Server } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const TrainingGrounds = () => {
    const { socket } = useSocket();
    const navigate = useNavigate();
    const [enteringServer, setEnteringServer] = useState(false);
    const canvasRef = useRef(null);
    const allPlayersRef = useRef(new Map());
    const [matchStartData, setMatchStartData] = useState(null);

    const enterServerTraining = () => {
        if (!socket || enteringServer) return;
        setEnteringServer(true);
        const roomName = `training-${socket.id}`;
        socket.emit("createTrainingRoom", { roomName });
    };

    useEffect(() => {
        if (!socket) return;
        const onRoomCreated = (roomId) => navigate(`/game/${roomId}`);
        socket.on("roomCreated", onRoomCreated);
        return () => socket.off("roomCreated", onRoomCreated);
    }, [socket, navigate]);

    useGameEngine({
        socket,
        canvasRef,
        allPlayers: allPlayersRef.current,
        localPlayerId: socket?.id,
        matchStartData,
        localOnly: true,
    });

    useEffect(() => {
        if (!socket) return;
        const FLOOR_Y = CONSTS.CANVAS_HEIGHT - CONSTS.FLOOR_HEIGHT;

        fetch(`${API_BASE}/characters`)
            .then((res) => res.json())
            .then((data) => {
                const char = data.find((entry) => entry.stats?.rangedAttack) || data[0];
                const stats = char.stats;
                allPlayersRef.current.set(socket.id, {
                    ...stats,
                    id: socket.id,
                    x: 100,
                    height: 0,
                    y: FLOOR_Y - stats.height,
                    color: char.color,
                    characterWidth: stats.width,
                    characterHeight: stats.height,
                    maxHealth: stats.health,
                    isCrouching: false,
                    horizontalVelocity: 0,
                    verticalVelocity: 0,
                    isJumping: false,
                    isPunching: false,
                    isKicking: false,
                    facing: "right",
                    targetX: 100,
                    targetHeight: 0,
                    prevX: 100,
                    prevHeight: 0,
                    snapshotTime: performance.now(),
                });
                setMatchStartData({
                    serverTick: 0,
                    serverTimeMs: performance.now(),
                    tickRate: 60,
                    matchStartTick: 0,
                    receivedAt: performance.now(),
                });
            })
            .catch((err) => console.error("Failed to load characters:", err));

        return () => allPlayersRef.current.clear();
    }, [socket]);

    return (
        <div className="h-full flex flex-col gap-2 overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <h1 className="font-bold leading-tight">Training Grounds</h1>
                        <p className="text-xs text-muted-foreground">Local preview — client physics only</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                        <span><strong>←/→</strong> Move</span>
                        <span><strong>↓</strong> Crouch</span>
                        <span><strong>↑/Space</strong> Jump</span>
                        <span><strong>Z</strong> Punch</span>
                        <span><strong>X</strong> Kick</span>
                        <span><strong>→→ or ←← + X</strong> Ranged</span>
                    </div>
                    <Button
                        size="sm"
                        onClick={enterServerTraining}
                        disabled={enteringServer}
                        className="gap-1.5"
                    >
                        <Server className="h-3.5 w-3.5" />
                        {enteringServer ? "Connecting..." : "Server Training"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                <div
                    className="relative bg-gray-900 rounded-md overflow-hidden"
                    style={{ aspectRatio: "16/9", maxWidth: "100%", maxHeight: "100%", width: "100%" }}
                >
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full"
                        width={CONSTS.CANVAS_WIDTH}
                        height={CONSTS.CANVAS_HEIGHT}
                    />
                </div>
            </div>
        </div>
    );
};

export default TrainingGrounds;
