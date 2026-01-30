import { DrawPlayer, DrawPunch, DrawKick, DrawFaceDirection, DrawYou, DrawFloor, DrawInitialScene } from "./Draw.js";
import CONSTS from "./contants.js";
export default class Canvas {
    constructor(socket, canvasRef) {
        this.canvas = canvasRef; //document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");

        // Game elements
        this.status = document.getElementById("status");

        DrawInitialScene(this.canvas, this.ctx);
        this.init();
    }

    init() {
        const {
            PREDICTION_BUFFER_MS,
            inputCooldown,
            INTERPOLATION_AMOUNT,
            INTERPOLATION_DELAY,
            PLAYER_WIDTH,
            PLAYER_HEIGHT,
            MOVEMENT_SPEED,
            FLOOR_HEIGHT,
            JUMP_VELOCITY,
            GRAVITY,
            AIR_RESISTANCE,
            GROUND_FRICTION,
            PUNCH_DURATION,
            KICK_DURATION,
            ARM_WIDTH,
            ARM_HEIGHT,
            ARM_Y_OFFSET,
            LEG_WIDTH,
            LEG_HEIGHT,
            LEG_Y_OFFSET,
            CANVAS_HEIGHT,
        } = CONSTS;
        this.FLOOR_HEIGHT = FLOOR_HEIGHT;
        this.FLOOR_Y = CANVAS_HEIGHT - FLOOR_HEIGHT;

    }
}
