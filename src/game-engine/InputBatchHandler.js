// InputBatchHandler.js
export default class InputBatchHandler {
    constructor(socket) {
        this.socket = socket;
        this.sequenceNumber = 0;
        this.isSending = false;
        this.lastSentTime = 0;

        // Match start timing fields
        this.localMatchStartTime = 0;
        this.serverTickAtStart = 0;
        this.matchStartTick = 0;
        this.tickRate = 60;
        this.estimatedOneWayDelay = 0;
        this.isMatchStarted = false;

        // Input history keyed by server tick for reconciliation
        this.inputHistory = {};

        this.setDefaultInputState();

        // Constants for animation durations
        this.PUNCH_DURATION = 300;
        this.KICK_DURATION = 400;
        this.JUMP_VELOCITY = -10;

        // Flag to track if the state has changed since last send
        this.stateChanged = false;
    }

    init(latencyMonitor) {
        this.latencyMonitor = latencyMonitor;
        // Bind event listeners
        this.setupEventListeners();
    }

    applyMatchStart(data) {
        // data: { serverTick, serverTimeMs, tickRate, matchStartTick, receivedAt }
        this.localMatchStartTime = data.receivedAt;
        this.serverTickAtStart = data.serverTick;
        this.matchStartTick = data.matchStartTick;
        this.tickRate = data.tickRate;
        // Estimate one-way delay as half the current RTT
        const rawLatency = this.latencyMonitor
            ? this.latencyMonitor.getLatency()
            : 0;
        this.estimatedOneWayDelay = (rawLatency && !isNaN(rawLatency)) ? rawLatency / 2 : 0;
        this.isMatchStarted = true;
        console.log("InputBatchHandler: matchStart applied", {
            localMatchStartTime: this.localMatchStartTime,
            serverTickAtStart: this.serverTickAtStart,
            matchStartTick: this.matchStartTick,
            tickRate: this.tickRate,
            rawLatency: rawLatency,
            estimatedOneWayDelay: this.estimatedOneWayDelay,
            estimatedTickNow: this.getEstimatedServerTick(),
        });
    }

    getEstimatedServerTick() {
        if (!this.isMatchStarted) return 0;
        const elapsed = performance.now() - this.localMatchStartTime + this.estimatedOneWayDelay;
        return this.serverTickAtStart + Math.floor(elapsed / (1000 / this.tickRate));
    }

    setDefaultInputState() {
        this.stateChanged = false;
        this.keysPressed = {
            ArrowLeft: false,
            ArrowRight: false,
            ArrowUp: false,
            ArrowDown: false,
            KeyP: false,
            KeyK: false,
        };
    }

    setupEventListeners() {
        // Handle keydown events
        window.addEventListener("keydown", (e) => {
            const keyCode = e.code;
            if (keyCode in this.keysPressed) {
                this.keysPressed[keyCode] = true;
                this.handleKeysPressed(keyCode);
            }
        });

        // Handle keyup events
        window.addEventListener("keyup", (e) => {
            const keyCode = e.code;
            if (keyCode in this.keysPressed && this.keysPressed[keyCode]) {
                this.keysPressed[keyCode] = false;
            }
        });
    }

    handleKeysPressed(keyCode) {
        if (keyCode === "ArrowLeft") {
            this.keysPressed.ArrowLeft = true;
        } else if (keyCode === "ArrowRight") {
            this.keysPressed.ArrowRight = true;
        }

        // Handle jump
        if (keyCode === "ArrowUp") {
            this.keysPressed.ArrowUp = true;
        }

        // Handle punch
        if (keyCode === "KeyP") {
            this.keysPressed.KeyP = true;
            setTimeout(() => {
                this.keysPressed.KeyP = false;
            }, this.PUNCH_DURATION);
        }

        // Handle kick
        if (keyCode === "KeyK" && !this.isKicking && !this.isPunching) {
            this.keysPressed.KeyK = true;
            setTimeout(() => {
                this.keysPressed.KeyK = false;
            }, this.KICK_DURATION);
        }
    }

    sendBatch() {
        // Tag each frame in inputsOnDeck with its estimated server tick
        const frames = [...this.gameLoop.inputsOnDeck];
        for (const frame of frames) {
            if (frame.serverTick == null || isNaN(frame.serverTick)) {
                frame.serverTick = this.getEstimatedServerTick();
            }
            // Store in inputHistory for reconciliation
            this.inputHistory[frame.serverTick] = { ...frame };
        }

        const data = {
            keysPressed: frames,
        };

        if (this._sendLogCount === undefined) this._sendLogCount = 0;
        if (this._sendLogCount < 20) {
            const ticks = frames.map(f => f.serverTick);
            const hasMovement = frames.some(f => f.ArrowLeft || f.ArrowRight || f.ArrowUp);
            console.log(`[CLIENT SEND] batch: ${frames.length} frames, ticks=[${ticks}], isMatchStarted=${this.isMatchStarted}, estTick=${this.getEstimatedServerTick()}, hasMovement=${hasMovement}`);
            this._sendLogCount++;
        }

        this.gameLoop.inputsOnDeck = [];
        this.socket.emit("playerInputBatch", data);
    }

    pruneInputsBefore(tick) {
        for (const key of Object.keys(this.inputHistory)) {
            if (Number(key) < tick) {
                delete this.inputHistory[key];
            }
        }
    }

    // Clean up when no longer needed
    destroy() {
        clearInterval(this.batchTimer);
        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
    }
}
