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
    const isCrouching = player.isCrouching;

    // Base positions (standing)
    const baseFootY = player.y + h - (h - STICK_FOOT_Y);
    const baseHipY = player.y + h - (h - STICK_HIP_Y);
    const baseShoulderY = player.y + h - (h - STICK_SHOULDER_Y);
    const baseNeckY = player.y + h - (h - STICK_NECK_Y);
    const baseHeadCY = player.y + h - (h - STICK_HEAD_CENTER_Y);

    // Crouch offsets — lower the upper body, keep feet planted
    const crouchDrop = isCrouching ? 38 : 0; // how much the hips drop
    const torsoShrink = isCrouching ? 14 : 0; // torso/neck shortens

    const footY = baseFootY; // feet stay planted
    const hipY = baseHipY + crouchDrop;
    const shoulderY = baseShoulderY + crouchDrop + torsoShrink;
    const neckY = baseNeckY + crouchDrop + torsoShrink;
    const headCY = baseHeadCY + crouchDrop + torsoShrink;
    const headR = STICK_HEAD_RADIUS; // head stays same size

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
        const armLength = 20; // total arm length
        const upperArm = 10;  // shoulder to elbow
        const forearm = 10;   // elbow to hand

        // Check if player is walking
        const hasVelocity = player.horizontalVelocity && player.horizontalVelocity !== 0;
        const isInterpolating = player.targetX !== undefined && Math.abs(player.targetX - player.x) > 0.5;
        const isWalking = (hasVelocity || isInterpolating) && !player.isJumping && !isCrouching;

        if (isWalking) {
            // Walking animation — arms swing with elbows
            const walkCycle = (player.x / 35) * Math.PI;
            const armSwing = Math.sin(walkCycle) * 0.6; // swing angle in radians

            // Left arm
            const leftElbowX = cx - 6 + Math.sin(armSwing) * upperArm;
            const leftElbowY = shoulderY + Math.cos(armSwing) * upperArm;
            const leftHandX = leftElbowX + Math.sin(armSwing + 0.3) * forearm;
            const leftHandY = leftElbowY + Math.cos(armSwing + 0.3) * forearm;
            ctx.beginPath();
            ctx.moveTo(cx, shoulderY);
            ctx.lineTo(leftElbowX, leftElbowY);
            ctx.lineTo(leftHandX, leftHandY);
            ctx.stroke();

            // Right arm — opposite phase
            const rightElbowX = cx + 6 + Math.sin(-armSwing) * upperArm;
            const rightElbowY = shoulderY + Math.cos(-armSwing) * upperArm;
            const rightHandX = rightElbowX + Math.sin(-armSwing + 0.3) * forearm;
            const rightHandY = rightElbowY + Math.cos(-armSwing + 0.3) * forearm;
            ctx.beginPath();
            ctx.moveTo(cx, shoulderY);
            ctx.lineTo(rightElbowX, rightElbowY);
            ctx.lineTo(rightHandX, rightHandY);
            ctx.stroke();
        } else {
            // Idle/crouch standing arms with elbows
            const elbowSpread = 10;
            const elbowDrop = 10;
            const handSpread = 6;
            const handDrop = 18;

            // Left arm — shoulder to elbow to hand
            ctx.beginPath();
            ctx.moveTo(cx, shoulderY);
            ctx.lineTo(cx - elbowSpread, shoulderY + elbowDrop);
            ctx.lineTo(cx - handSpread, shoulderY + handDrop);
            ctx.stroke();
            // Right arm
            ctx.beginPath();
            ctx.moveTo(cx, shoulderY);
            ctx.lineTo(cx + elbowSpread, shoulderY + elbowDrop);
            ctx.lineTo(cx + handSpread, shoulderY + handDrop);
            ctx.stroke();
        }
    }

    // Legs — skip when kicking, DrawKick handles both legs
    if (!player.isKicking) {
        const legLength = footY - hipY;
        const thighLength = legLength * 0.5;
        const shinLength = legLength * 0.5;

        if (player.isJumping) {
            // Tuck legs when jumping — knees bent inward and up
            const kneeSpread = 8;
            const kneeY = hipY + thighLength * 0.6;
            const footTuck = 4;
            const footY2 = kneeY + shinLength * 0.5;

            // Left leg tucked
            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx - kneeSpread, kneeY);
            ctx.lineTo(cx - footTuck, footY2);
            ctx.stroke();
            // Right leg tucked
            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx + kneeSpread, kneeY);
            ctx.lineTo(cx + footTuck, footY2);
            ctx.stroke();
        } else if (isCrouching) {
            // Crouching — bent knees, feet planted wide
            const kneeSpread = 20;
            const footSpread = 14;
            const kneeY = hipY + (footY - hipY) * 0.5;

            // Left leg — hip to knee to foot
            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx - kneeSpread, kneeY);
            ctx.lineTo(cx - footSpread, footY);
            ctx.stroke();

            // Right leg — hip to knee to foot
            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx + kneeSpread, kneeY);
            ctx.lineTo(cx + footSpread, footY);
            ctx.stroke();
        } else {
            // Check if player is walking
            const hasVelocity = player.horizontalVelocity && player.horizontalVelocity !== 0;
            const isInterpolating = player.targetX !== undefined && Math.abs(player.targetX - player.x) > 0.5;
            const isWalking = hasVelocity || isInterpolating;
            const legSpread = 8;

            if (isWalking) {
                // Walking animation with knees
                const walkCycle = (player.x / 35) * Math.PI;
                const legSwing = Math.sin(walkCycle) * 0.5; // swing angle

                // Left leg
                const leftKneeX = cx - 4 + Math.sin(legSwing) * thighLength * 0.3;
                const leftKneeY = hipY + Math.cos(legSwing * 0.5) * thighLength;
                const leftFootX = leftKneeX + Math.sin(legSwing * 0.8) * shinLength * 0.2;
                const leftFootYCalc = leftKneeY + shinLength - Math.abs(Math.sin(walkCycle)) * 6;
                ctx.beginPath();
                ctx.moveTo(cx, hipY);
                ctx.lineTo(leftKneeX, leftKneeY);
                ctx.lineTo(leftFootX, Math.min(leftFootYCalc, footY));
                ctx.stroke();

                // Right leg — opposite phase
                const rightKneeX = cx + 4 + Math.sin(-legSwing) * thighLength * 0.3;
                const rightKneeY = hipY + Math.cos(-legSwing * 0.5) * thighLength;
                const rightFootX = rightKneeX + Math.sin(-legSwing * 0.8) * shinLength * 0.2;
                const rightFootYCalc = rightKneeY + shinLength - Math.abs(Math.cos(walkCycle)) * 6;
                ctx.beginPath();
                ctx.moveTo(cx, hipY);
                ctx.lineTo(rightKneeX, rightKneeY);
                ctx.lineTo(rightFootX, Math.min(rightFootYCalc, footY));
                ctx.stroke();
            } else {
                // Standing legs with slight knee bend
                const kneeY = hipY + thighLength;
                const kneeBend = 3; // slight outward bend

                // Left leg
                ctx.beginPath();
                ctx.moveTo(cx, hipY);
                ctx.lineTo(cx - legSpread - kneeBend, kneeY);
                ctx.lineTo(cx - legSpread, footY);
                ctx.stroke();
                // Right leg
                ctx.beginPath();
                ctx.moveTo(cx, hipY);
                ctx.lineTo(cx + legSpread + kneeBend, kneeY);
                ctx.lineTo(cx + legSpread, footY);
                ctx.stroke();
            }
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
    const isCrouching = player.isCrouching;

    // Crouch offsets — same as DrawPlayer
    const crouchDrop = isCrouching ? 38 : 0;
    const torsoShrink = isCrouching ? 14 : 0;

    const baseShoulderY = player.y + h - (h - STICK_SHOULDER_Y);
    const shoulderY = baseShoulderY + crouchDrop + torsoShrink;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = STICK_LINE_WIDTH;
    ctx.lineCap = "round";

    // Idle arm with elbow
    const elbowSpread = 10;
    const elbowDrop = 10;
    const handSpread = 6;
    const handDrop = 18;

    if (player.facing === "right") {
        // Non-punching arm (left) — idle position with elbow
        ctx.beginPath();
        ctx.moveTo(cx, shoulderY);
        ctx.lineTo(cx - elbowSpread, shoulderY + elbowDrop);
        ctx.lineTo(cx - handSpread, shoulderY + handDrop);
        ctx.stroke();

        // Punching arm (right) — shoulder to elbow to fist
        const fistX = player.x + w + player.armWidth;
        const fistY = shoulderY;
        const elbowX = cx + (fistX - cx) * 0.4;
        const elbowY = shoulderY + 4; // elbow slightly below shoulder line
        ctx.beginPath();
        ctx.moveTo(cx, shoulderY);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(fistX, fistY);
        ctx.stroke();

        // Fist circle
        ctx.beginPath();
        ctx.arc(fistX, fistY, 4, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Non-punching arm (right) — idle position with elbow
        ctx.beginPath();
        ctx.moveTo(cx, shoulderY);
        ctx.lineTo(cx + elbowSpread, shoulderY + elbowDrop);
        ctx.lineTo(cx + handSpread, shoulderY + handDrop);
        ctx.stroke();

        // Punching arm (left) — shoulder to elbow to fist
        const fistX = player.x - player.armWidth;
        const fistY = shoulderY;
        const elbowX = cx - (cx - fistX) * 0.4;
        const elbowY = shoulderY + 4;
        ctx.beginPath();
        ctx.moveTo(cx, shoulderY);
        ctx.lineTo(elbowX, elbowY);
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
    const isCrouching = player.isCrouching;

    // Crouch offsets — same as DrawPlayer
    const crouchDrop = isCrouching ? 38 : 0;

    const baseHipY = player.y + h - (h - STICK_HIP_Y);
    const baseFootY = player.y + h - (h - STICK_FOOT_Y);
    const hipY = baseHipY + crouchDrop;
    const footY = baseFootY;
    const legSpread = 8;

    const legLength = footY - hipY;
    const thighLength = legLength * 0.5;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = STICK_LINE_WIDTH;
    ctx.lineCap = "round";

    // Kick Y position — use player's legYOffset for hitbox alignment
    const baseKickY = player.y + h - (h - player.legYOffset);
    const kickY = baseKickY + crouchDrop;

    if (player.facing === "right") {
        // Non-kicking leg (left) — with knee
        const kneeY = hipY + thighLength;
        const kneeBend = 3;
        ctx.beginPath();
        ctx.moveTo(cx, hipY);
        ctx.lineTo(cx - legSpread - kneeBend, kneeY);
        ctx.lineTo(cx - legSpread, footY);
        ctx.stroke();

        // Kicking leg (right) — hip to knee to foot
        const footEndX = player.x + w + player.legWidth;
        const kneeX = cx + (footEndX - cx) * 0.35;
        const kneeKickY = hipY + 8; // knee raised and bent
        ctx.beginPath();
        ctx.moveTo(cx, hipY);
        ctx.lineTo(kneeX, kneeKickY);
        ctx.lineTo(footEndX, kickY);
        ctx.stroke();

        // Foot circle
        ctx.beginPath();
        ctx.arc(footEndX, kickY, 4, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Non-kicking leg (right) — with knee
        const kneeY = hipY + thighLength;
        const kneeBend = 3;
        ctx.beginPath();
        ctx.moveTo(cx, hipY);
        ctx.lineTo(cx + legSpread + kneeBend, kneeY);
        ctx.lineTo(cx + legSpread, footY);
        ctx.stroke();

        // Kicking leg (left) — hip to knee to foot
        const footEndX = player.x - player.legWidth;
        const kneeX = cx - (cx - footEndX) * 0.35;
        const kneeKickY = hipY + 8;
        ctx.beginPath();
        ctx.moveTo(cx, hipY);
        ctx.lineTo(kneeX, kneeKickY);
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
    const isCrouching = player.isCrouching;

    // Crouch offsets — same as DrawPlayer
    const crouchDrop = isCrouching ? 38 : 0;
    const torsoShrink = isCrouching ? 14 : 0;

    const baseHeadCY = player.y + h - (h - STICK_HEAD_CENTER_Y);
    const headCY = baseHeadCY + crouchDrop + torsoShrink;
    const headR = STICK_HEAD_RADIUS; // head stays same size

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
    const cx = player.x + w / 2;

    // "YOU" label above player
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("YOU", cx, player.y - 10);

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
