import { useEffect, useRef } from "react";
import GameLoop from "./GameLoop";
import Canvas from "./Canvas";
import InputBatchHandler from "./InputBatchHandler";
import { getLatencyMonitor } from "./latencySingleton";

export function useGameEngine({ socket, canvasRef, allPlayers, localPlayerId, matchStartData, localOnly = false }) {
    const gameLoopRef = useRef(null);
    const inputBatcherRef = useRef(null);

    // Local-only mode (Training Grounds): delay game loop creation until matchStartData is ready.
    // This guarantees allPlayers is populated and isMatchStarted is set before the first frame.
    useEffect(() => {
        if (!localOnly) return;
        if (!socket || !canvasRef.current || !matchStartData) return;

        const inputBatcher = new InputBatchHandler(socket);
        inputBatcher.init(getLatencyMonitor(socket));
        inputBatcher.sendBatch = () => {
            if (gameLoopRef.current) gameLoopRef.current.inputsOnDeck = [];
        };
        inputBatcher.applyMatchStart(matchStartData);
        inputBatcherRef.current = inputBatcher;

        const gameLoop = new GameLoop(
            new Canvas(socket, canvasRef.current),
            socket,
            inputBatcher,
            localPlayerId,
            allPlayers
        );
        gameLoop.start();
        gameLoopRef.current = gameLoop;

        return () => {
            gameLoop.destroy();
            inputBatcher.destroy();
            gameLoopRef.current = null;
            inputBatcherRef.current = null;
        };
    }, [socket, localOnly, matchStartData]);

    // Server mode (FightCanvas): create game loop as soon as socket is ready.
    useEffect(() => {
        if (localOnly) return;
        if (!socket || !canvasRef.current) return;

        const inputBatcher = new InputBatchHandler(socket);
        inputBatcher.init(getLatencyMonitor(socket));
        if (matchStartData) inputBatcher.applyMatchStart(matchStartData);
        inputBatcherRef.current = inputBatcher;

        const gameLoop = new GameLoop(
            new Canvas(socket, canvasRef.current),
            socket,
            inputBatcher,
            localPlayerId,
            allPlayers
        );
        gameLoop.start();
        gameLoopRef.current = gameLoop;

        return () => {
            gameLoop.destroy();
            inputBatcher.destroy();
            gameLoopRef.current = null;
            inputBatcherRef.current = null;
        };
    }, [socket]);

    // Server mode: apply matchStartData updates without recreating the game loop.
    useEffect(() => {
        if (localOnly) return;
        if (!inputBatcherRef.current) return;
        if (matchStartData) {
            inputBatcherRef.current.applyMatchStart(matchStartData);
            if (gameLoopRef.current && !gameLoopRef.current.isRunning) {
                gameLoopRef.current.start();
            }
        } else {
            inputBatcherRef.current.resetForRound();
        }
    }, [matchStartData]);

    return { gameLoopRef, inputBatcherRef };
}
