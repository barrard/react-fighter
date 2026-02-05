// InputBatchHandler.js
import { encodeInputMask } from "@shared/inputFlags.js";
import { BASE_STATS } from "@shared/Characters.js";
import { ATTACK_TYPES, getAttackTypeName } from "@shared/attackTypes.js";

// Key -> Action mapping (easy to customize)
const KEY_MAP = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "jump",
    ArrowDown: "crouch",
    Space: "jump",
    KeyZ: "punch",
    KeyX: "kick",
};

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

        // Animation durations from shared character stats (legacy)
        this.PUNCH_DURATION = BASE_STATS.punchDuration;
        this.KICK_DURATION = BASE_STATS.kickDuration;

        // Directional attack durations
        this.attackDurations = BASE_STATS.attacks;

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
        // Track actions, not key codes
        this.keysPressed = {
            left: false,
            right: false,
            jump: false,
            crouch: false,
            punch: false,
            kick: false,
            attackType: ATTACK_TYPES.NONE,
        };
    }

    resetForRound() {
        this.isMatchStarted = false;
        this.inputHistory = {};
        this.setDefaultInputState();
    }

    setupEventListeners() {
        // Handle keydown events
        window.addEventListener("keydown", (e) => {
            const action = KEY_MAP[e.code];
            if (action) {
                if (action === "jump") e.preventDefault(); // Prevent page scroll
                this.handleActionDown(action);
            }
        });

        // Handle keyup events
        window.addEventListener("keyup", (e) => {
            const action = KEY_MAP[e.code];
            if (action) {
                this.handleActionUp(action);
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

    handleActionDown(action) {
        // Movement and jump are held
        if (action === "left" || action === "right" || action === "jump" || action === "crouch") {
            this.keysPressed[action] = true;
            return;
        }

        // Already attacking - ignore new attack inputs
        if (this.keysPressed.attackType !== ATTACK_TYPES.NONE) {
            return;
        }

        // Determine attack type based on direction + action
        let attackType = ATTACK_TYPES.NONE;
        let duration = 0;

        if (action === "punch") {
            if (this.keysPressed.jump) {
                attackType = ATTACK_TYPES.HIGH_PUNCH;
                duration = this.attackDurations.highPunch.duration;
            } else if (this.keysPressed.crouch) {
                attackType = ATTACK_TYPES.LOW_PUNCH;
                duration = this.attackDurations.lowPunch.duration;
            } else {
                attackType = ATTACK_TYPES.MID_PUNCH;
                duration = this.attackDurations.midPunch.duration;
            }
        } else if (action === "kick") {
            if (this.keysPressed.jump) {
                attackType = ATTACK_TYPES.HIGH_KICK;
                duration = this.attackDurations.highKick.duration;
            } else if (this.keysPressed.crouch) {
                attackType = ATTACK_TYPES.LOW_KICK;
                duration = this.attackDurations.lowKick.duration;
            } else {
                attackType = ATTACK_TYPES.MID_KICK;
                duration = this.attackDurations.midKick.duration;
            }
        }

        if (attackType !== ATTACK_TYPES.NONE) {
            this.keysPressed.attackType = attackType;
            // Set legacy flags for compatibility
            this.keysPressed.punch = attackType >= ATTACK_TYPES.HIGH_PUNCH && attackType <= ATTACK_TYPES.LOW_PUNCH;
            this.keysPressed.kick = attackType >= ATTACK_TYPES.HIGH_KICK && attackType <= ATTACK_TYPES.LOW_KICK;

            // Auto-release after attack-specific duration
            setTimeout(() => {
                this.keysPressed.attackType = ATTACK_TYPES.NONE;
                this.keysPressed.punch = false;
                this.keysPressed.kick = false;
            }, duration);
        }
    }

    handleActionUp(action) {
        // Only release held actions (not punch/kick which auto-release)
        if (action === "left" || action === "right" || action === "jump" || action === "crouch") {
            this.keysPressed[action] = false;
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
