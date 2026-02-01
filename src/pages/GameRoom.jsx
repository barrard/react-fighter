// src/pages/GameRoom.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
    const readyRetryTimerRef = useRef(null);
    const roomStateRef = useRef(roomState);
    const [matchStartData, setMatchStartData] = useState(null);
    const allPlayers = useRef(new Map()); // Store all players in the room
    const readyEmittedRef = useRef(false);
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

        console.log(`GameRoom: Emitting verifyRoom for roomId: ${roomId}`);
        socket.emit("verifyRoom", roomId);
        setRoomState("verifying");

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
            const { isPlayer1, character } = selectedChar;
            const updater = () => ({ character: character }); // Update player object with final character

            if (isPlayer1) {
                setPlayer1(updater);
            } else {
                setPlayer2(updater);
            }
        };

        const initServerPlayers = (serverData) => {
            // Clear existing players to ensure a fresh state
            allPlayers.current.clear();
            // Set the local player ID if it's provided in serverData
            // This assumes serverData.localPlayerId is sent by the server
            // if (serverData.localPlayerId) {
            //     localPlayerId.current = serverData.localPlayerId;
            // }
            const FLOOR_Y = CONSTS.CANVAS_HEIGHT - CONSTS.FLOOR_HEIGHT;
            // Add all existing players
            serverData.players.forEach((serverPlayer) => {
                // Set initial y position on the floor
                serverPlayer.y = FLOOR_Y - CONSTS.PLAYER_HEIGHT;
                // Set default facing direction if not provided
                serverPlayer.facing = serverPlayer.facing || "right";
                // Initialize interpolation targets for smooth movement
                serverPlayer.targetX = serverPlayer.x;
                serverPlayer.targetHeight = serverPlayer.height || 0;
                allPlayers.current.set(serverPlayer.id, serverPlayer);
            });
        };

        const addServerPlayer = (serverPlayer) => {
            // console.log("New serverPlayer joined:", serverPlayer.id);
            // Set initial y position on the floor
            serverPlayer.y = CONSTS.FLOOR_Y - CONSTS.PLAYER_HEIGHT;
            // Set default facing direction if not provided
            serverPlayer.facing = serverPlayer.facing || "right";
            // Initialize interpolation targets
            serverPlayer.targetX = serverPlayer.x;
            serverPlayer.targetHeight = serverPlayer.height || 0;
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
            setMatchStartData(null);
            // Re-run ready/calibration for next round
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
        };

        socket.on("playerJoined", addServerPlayer);
        socket.on("initServerPlayers", initServerPlayers);
        socket.on("matchStart", handleMatchStart);
        socket.on("roundStart", handleRoundStart);
        socket.on("roundTimer", handleRoundTimer);
        socket.on("roundEnd", handleRoundEnd);
        socket.on("matchEnd", handleMatchEnd);

        socket.on("roomVerified", handleRoomVerified);
        socket.on("characterSelected", handleCharacterSelected);

        return () => {
            socket.off("roomVerified", handleRoomVerified);
            socket.off("characterSelected", handleCharacterSelected);
            socket.off("playerJoined", addServerPlayer);
            socket.off("initServerPlayers", initServerPlayers);
            socket.off("matchStart", handleMatchStart);
            socket.off("roundStart", handleRoundStart);
            socket.off("roundTimer", handleRoundTimer);
            socket.off("roundEnd", handleRoundEnd);
            socket.off("matchEnd", handleMatchEnd);
            if (readyRetryTimerRef.current) {
                clearInterval(readyRetryTimerRef.current);
                readyRetryTimerRef.current = null;
            }
        };
    }, [roomId, socket]); // Dependencies for setup

    // NEW: This effect checks if both players are ready and starts the fight
    useEffect(() => {
        // Check if both players have a character selected and we are not already fighting
        if (player1?.character && player2?.character && roomState !== "fighting") {
            // Give a brief moment for players to see the final matchup
            setTimeout(() => {
                setRoomState("fighting");
            }, 1500); // 1.5-second pause before the fight starts
        }
    }, [player1, player2, roomState]);

    function leaveRoom() {
        socket.emit("leaveRoom", roomId);
        navigate("/");
    }

    const handleCanvasReady = () => {
        if (!socket || readyEmittedRef.current) return;
        readyEmittedRef.current = true;
        console.log("GameRoom: clientReady emitted");
        socket.emit("clientReady");
    };

    return (
        <div className="space-y-6 container mx-auto p-4">
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
                {/* STATE 1: VERIFYING */}
                {roomState === "verifying" && <p className="text-center text-xl">Entering Room...</p>}

                {/* STATE 2: CHARACTER SELECT */}
                {roomState === "verified" && (
                    <CharacterSelect player1={player1} player2={player2} role={roomVerified} />
                )}

                {/* STATE 3: THE FIGHT! */}
                {roomState === "fighting" && (
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
                    />
                )}
            </main>
        </div>
    );
}
