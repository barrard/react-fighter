import LatencyMonitor from "./LatencyMonitor";

let singleton = null;
let lastSocketId = null;

export function getLatencyMonitor(socket) {
    if (!socket) return null;
    const socketId = socket.id || "";
    if (singleton && lastSocketId && lastSocketId !== socketId) {
        singleton.destroy();
        singleton = null;
    }
    if (!singleton) {
        singleton = new LatencyMonitor(socket);
        lastSocketId = socketId;
    }
    return singleton;
}

export function destroyLatencyMonitor() {
    if (singleton) {
        singleton.destroy();
        singleton = null;
        lastSocketId = null;
    }
}
