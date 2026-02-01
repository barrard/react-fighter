// InputBatchHandler.js
import { encodeInputMask } from "@shared/inputFlags.js";

export default class InputBatchHandler {
    constructor(socket) {
        this.socket = socket;
        this.debugNet = import.meta.env.VITE_DEBUG_NET === "true";
        this.lastDebugAt = 0;
        this.debugFramesLogged = 0;
        this.matchStartLogged = false;
        this.latencyProbeHandler = null;
        this.latencyAckHandler = null;
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
        this.setupLatencyCalibration();
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
        if (this.debugNet && !this.matchStartLogged) {
            this.matchStartLogged = true;
            console.log("InputBatchHandler: matchStart applied", {
                serverTickAtStart: this.serverTickAtStart,
                matchStartTick: this.matchStartTick,
                tickRate: this.tickRate,
                estimatedOneWayDelay: this.estimatedOneWayDelay,
                estimatedTickNow: this.getEstimatedServerTick(),
            });
        }
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

    setupLatencyCalibration() {
        this.latencyProbeHandler = (data = {}) => {
            const seq = data.seq;
            const serverSentAt = data.serverSentAt;
            if (!seq || !serverSentAt) return;
            if (this.debugNet) {
                console.log("InputBatchHandler: latencyProbe received", { seq, serverSentAt });
            }
            this.socket.emit("latencyPong", { seq, serverSentAt });
        };

        this.latencyAckHandler = (data = {}) => {
            const latencyMs = Number(data.latencyMs);
            if (this.latencyMonitor && !isNaN(latencyMs)) {
                this.latencyMonitor.applyServerLatency(latencyMs);
                if (this.debugNet) {
                    console.log("InputBatchHandler: latencyAck received", { seq: data.seq, latencyMs });
                }
            }
        };

        this.socket.on("latencyProbe", this.latencyProbeHandler);
        this.socket.on("latencyAck", this.latencyAckHandler);
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
        if (!this.isMatchStarted) return;
        // Tag each frame in inputsOnDeck with its estimated server tick
        const frames = [...this.gameLoop.inputsOnDeck];
        if (frames.length === 0) return;
        for (const frame of frames) {
            if (frame.serverTick == null || isNaN(frame.serverTick)) {
                frame.serverTick = this.getEstimatedServerTick();
            }
            // Store in inputHistory for reconciliation
            this.inputHistory[frame.serverTick] = { ...frame };
        }

        const data = {
            b: frames.map((frame) => ({
                t: frame.serverTick,
                f: frame.frame ?? null,
                k: encodeInputMask(frame),
            })),
        };

        if (this.debugNet) {
            const ticks = frames.map((f) => f.serverTick).filter((t) => t != null);
            if (this.debugFramesLogged < 10) {
                const remaining = 10 - this.debugFramesLogged;
                const sample = frames.slice(0, remaining);
                const sampleTicks = sample.map((f) => f.serverTick).filter((t) => t != null);
                console.log(
                    `[CLIENT SEND FIRST] frames=${sample.length} ticks=[${sampleTicks.join(",")}] estTick=${this.getEstimatedServerTick()}`
                );
                this.debugFramesLogged += sample.length;
            }
            const now = performance.now();
            if (now - this.lastDebugAt > 1000) {
                this.lastDebugAt = now;
                const minTick = ticks.length ? Math.min(...ticks) : null;
                const maxTick = ticks.length ? Math.max(...ticks) : null;
                console.log(
                    `[CLIENT SEND] batch=${frames.length} tickRange=${minTick}-${maxTick} estTick=${this.getEstimatedServerTick()}`
                );
            }
        }

        this.gameLoop.inputsOnDeck = [];
        this.socket.emit("ib", data);
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
        if (this.latencyProbeHandler) {
            this.socket.off("latencyProbe", this.latencyProbeHandler);
        }
        if (this.latencyAckHandler) {
            this.socket.off("latencyAck", this.latencyAckHandler);
        }
    }
}
