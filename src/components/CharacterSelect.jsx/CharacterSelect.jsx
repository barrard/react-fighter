// src/components/CharacterSelect.jsx
import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "../../context/SocketContext";
import DrawCharacterPortrait from "./DrawCharPortrait";

// Sub-component to display a single player's selection UI
const PlayerSelectionUI = ({ playerTitle, selectedCharacter, isCurrentUser, onConfirm, isLockedIn, characters }) => {
    const { socket } = useSocket();
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [selectionAnimation, setSelectionAnimation] = useState(false);

    const canvasRefs = useRef([]);
    const previewCanvasRef = useRef(null);
    const columns = 4;

    // This effect ensures that when a user makes a selection, it is emitted.
    useEffect(() => {
        if (isCurrentUser && !isLockedIn) {
            // Emit a preview selection to the server so the opponent can see it
            // socket.emit("characterPreview", characters[selectedIdx]);
        }
    }, [selectedIdx, isCurrentUser, isLockedIn, socket, characters]);

    // Draw Character Grid (only for the current user)
    useEffect(() => {
        if (!isCurrentUser || !characters) return;
        characters.forEach((char, idx) => {
            const canvas = canvasRefs.current[idx];
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            DrawCharacterPortrait(ctx, char, canvas.width, canvas.height, idx === selectedIdx);
        });
    }, [selectedIdx, isCurrentUser, characters]);

    // Draw Preview Canvas
    useEffect(() => {
        const previewCanvas = previewCanvasRef.current;
        if (!previewCanvas) return;
        const ctx = previewCanvas.getContext("2d");

        const charToDraw = isCurrentUser ? characters[selectedIdx] : selectedCharacter;
        if (!charToDraw) {
            ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            return;
        }

        const animate = () => {
            DrawCharacterPortrait(ctx, charToDraw, previewCanvas.width, previewCanvas.height, true);
            animationFrameId = requestAnimationFrame(animate);
        };
        let animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [selectedIdx, selectedCharacter, isCurrentUser, characters]);

    // Keyboard Navigation (only for the current user)
    useEffect(() => {
        if (!isCurrentUser || isLockedIn || !characters) return;

        const handleKeyDown = (e) => {
            let newIdx = selectedIdx;
            // Simplified navigation logic
            switch (e.key) {
                case "ArrowRight":
                    newIdx = Math.min(selectedIdx + 1, characters.length - 1);
                    break;
                case "ArrowLeft":
                    newIdx = Math.max(selectedIdx - 1, 0);
                    break;
                case "ArrowDown":
                    newIdx = Math.min(selectedIdx + columns, characters.length - 1);
                    break;
                case "ArrowUp":
                    newIdx = Math.max(selectedIdx - columns, 0);
                    break;
                case "Enter":
                    setSelectionAnimation(true);
                    setTimeout(() => {
                        onConfirm(characters[selectedIdx]);
                        setSelectionAnimation(false);
                    }, 1000);
                    break;
            }
            if (newIdx !== selectedIdx) setSelectedIdx(newIdx);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIdx, isCurrentUser, isLockedIn, onConfirm, characters]);

    const characterName = (isCurrentUser ? characters[selectedIdx]?.name : selectedCharacter?.name) || "Selecting...";
    const statusText = () => {
        if (isLockedIn) return "Character Locked In!";
        if (selectionAnimation) return "Locking in...";
        if (isCurrentUser) return "Press Enter to Confirm";
        return "Opponent is Choosing...";
    };

    return (
        <div
            className={`h-full flex flex-col transition-all duration-500 ease-in-out ${
                isLockedIn ? "scale-105" : ""
            }`}
        >
            <div className="bg-gray-800 p-3 rounded-md flex flex-col h-full">
                <div className="text-center flex-shrink-0 mb-2">
                    <h2 className="text-xl font-bold text-white">{playerTitle}</h2>
                    <h3 className="text-lg font-semibold text-white">{characterName}</h3>
                    <p className="text-xs text-gray-300 h-4">{statusText()}</p>
                </div>

                {/* Preview canvas - proportional flex space */}
                <div className="flex justify-center flex-1 min-h-0 mb-2">
                    <canvas ref={previewCanvasRef} width={200} height={200} className="rounded-md max-h-full" style={{ aspectRatio: "1/1" }} />
                </div>

                {isCurrentUser && !isLockedIn && characters && (
                    <div className="flex-shrink-0">
                        <div className="grid grid-cols-4 gap-2 mb-2">
                            {characters.map((char, idx) => (
                                <div
                                    key={char.id}
                                    className="relative cursor-pointer"
                                    onClick={() => setSelectedIdx(idx)}
                                >
                                    <canvas
                                        ref={(el) => (canvasRefs.current[idx] = el)}
                                        width={100}
                                        height={80}
                                        className="rounded-md w-full"
                                    />
                                </div>
                            ))}
                        </div>
                        <button
                            className="w-full px-4 py-2 bg-green-500 text-white rounded-md text-sm"
                            onClick={() => {
                                setSelectionAnimation(true);
                                setTimeout(() => {
                                    onConfirm(characters[selectedIdx]);
                                    setSelectionAnimation(false);
                                }, 1000);
                            }}
                            disabled={selectionAnimation}
                        >
                            Confirm Selection
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Main Exported Component
export default function CharacterSelect({ player1, player2, role, isTrainingMode = false }) {
    const { socket } = useSocket();
    const [characters, setCharacters] = useState(null);
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

    useEffect(() => {
        fetch(`${API_BASE}/characters`)
            .then((res) => res.json())
            .then((data) => setCharacters(data));
    }, []);

    // The only job of this function is to emit the final selection to the server.
    // The GameRoom will then receive it and update the state, which flows back down here.
    function handleConfirmSelection(character) {
        socket.emit("characterSelected", character);
    }

    // Determine the role of the current user
    const isPlayer1 = role === "player1";
    const isPlayer2 = role === "player2";
    const isSpectator = !isPlayer1 && !isPlayer2;

    if (!characters) {
        return <div>Loading Characters...</div>;
    }

    return (
        <div className="h-full flex flex-row gap-4 justify-center items-stretch">
            <div className="flex-1 min-w-0">
                <PlayerSelectionUI
                    playerTitle="Player 1"
                    selectedCharacter={player1?.character || (isSpectator && player1?.previewCharacter)}
                    isCurrentUser={isPlayer1}
                    onConfirm={handleConfirmSelection}
                    isLockedIn={!!player1?.character?.name}
                    characters={characters}
                />
            </div>

            {!isTrainingMode && (
                <>
                    <div className="flex items-center text-4xl font-bold px-2 flex-shrink-0">VS</div>

                    <div className="flex-1 min-w-0">
                        <PlayerSelectionUI
                            playerTitle="Player 2"
                            selectedCharacter={player2?.character || (isSpectator && player2?.previewCharacter)}
                            isCurrentUser={isPlayer2}
                            onConfirm={handleConfirmSelection}
                            isLockedIn={!!player2?.character?.name}
                            characters={characters}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
