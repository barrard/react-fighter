import { useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { getLatencyMonitor, destroyLatencyMonitor } from "../game-engine/latencySingleton";

export default function LatencyOverlay() {
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;
        getLatencyMonitor(socket);
        return () => {
            destroyLatencyMonitor();
        };
    }, [socket]);

    return null;
}
