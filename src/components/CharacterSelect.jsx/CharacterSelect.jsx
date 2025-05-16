import React from "react";
import { useState, useEffect, useRef } from "react";
import DrawCharacterPortrait from "./DrawCharPortrait";
import { useSocket } from "../../context/SocketContext";
import Characters from "../../gameConfig/Characters";

export default function CharacterSelect() {
    const { socket, username, error } = useSocket();

    const [selectedIdx, setSelectedIdx] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [selectionAnimation, setSelectionAnimation] = useState(false);

    const canvasRefs = useRef([]);
    const previewCanvasRef = useRef(null);

    // Number of columns in the grid
    const columns = 4;

    // Initialize canvas refs
    useEffect(() => {
        canvasRefs.current = canvasRefs.current.slice(0, Characters.length);
    }, []);

    // Draw Characters on canvases
    useEffect(() => {
        // Draw all character canvases
        Characters.forEach((char, idx) => {
            const canvas = canvasRefs.current[idx];
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            const isSelected = idx === selectedIdx && !selectionAnimation;

            DrawCharacterPortrait(ctx, char, canvas.width, canvas.height, isSelected);
        });
    }, [selectedIdx, selectionAnimation]);

    useEffect(() => {
        const previewCanvas = previewCanvasRef.current;
        if (!previewCanvas) return;

        const ctx = previewCanvas.getContext("2d");
        const selectedChar = Characters[selectedIdx];

        // Set up animation loop for preview
        const animatePreview = () => {
            DrawCharacterPortrait(ctx, selectedChar, previewCanvas.width, previewCanvas.height, true);
            requestAnimationFrame(animatePreview);
        };

        const animationId = requestAnimationFrame(animatePreview);

        return () => cancelAnimationFrame(animationId);
    }, [selectedIdx]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectionAnimation) return; // Don't allow inputs during animation

            const rows = Math.ceil(Characters.length / columns);
            const currentRow = Math.floor(selectedIdx / columns);
            const currentCol = selectedIdx % columns;

            let newIdx = selectedIdx;

            switch (e.key) {
                case "ArrowRight":
                    newIdx = Math.min(selectedIdx + 1, Characters.length - 1);
                    break;
                case "ArrowLeft":
                    newIdx = Math.max(selectedIdx - 1, 0);
                    break;
                case "ArrowDown":
                    // Move down a row if possible
                    if (currentRow < rows - 1) {
                        const downIdx = selectedIdx + columns;
                        newIdx = downIdx < Characters.length ? downIdx : selectedIdx;
                    }
                    break;
                case "ArrowUp":
                    // Move up a row if possible
                    if (currentRow > 0) {
                        newIdx = selectedIdx - columns;
                    }
                    break;
                case "Enter":
                    if (!isReady) {
                        handleConfirmSelection();
                    }
                    break;
                case "Escape":
                    if (isReady) {
                        setIsReady(false);
                    }
                    break;
                default:
                    return;
            }

            if (newIdx !== selectedIdx) {
                setSelectedIdx(newIdx);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIdx, isReady, selectionAnimation]);

    // Handle character selection
    function handleCharacterClick(idx) {
        if (!selectionAnimation) {
            setSelectedIdx(idx);
        }
    }

    // Handle character confirmation
    function handleConfirmSelection() {
        // Start the animation
        setSelectionAnimation(true);
        const character = Characters[selectedIdx];
        console.log(`Selected character: ${character.name}`);

        socket.emit("characterSelected", character);
        // After animation completes, set as ready
        setTimeout(() => {
            setIsReady(true);
            setSelectionAnimation(false);
        }, 1000); // Match this with the CSS transition duration

        // Here you would send the selection to your game logic
    }

    // Handle game start
    function handleReadyToPlay() {
        debugger;
        // Add your game start logic here
        console.log("Ready to play with " + Characters[selectedIdx].name);
    }

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Select Your Character</h2>

            <div
                className={`
                    flex flex-col md:flex-row gap-6 
                    transition-all duration-1000 ease-in-out
                    ${isReady ? "justify-center" : ""}
                `}
            >
                {/* Character grid with offset rows */}
                <div
                    className={`
                        w-full md:w-1/2
                        transition-all duration-1000 ease-in-out
                        ${selectionAnimation ? "opacity-0 scale-75 -translate-x-full" : "opacity-100"}
                        ${isReady ? "hidden" : ""}
                    `}
                >
                    <div className="grid grid-cols-4 gap-4">
                        {Characters.map((char, idx) => {
                            // Every other row is offset
                            const rowIndex = Math.floor(idx / columns);
                            const isOffsetRow = rowIndex % 2 === 1;

                            return (
                                <div
                                    key={char.id}
                                    className={`relative ${isOffsetRow ? "ml-6" : ""} 
								        transition-all duration-200 cursor-pointer w-[100px]`}
                                    onClick={() => handleCharacterClick(idx)}
                                >
                                    <canvas
                                        ref={(el) => (canvasRefs.current[idx] = el)}
                                        width={100}
                                        height={80}
                                        className="rounded-md"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-1 rounded-b-md w-full">
                                        <p className="text-xs text-white text-center truncate">{char.name}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 p-2 bg-gray-100 rounded-md">
                        <p className="text-sm text-gray-600">Use arrow keys to navigate or click to select</p>
                    </div>
                </div>

                {/* Character preview */}
                <div
                    className={`
						w-full md:w-1/2
						transition-all duration-1000 ease-in-out
						${isReady ? "md:w-full" : ""}
						${selectionAnimation ? "md:w-full scale-110" : ""}
					`}
                >
                    <div
                        className={`
							bg-gray-800 p-4 rounded-md
							transition-all duration-1000
							${isReady || selectionAnimation ? "scale-110 mx-auto max-w-md" : ""}
						`}
                    >
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-bold text-white">{Characters[selectedIdx].name}</h3>
                            <p className="text-sm text-gray-300">
                                {isReady
                                    ? "Character locked in!"
                                    : selectionAnimation
                                    ? "Locking in..."
                                    : "Press Enter to confirm selection"}
                            </p>
                        </div>

                        <div className="flex justify-center mb-4">
                            <canvas
                                ref={previewCanvasRef}
                                width={200}
                                height={200}
                                className={`
								    rounded-md
								    transition-all duration-1000
								    ${isReady || selectionAnimation ? "scale-125" : ""}
							    `}
                            />
                        </div>

                        <div className="flex justify-center">
                            {isReady ? (
                                <button
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md"
                                    onClick={handleReadyToPlay}
                                >
                                    Ready to Battle!
                                </button>
                            ) : (
                                <button
                                    className={`
                                        px-4 py-2 bg-green-500 text-white rounded-md
                                        transition-all duration-300
                                        ${selectionAnimation ? "opacity-0" : "opacity-100"}
                                    `}
                                    onClick={handleConfirmSelection}
                                    disabled={selectionAnimation}
                                >
                                    Confirm Selection
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
