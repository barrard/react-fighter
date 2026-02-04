// src/pages/GameRoom.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
// import { useOutletContext } from "react-router-dom"; // This seems unused now

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress"; // Added for health bars
import { Timer, ArrowLeft, Heart, Swords } from "lucide-react"; // Added icons

import CharacterSelect from "@/components/CharacterSelect.jsx"; // Your NEW CharacterSelect component
import FightCanvas from "@/components/FightCanvas.jsx"; // Import the new component
import CONSTS from "../game-engine/contants.js"; // Import game constants
export default function GameRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { socket, username, error } = useSocket();

    const [roomState, setRoomState] = useState("verifying"); // verifying, verified, fighting, finished
    const [player1, setPlayer1] = useState(null);
    const [player2, setPlayer2] = useState(null);
    const [roomVerified, setRoomVerified] = useState(false); // This will hold the user's role: 'player1', 'player2', or 'spectator'
    const [gameTimer, setGameTimer] = useState(99);
    const [roundNumber, setRoundNumber] = useState(0);
    const [roundScores, setRoundScores] = useState({ player1Wins: 0, player2Wins: 0 });
    const [matchWinnerId, setMatchWinnerId] = useState(null);
    const [roundOutcome, setRoundOutcome] = useState(null);
    const [roundWinnerId, setRoundWinnerId] = useState(null);
    const [rematchRequested, setRematchRequested] = useState(false);
    const readyRetryTimerRef = useRef(null);
    const roomStateRef = useRef(roomState);
    const [startCountdown, setStartCountdown] = useState(null); // 3..1, then "FIGHT"
    const [matchStartData, setMatchStartData] = useState(null);
    const allPlayers = useRef(new Map()); // Store all players in the room
    const readyEmittedRef = useRef(false);
    const countdownTimerRef = useRef(null);
    const countdownHoldRef = useRef(null);
    const roundEndCleanupRef = useRef(null);
    const [roundPrepared, setRoundPrepared] = useState(false);
    // THIS HOOK IS PRESERVED FROM YOUR ORIGINAL CODE
    useEffect(() => {
        roomStateRef.current = roomState;
        let errMsg = error?.message || error;
        if (errMsg) {
            if (errMsg === "You are not in this room" || errMsg === "Game ended: Opponent left.") {
                navigate("/");
            }
        }
    }, [error, navigate]);

    // THIS HOOK IS PRESERVED AND ENHANCED FROM YOUR ORIGINAL CODE
    useEffect(() => {
        if (!roomId) {
            navigate("/");
            return;
        }

        // This check prevents re-registering listeners on every render
        if (!socket) return;

        const handleRoomVerified = (inRoomAs) => {
            console.log(`GameRoom: Received roomVerified. inRoomAs: ${inRoomAs}`);
            if (!inRoomAs) {
                navigate("/");
                return;
            }
            // e.g., 'player1', 'player2', 'spectator'
            setRoomVerified(inRoomAs);
            setRoomState("verified");
        };

        const handleCharacterSelected = (selectedChar = {}) => {
            const { isPlayer1, character, username } = selectedChar;
            const updater = (prev) => ({
                ...(prev || {}),
                character: character,
                username: username ?? prev?.username,
            });

            if (isPlayer1) {
                setPlayer1(updater);
            } else {
                setPlayer2(updater);
            }
        };

        const handleRoomPlayersUpdate = (payload = {}) => {
            setPlayer1(payload.player1 ?? null);
            setPlayer2(payload.player2 ?? null);
        };

        const initServerPlayers = (serverData) => {
            // Clear existing players to ensure a fresh state
            allPlayers.current.clear();
            const FLOOR_Y = CONSTS.CANVAS_HEIGHT - CONSTS.FLOOR_HEIGHT;
            console.log("initServerPlayers received:", serverData.players);
            // Add all existing players
            serverData.players.forEach((serverPlayer) => {
                // Ensure height is initialized for lerp math
                serverPlayer.height = serverPlayer.height || 0;
                // Set initial y position on the floor using player's characterHeight
                serverPlayer.y = FLOOR_Y - serverPlayer.characterHeight - serverPlayer.height;
                console.log(`Player ${serverPlayer.id}: characterHeight=${serverPlayer.characterHeight}, y=${serverPlayer.y}`);
                // Set default facing direction if not provided
                serverPlayer.facing = serverPlayer.facing || "right";
                // Initialize interpolation state for smooth movement
                serverPlayer.targetX = serverPlayer.x;
                serverPlayer.targetHeight = serverPlayer.height;
                serverPlayer.prevX = serverPlayer.x;
                serverPlayer.prevHeight = serverPlayer.height;
                serverPlayer.snapshotTime = performance.now();
                allPlayers.current.set(serverPlayer.id, serverPlayer);
            });
            setRoundPrepared(true);
        };

        const addServerPlayer = (serverPlayer) => {
            // Ensure height is initialized for lerp math
            serverPlayer.height = serverPlayer.height || 0;
            // Set initial y position on the floor using player's characterHeight
            const FLOOR_Y = CONSTS.CANVAS_HEIGHT - CONSTS.FLOOR_HEIGHT;
            serverPlayer.y = FLOOR_Y - serverPlayer.characterHeight - serverPlayer.height;
            // Set default facing direction if not provided
            serverPlayer.facing = serverPlayer.facing || "right";
            // Initialize interpolation state
            serverPlayer.targetX = serverPlayer.x;
            serverPlayer.targetHeight = serverPlayer.height;
            serverPlayer.prevX = serverPlayer.x;
            serverPlayer.prevHeight = serverPlayer.height;
            serverPlayer.snapshotTime = performance.now();
            allPlayers.current.set(serverPlayer.id, serverPlayer);
        };

        const handleMatchStart = (data) => {
            console.log("GameRoom: Received matchStart", data);
            console.log("GameRoom: matchStart timing", {
                serverTick: data?.serverTick,
                matchStartTick: data?.matchStartTick,
                tickRate: data?.tickRate,
                receivedAt: performance.now(),
            });
            setMatchStartData({ ...data, receivedAt: performance.now() });
            if (readyRetryTimerRef.current) {
                clearInterval(readyRetryTimerRef.current);
                readyRetryTimerRef.current = null;
            }
        };

        const handleRoundStart = (data = {}) => {
            setRoundNumber(data.round ?? 0);
            if (typeof data.durationSeconds === "number") {
                setGameTimer(data.durationSeconds);
            }
            if (data.scores) {
                setRoundScores(data.scores);
            }
            setRoundOutcome(null);
            setRoundWinnerId(null);
            setRoundPrepared(false);
        };

        const handleRoundTimer = (data = {}) => {
            if (typeof data.remainingSeconds === "number") {
                setGameTimer(data.remainingSeconds);
            }
        };

        const handleRoundEnd = (data = {}) => {
            console.log("GameRoom: roundEnd received", data);
            if (data.scores) {
                setRoundScores(data.scores);
            }
            setRoundOutcome(data.outcome ?? null);
            setRoundWinnerId(data.winnerId ?? null);
            if (Array.isArray(data.players)) {
                data.players.forEach((p) => {
                    const existing = allPlayers.current.get(p.id);
                    if (!existing) return;
                    existing.health = p.health ?? existing.health;
                });
            }
            if (roundEndCleanupRef.current) {
                clearTimeout(roundEndCleanupRef.current);
            }
            roundEndCleanupRef.current = setTimeout(() => {
                setMatchStartData(null);
            }, 120);
            // Re-run ready/calibration for next round
            if (data.matchOver) {
                if (readyRetryTimerRef.current) {
                    clearInterval(readyRetryTimerRef.current);
                    readyRetryTimerRef.current = null;
                }
                return;
            }
            readyEmittedRef.current = false;
            if (readyRetryTimerRef.current) {
                clearInterval(readyRetryTimerRef.current);
            }
            if (socket && roomStateRef.current !== "finished") {
                console.log("GameRoom: clientReady emitted (round reset)");
                socket.emit("clientReady");
                readyRetryTimerRef.current = setInterval(() => {
                    if (!socket || roomStateRef.current === "finished") return;
                    console.log("GameRoom: clientReady retry");
                    socket.emit("clientReady");
                }, 1000);
            }
        };

        const handleMatchEnd = (data = {}) => {
            setMatchWinnerId(data.winnerId ?? null);
            if (data.scores) {
                setRoundScores(data.scores);
            }
            setRoomState("finished");
            setRematchRequested(false);
            if (readyRetryTimerRef.current) {
                clearInterval(readyRetryTimerRef.current);
                readyRetryTimerRef.current = null;
            }
        };

        const handleRematchAccepted = () => {
            setMatchWinnerId(null);
            setRoundOutcome(null);
            setRoundWinnerId(null);
            setRoundScores({ player1Wins: 0, player2Wins: 0 });
            setRoundNumber(0);
            setRematchRequested(false);
            setRoomState("fighting");
        };

        const handleMatchQuit = () => {
            navigate("/");
        };

        const handleStartCountdown = (payload = {}) => {
            const seconds = Number(payload.seconds) || 3;
            const tickMs = Number(payload.tickMs) || 1000;
            const holdMs = Number(payload.holdMs) || 800;

            if (roomStateRef.current !== "fighting") {
                setRoomState("fighting");
            }
            if (readyRetryTimerRef.current) {
                clearInterval(readyRetryTimerRef.current);
                readyRetryTimerRef.current = null;
            }
            setStartCountdown(seconds);

            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
            }
            if (countdownHoldRef.current) {
                clearTimeout(countdownHoldRef.current);
                countdownHoldRef.current = null;
            }

            let remaining = seconds;
            countdownTimerRef.current = setInterval(() => {
                remaining -= 1;
                if (remaining <= 0) {
                    clearInterval(countdownTimerRef.current);
                    countdownTimerRef.current = null;
                    setStartCountdown("FIGHT");
                    countdownHoldRef.current = setTimeout(() => {
                        setStartCountdown(null);
                        countdownHoldRef.current = null;
                    }, holdMs);
                    return;
                }
                setStartCountdown(remaining);
            }, tickMs);
        };

        socket.on("playerJoined", addServerPlayer);
        socket.on("initServerPlayers", initServerPlayers);
        socket.on("matchStart", handleMatchStart);
        socket.on("roundStart", handleRoundStart);
        socket.on("roundTimer", handleRoundTimer);
        socket.on("roundEnd", handleRoundEnd);
        socket.on("matchEnd", handleMatchEnd);
        socket.on("startCountdown", handleStartCountdown);
        socket.on("rematchAccepted", handleRematchAccepted);
        socket.on("matchQuit", handleMatchQuit);

        socket.on("roomVerified", handleRoomVerified);
        socket.on("characterSelected", handleCharacterSelected);
        socket.on("roomPlayersUpdate", handleRoomPlayersUpdate);

        console.log(`GameRoom: Emitting verifyRoom for roomId: ${roomId}`);
        socket.emit("verifyRoom", roomId);
        setRoomState("verifying");

        return () => {
            socket.off("roomVerified", handleRoomVerified);
            socket.off("characterSelected", handleCharacterSelected);
            socket.off("roomPlayersUpdate", handleRoomPlayersUpdate);
            socket.off("playerJoined", addServerPlayer);
            socket.off("initServerPlayers", initServerPlayers);
            socket.off("matchStart", handleMatchStart);
            socket.off("roundStart", handleRoundStart);
            socket.off("roundTimer", handleRoundTimer);
            socket.off("roundEnd", handleRoundEnd);
            socket.off("matchEnd", handleMatchEnd);
            socket.off("startCountdown", handleStartCountdown);
            socket.off("rematchAccepted", handleRematchAccepted);
            socket.off("matchQuit", handleMatchQuit);
            if (readyRetryTimerRef.current) {
                clearInterval(readyRetryTimerRef.current);
                readyRetryTimerRef.current = null;
            }
            if (roundEndCleanupRef.current) {
                clearTimeout(roundEndCleanupRef.current);
                roundEndCleanupRef.current = null;
            }
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
            }
            if (countdownHoldRef.current) {
                clearTimeout(countdownHoldRef.current);
                countdownHoldRef.current = null;
            }
        };
    }, [roomId, socket]); // Dependencies for setup

    useEffect(() => {
        const isTraining = roomId && roomId.startsWith("training-");
        if (
            (player1?.character && player2?.character) ||
            (isTraining && player1?.character)
        ) {
            if (roomState !== "verified") return;
            setRoomState("fighting");
        }
    }, [player1, player2, roomState, roomId]);

    function leaveRoom() {
        socket.emit("leaveRoom", roomId);
        navigate("/");
    }

    const handleRematchClick = () => {
        if (!socket) return;
        setRematchRequested(true);
        socket.emit("matchRematch");
    };

    const handleQuitClick = () => {
        if (!socket) return;
        socket.emit("matchQuit");
    };

    const handleCanvasReady = () => {
        if (!socket || readyEmittedRef.current) return;
        readyEmittedRef.current = true;
        console.log("GameRoom: clientReady emitted");
        socket.emit("clientReady");
    };

    return (
        <div className="space-y-6 container mx-auto p-4 relative">
            <header className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={leaveRoom}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Badge variant="outline">Room: {roomId}</Badge>
                <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5" />
                    <span className="capitalize">Game State: {roomState}</span>
                </div>
            </header>

            <hr />

            <main>
                {startCountdown && roomState === "fighting" && (
                    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
                        <div className="rounded-2xl bg-black/70 px-10 py-6 text-4xl md:text-6xl font-bold tracking-widest text-white shadow-xl">
                            {startCountdown}
                        </div>
                    </div>
                )}
                {/* STATE 1: VERIFYING */}
                {roomState === "verifying" && <p className="text-center text-xl">Entering Room...</p>}

                {/* STATE 2: CHARACTER SELECT */}
                {roomState === "verified" && (
                    <CharacterSelect
                        player1={player1}
                        player2={player2}
                        role={roomVerified}
                        isTrainingMode={roomId && roomId.startsWith("training-")}
                    />
                )}

                {/* STATE 3: THE FIGHT! */}
                {(roomState === "fighting" || roomState === "finished") && (
                    <FightCanvas
                        allPlayers={allPlayers.current}
                        localPlayerId={socket.id}
                        player1={player1}
                        player2={player2}
                        matchStartData={matchStartData}
                        onCanvasReady={handleCanvasReady}
                        timerSeconds={gameTimer}
                        roundNumber={roundNumber}
                        roundScores={roundScores}
                        roundOutcome={roundOutcome}
                        roundWinnerId={roundWinnerId}
                        showReadyBanner={roundPrepared && !matchStartData}
                        showMatchEnd={roomState === "finished"}
                        matchWinnerId={matchWinnerId}
                        onRematch={handleRematchClick}
                        onQuit={handleQuitClick}
                        rematchPending={rematchRequested}
                    />
                )}
            </main>
        </div>
    );
}
