import CONSTS from "./contants.js";

const {
    FLOOR_HEIGHT,
    STICK_HEAD_RADIUS,
    STICK_HEAD_CENTER_Y,
    STICK_NECK_Y,
    STICK_SHOULDER_Y,
    STICK_HIP_Y,
    STICK_FOOT_Y,
    STICK_LINE_WIDTH,
} = CONSTS;

export function DrawPlayer(ctx, player) {
    ctx.save();

    const w = player.characterWidth;
    const h = player.characterHeight;
    const cx = player.x + w / 2;
    const color = player.color;

    // Crouch compression factor
    const crouch = player.isCrouching ? 0.5 : 1;

    // Helper to compute y positions with crouch scaling
    // When crouching, proportions compress toward the bottom of the bounding box
    const yOff = (offset) => player.y + h - (h - offset) * crouch;

    const headCY = yOff(STICK_HEAD_CENTER_Y);
    const neckY = yOff(STICK_NECK_Y);
    const shoulderY = yOff(STICK_SHOULDER_Y);
    const hipY = yOff(STICK_HIP_Y);
    const footY = yOff(STICK_FOOT_Y);
    const headR = STICK_HEAD_RADIUS * crouch;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = STICK_LINE_WIDTH;
    ctx.lineCap = "round";

    // Head — filled circle
    ctx.beginPath();
    ctx.arc(cx, headCY, headR, 0, Math.PI * 2);
    ctx.fill();

    // Torso — neck to hips
    ctx.beginPath();
    ctx.moveTo(cx, neckY);
    ctx.lineTo(cx, hipY);
    ctx.stroke();

    // Arms (idle) — skip when punching, DrawPunch handles both arms
    if (!player.isPunching) {
        const armSpread = 15 * crouch;
        const armDrop = 16 * crouch;
        // Left arm
        ctx.beginPath();
        ctx.moveTo(cx, shoulderY);
        ctx.lineTo(cx - armSpread, shoulderY + armDrop);
        ctx.stroke();
        // Right arm
        ctx.beginPath();
        ctx.moveTo(cx, shoulderY);
        ctx.lineTo(cx + armSpread, shoulderY + armDrop);
        ctx.stroke();
    }

    // Legs — skip when kicking, DrawKick handles both legs
    if (!player.isKicking) {
        if (player.isJumping) {
            // Tuck legs when jumping — knees bent inward
            const tuckX = 10 * crouch;
            const tuckY = (hipY + footY) / 2; // knees at midpoint
            // Left leg tucked
            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx - tuckX, tuckY);
            ctx.stroke();
            // Right leg tucked
            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx + tuckX, tuckY);
            ctx.stroke();
        } else {
            // Standing legs — V-shape from hips to feet
            const legSpread = 12;
            // Left leg
            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx - legSpread, footY);
            ctx.stroke();
            // Right leg
            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx + legSpread, footY);
            ctx.stroke();
        }
    }

    ctx.restore();
}

export function DrawHealthBar(ctx, player) {
    const w = player.characterWidth;
    const maxHealth = player.maxHealth;
    const health = Math.max(0, Math.min(player.health, maxHealth));
    const pct = maxHealth > 0 ? health / maxHealth : 0;
    const barHeight = 6;
    const barPadding = 2;
    const x = player.x;
    const y = Math.max(2, player.y - barHeight - barPadding);

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x, y, w, barHeight);

    ctx.fillStyle = pct > 0.5 ? "#22c55e" : pct > 0.2 ? "#f59e0b" : "#ef4444";
    ctx.fillRect(x, y, w * pct, barHeight);

    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, barHeight);
}

export function DrawPunch(ctx, player) {
    ctx.save();

    const w = player.characterWidth;
    const h = player.characterHeight;
    const cx = player.x + w / 2;
    const color = player.color;

    const crouch = player.isCrouching ? 0.5 : 1;
    const yOff = (offset) => player.y + h - (h - offset) * crouch;

    const shoulderY = yOff(STICK_SHOULDER_Y);
    const armSpread = 15 * crouch;
    const armDrop = 16 * crouch;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = STICK_LINE_WIDTH;
    ctx.lineCap = "round";

    if (player.facing === "right") {
        // Non-punching arm (left) — idle position
        ctx.beginPath();
        ctx.moveTo(cx, shoulderY);
        ctx.lineTo(cx - armSpread, shoulderY + armDrop);
        ctx.stroke();

        // Punching arm (right) — extends to hitbox endpoint
        const fistX = player.x + w + player.armWidth;
        const fistY = shoulderY;
        ctx.beginPath();
        ctx.moveTo(cx, shoulderY);
        ctx.lineTo(fistX, fistY);
        ctx.stroke();

        // Fist circle
        ctx.beginPath();
        ctx.arc(fistX, fistY, 4, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Non-punching arm (right) — idle position
        ctx.beginPath();
        ctx.moveTo(cx, shoulderY);
        ctx.lineTo(cx + armSpread, shoulderY + armDrop);
        ctx.stroke();

        // Punching arm (left) — extends to hitbox endpoint
        const fistX = player.x - player.armWidth;
        const fistY = shoulderY;
        ctx.beginPath();
        ctx.moveTo(cx, shoulderY);
        ctx.lineTo(fistX, fistY);
        ctx.stroke();

        // Fist circle
        ctx.beginPath();
        ctx.arc(fistX, fistY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

export function DrawInitialScene(canvas, ctx) {
    const { FLOOR_HEIGHT, CANVAS_HEIGHT } = CONSTS;
    const FLOOR_Y = CANVAS_HEIGHT - FLOOR_HEIGHT;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw floor
    ctx.fillStyle = "#8B4513"; // Brown floor
    ctx.fillRect(0, FLOOR_Y, canvas.width, FLOOR_HEIGHT);

    // Draw grass on top of floor
    ctx.fillStyle = "#228B22"; // Forest green
    ctx.fillRect(0, FLOOR_Y, canvas.width, 5);

    // Draw loading text
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Connecting to server...", canvas.width / 2, canvas.height / 2);
}

export function DrawKick(ctx, player) {
    ctx.save();

    const w = player.characterWidth;
    const h = player.characterHeight;
    const cx = player.x + w / 2;
    const color = player.color;

    const crouch = player.isCrouching ? 0.5 : 1;
    const yOff = (offset) => player.y + h - (h - offset) * crouch;

    const hipY = yOff(STICK_HIP_Y);
    const footY = yOff(STICK_FOOT_Y);
    const legSpread = 12;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = STICK_LINE_WIDTH;
    ctx.lineCap = "round";

    // Kick Y position — use player's legYOffset for hitbox alignment
    const kickY = yOff(player.legYOffset);

    if (player.facing === "right") {
        // Non-kicking leg (left) — idle position
        ctx.beginPath();
        ctx.moveTo(cx, hipY);
        ctx.lineTo(cx - legSpread, footY);
        ctx.stroke();

        // Kicking leg (right) — extends to hitbox endpoint
        const footEndX = player.x + w + player.legWidth;
        ctx.beginPath();
        ctx.moveTo(cx, hipY);
        ctx.lineTo(footEndX, kickY);
        ctx.stroke();

        // Foot circle
        ctx.beginPath();
        ctx.arc(footEndX, kickY, 4, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Non-kicking leg (right) — idle position
        ctx.beginPath();
        ctx.moveTo(cx, hipY);
        ctx.lineTo(cx + legSpread, footY);
        ctx.stroke();

        // Kicking leg (left) — extends to hitbox endpoint
        const footEndX = player.x - player.legWidth;
        ctx.beginPath();
        ctx.moveTo(cx, hipY);
        ctx.lineTo(footEndX, kickY);
        ctx.stroke();

        // Foot circle
        ctx.beginPath();
        ctx.arc(footEndX, kickY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

export function DrawFaceDirection(ctx, player) {
    ctx.save();

    const w = player.characterWidth;
    const h = player.characterHeight;
    const cx = player.x + w / 2;

    const crouch = player.isCrouching ? 0.5 : 1;
    const headCY = player.y + h - (h - STICK_HEAD_CENTER_Y) * crouch;
    const headR = STICK_HEAD_RADIUS * crouch;

    // Eye placement on the head
    const eyeR = 2.5;
    const pupilR = 1.2;
    const eyeOffsetX = headR * 0.35; // horizontal offset from center
    const eyeSpacing = headR * 0.35; // spacing between eyes
    const eyeOffsetY = -headR * 0.1; // slightly above center

    if (player.facing === "right") {
        const eye1X = cx + eyeOffsetX;
        const eye2X = cx + eyeOffsetX + eyeSpacing;
        const eyeY = headCY + eyeOffsetY;

        // White eye circles
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(eye1X, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye2X, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();

        // Pupils — shifted toward facing direction
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(eye1X + 0.8, eyeY, pupilR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye2X + 0.8, eyeY, pupilR, 0, Math.PI * 2);
        ctx.fill();
    } else {
        const eye1X = cx - eyeOffsetX;
        const eye2X = cx - eyeOffsetX - eyeSpacing;
        const eyeY = headCY + eyeOffsetY;

        // White eye circles
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(eye1X, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye2X, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();

        // Pupils — shifted toward facing direction
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(eye1X - 0.8, eyeY, pupilR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye2X - 0.8, eyeY, pupilR, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

export function DrawYou(ctx, player) {
    ctx.save();

    const w = player.characterWidth;
    const h = player.characterHeight;
    const cx = player.x + w / 2;

    // "YOU" label above player
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("YOU", cx, player.y - 10);

    // Dashed ellipse outline around the stick figure
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(cx, player.y + h / 2, w / 2 + 4, h / 2 + 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

export function DrawFloor(ctx, canvas) {
    let FLOOR_Y = canvas.height - FLOOR_HEIGHT;

    ctx.fillStyle = "#8B4513"; // Brown floor
    ctx.fillRect(0, FLOOR_Y, canvas.width, FLOOR_HEIGHT);

    // Draw grass on top of floor
    ctx.fillStyle = "#228B22"; // Forest green
    ctx.fillRect(0, FLOOR_Y, canvas.width, 5);
}
