// Import true constants from shared
import {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    FLOOR_HEIGHT,
    FLOOR_Y,
    GRAVITY,
    SERVER_TICK_RATE,
} from "@shared/gameConstants.js";

const CONSTS = {
    // Re-exported from shared (single source of truth)
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    FLOOR_HEIGHT,
    FLOOR_Y,
    GRAVITY,
    SERVER_TICK_RATE,

    // Client-only constants
    PREDICTION_BUFFER_MS: 100,
    inputCooldown: 100,
    INTERPOLATION_AMOUNT: 0.2,
    INTERPOLATION_DELAY: 100,

    // Stick figure drawing proportions (client-only visual constants)
    STICK_HEAD_RADIUS: 10,
    STICK_HEAD_CENTER_Y: 12,
    STICK_NECK_Y: 22,
    STICK_SHOULDER_Y: 30,
    STICK_HIP_Y: 62,
    STICK_FOOT_Y: 98,
    STICK_LINE_WIDTH: 3,
};

export default CONSTS;
