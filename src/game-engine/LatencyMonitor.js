// Client-side latency monitor
const DEBUG_NET = import.meta.env.VITE_DEBUG_NET === "true";
class LatencyMonitor {
    constructor(socket) {
        this.socket = socket;
        this.pingInterval = 500; // Send ping every second
        this.pingHistory = []; // Store recent ping measurements
        this.historySize = 10; // Number of measurements to keep
        this.currentLatency = 0;
        this.minLatency = Infinity;
        this.maxLatency = 0;

        //Tick data
        this.minTickTime = 25;
        this.currentTime = new Date().getTime();
        this.pingIntervalId = null;
        this.pongHandler = null;

        this.setupListeners();
        this.startHeartbeat();
        this.displayLatency(); // Ensure HUD exists even before first pong
    }

    setupListeners() {
        // Listen for pong responses from server
        this.pongHandler = (data = {}) => {
            const now = Date.now();
            const clientTimestamp = data.ct ?? data.clientTimestamp;
            if (!clientTimestamp) return;
            const latency = now - clientTimestamp;

            this.updateLatencyStats(latency);
            this.displayLatency();
        };
        this.socket.on("pong", this.pongHandler);
    }

    startHeartbeat() {
        this.pingIntervalId = setInterval(() => {
            this.sendPing();
        }, this.pingInterval);
    }

    sendPing() {
        this.socket.emit("ping", {
            ct: Date.now(),
        });
    }

    updateLatencyStats(latency) {
        // Add to history and maintain history size
        this.pingHistory.push(latency);
        if (this.pingHistory.length > this.historySize) {
            this.pingHistory.shift();
        }

        // Update current latency (average of recent pings)
        this.currentLatency = Math.round(this.pingHistory.reduce((sum, val) => sum + val, 0) / this.pingHistory.length);

        // Update min/max
        this.minLatency = Math.min(this.minLatency, latency);
        this.maxLatency = Math.max(this.maxLatency, latency);
    }

    applyServerLatency(latency) {
        if (typeof latency !== "number" || Number.isNaN(latency)) return;
        this.currentLatency = Math.round(latency);
        this.minLatency = Math.min(this.minLatency, latency);
        this.maxLatency = Math.max(this.maxLatency, latency);
        this.displayLatency();
    }

    displayLatency() {
        // Display handled by React — see useLatency hook + Navbar
    }

    getLatency() {
        return this.currentLatency;
    }

    destroy() {
        if (this.pingIntervalId) clearInterval(this.pingIntervalId);
        if (this.pongHandler) this.socket.off("pong", this.pongHandler);
    }
}

export default LatencyMonitor;
