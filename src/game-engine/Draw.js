import CONSTS from "./contants.js";
import { ATTACK_TYPES, isPunch, isKick, isRanged } from "@shared/attackTypes.js";
import { getProjectileState } from "@shared/projectileSim.js";

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

function getVisual(player) {
    return player.visual || {};
}

function drawBodySilhouette(ctx, player, cx, shoulderY, hipY, headCY) {
    const visual = getVisual(player);
    const shoulderScale = visual.shoulderScale || 1;
    const hipScale = visual.hipScale || 1;
    const bodyShape = visual.bodyShape || "athletic";
    const accent = visual.accentColor || player.color;
    const secondary = visual.secondaryColor || "#111827";
    const shoulderWidth = 12 * shoulderScale;
    const hipWidth = 10 * hipScale;

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(cx - shoulderWidth, shoulderY - 2);
    if (bodyShape === "robe") {
        ctx.lineTo(cx - hipWidth * 1.8, hipY + 12);
        ctx.lineTo(cx + hipWidth * 1.8, hipY + 12);
    } else if (bodyShape === "heavy") {
        ctx.lineTo(cx - hipWidth * 1.3, hipY + 4);
        ctx.lineTo(cx + hipWidth * 1.3, hipY + 4);
    } else if (bodyShape === "lean") {
        ctx.lineTo(cx - hipWidth * 0.85, hipY + 2);
        ctx.lineTo(cx + hipWidth * 0.85, hipY + 2);
    } else {
        ctx.lineTo(cx - hipWidth, hipY + 3);
        ctx.lineTo(cx + hipWidth, hipY + 3);
    }
    ctx.lineTo(cx + shoulderWidth, shoulderY - 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent;
    if (visual.accessory === "pauldron") {
        ctx.fillRect(cx - shoulderWidth - 6, shoulderY - 4, 12, 8);
        ctx.fillRect(cx + shoulderWidth - 6, shoulderY - 4, 12, 8);
    } else if (visual.accessory === "mask") {
        ctx.fillRect(cx - 10, headCY - 4, 20, 6);
    } else if (visual.accessory === "quiver") {
        ctx.fillRect(cx - 14, shoulderY + 4, 6, 18);
    } else if (visual.accessory === "fur") {
        ctx.beginPath();
        ctx.moveTo(cx - shoulderWidth, shoulderY);
        ctx.lineTo(cx, shoulderY + 10);
        ctx.lineTo(cx + shoulderWidth, shoulderY);
        ctx.closePath();
        ctx.fill();
    } else if (visual.accessory === "sash") {
        ctx.fillRect(cx - 12, hipY - 2, 24, 4);
    } else if (visual.accessory === "glow") {
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(cx, headCY, 18, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawHeadStyle(ctx, player, cx, headCY) {
    const visual = getVisual(player);
    const accent = visual.accentColor || "#f8fafc";
    const secondary = visual.secondaryColor || "#111827";

    ctx.save();
    ctx.fillStyle = accent;
    if (visual.headShape === "square") {
        ctx.fillRect(cx - 9, headCY - 9, 18, 18);
    } else if (visual.headShape === "oval") {
        ctx.beginPath();
        ctx.ellipse(cx, headCY, 9, 11, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.arc(cx, headCY, STICK_HEAD_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = secondary;
    if (visual.hairStyle === "hood") {
        ctx.beginPath();
        ctx.arc(cx, headCY - 2, 12, Math.PI, 0);
        ctx.fill();
    } else if (visual.hairStyle === "crest") {
        ctx.fillRect(cx - 3, headCY - 18, 6, 10);
    } else if (visual.hairStyle === "topknot") {
        ctx.beginPath();
        ctx.arc(cx, headCY - 12, 4, 0, Math.PI * 2);
        ctx.fill();
    } else if (visual.hairStyle === "short") {
        ctx.fillRect(cx - 8, headCY - 11, 16, 5);
    }
    ctx.restore();
}

function drawIdleWeapon(ctx, player, cx, shoulderY, hipY) {
    const visual = getVisual(player);
    const accent = visual.accentColor || "#f8fafc";
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.lineWidth = 2;

    if (visual.weapon === "sword") {
        ctx.beginPath();
        ctx.moveTo(cx + 16, shoulderY + 2);
        ctx.lineTo(cx + 16, hipY + 20);
        ctx.stroke();
    } else if (visual.weapon === "staff") {
        ctx.beginPath();
        ctx.moveTo(cx - 16, shoulderY - 4);
        ctx.lineTo(cx - 10, hipY + 24);
        ctx.stroke();
    } else if (visual.weapon === "bow") {
        ctx.beginPath();
        ctx.arc(cx + 18, shoulderY + 10, 14, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
    } else if (visual.weapon === "dagger") {
        ctx.beginPath();
        ctx.moveTo(cx - 14, shoulderY + 8);
        ctx.lineTo(cx - 4, hipY + 8);
        ctx.stroke();
    } else if (visual.weapon === "axe") {
        ctx.beginPath();
        ctx.moveTo(cx + 18, shoulderY - 4);
        ctx.lineTo(cx + 18, hipY + 18);
        ctx.stroke();
        ctx.fillRect(cx + 18, shoulderY - 4, 8, 8);
    } else if (visual.weapon === "beads") {
        ctx.beginPath();
        ctx.arc(cx, shoulderY + 6, 6, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

export function DrawPlayer(ctx, player, timestamp = (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now())) {
    ctx.save();

    const w = player.characterWidth;
    const h = player.characterHeight;
    const cx = player.x + w / 2;
    const color = player.color;
    const isCelebrating = Boolean(player.isCelebrating);
    const isKnockedDown = Boolean(player.isKnockedDown);
    const isCrouching = isCelebrating ? false : player.isCrouching;
    const animationElapsed = player.roundAnimationElapsed ??
        (player.roundAnimation ? Math.max(0, timestamp - (player.roundAnimation.startTime || timestamp)) : 0);

    // Base positions (standing)
    const baseFootY = player.y + h - (h - STICK_FOOT_Y);
    const baseHipY = player.y + h - (h - STICK_HIP_Y);
    const baseShoulderY = player.y + h - (h - STICK_SHOULDER_Y);
    const baseNeckY = player.y + h - (h - STICK_NECK_Y);
    const baseHeadCY = player.y + h - (h - STICK_HEAD_CENTER_Y);

    // Celebration bounce (small jumps)
    const celebrationPhase = animationElapsed / 220;
    const celebrationBounce = isCelebrating ? Math.abs(Math.sin(celebrationPhase * Math.PI)) * 12 : 0;
    const celebrationSway = isCelebrating ? Math.sin(celebrationPhase * Math.PI * 2) * 6 : 0;

    // Crouch offsets — lower the upper body, keep feet planted
    const crouchDrop = isCrouching ? 38 : 0; // how much the hips drop
    const torsoShrink = isCrouching ? 14 : 0; // torso/neck shortens

    const bounceOffset = isCelebrating ? celebrationBounce : 0;
    const footY = baseFootY - bounceOffset; // feet lift when celebrating
    const hipY = baseHipY + crouchDrop - bounceOffset;
    const shoulderY = baseShoulderY + crouchDrop + torsoShrink - bounceOffset;
    const neckY = baseNeckY + crouchDrop + torsoShrink - bounceOffset;
    const headCY = baseHeadCY + crouchDrop + torsoShrink - bounceOffset;
    if (isKnockedDown) {
        const fallProgress = Math.min(1, animationElapsed / 500);
        const easedFall = Math.sin((fallProgress * Math.PI) / 2);
        const direction = player.facing === "left" ? -1 : 1;
        const fallAngle = easedFall * (Math.PI / 2) * direction;
        ctx.translate(cx, baseFootY);
        ctx.rotate(fallAngle);
        ctx.translate(-cx, -baseFootY);
    }

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = STICK_LINE_WIDTH;
    ctx.lineCap = "round";

    drawBodySilhouette(ctx, player, cx, shoulderY, hipY, headCY);
    drawHeadStyle(ctx, player, cx, headCY);

    // Torso — neck to hips
    ctx.beginPath();
    ctx.moveTo(cx, neckY);
    ctx.lineTo(cx, hipY);
    ctx.stroke();

    if (!player.currentAttackType || player.currentAttackType === ATTACK_TYPES.NONE) {
        drawIdleWeapon(ctx, player, cx, shoulderY, hipY);
    }

    // Arms (idle) — skip when punching, DrawPunch handles both arms
    if (!player.isPunching) {
        const upperArm = 10;  // shoulder to elbow
        const forearm = 10;   // elbow to hand

        // Check if player is walking
        const hasVelocity = player.horizontalVelocity && player.horizontalVelocity !== 0;
        const isInterpolating = player.targetX !== undefined && Math.abs(player.targetX - player.x) > 0.5;
        const isWalking = (hasVelocity || isInterpolating) && !player.isJumping && !isCrouching && !isCelebrating && !isKnockedDown;

        if (isCelebrating) {
            const raiseLength = 26;
            const swayOffset = celebrationSway * 0.2;
            // Left arm raised
            ctx.beginPath();
            ctx.moveTo(cx, shoulderY);
            ctx.lineTo(cx - 8 - swayOffset, shoulderY - raiseLength * 0.6);
            ctx.lineTo(cx - 8 - celebrationSway * 0.3, shoulderY - raiseLength);
            ctx.stroke();

            // Right arm raised
            ctx.beginPath();
            ctx.moveTo(cx, shoulderY);
            ctx.lineTo(cx + 8 + swayOffset, shoulderY - raiseLength * 0.6);
            ctx.lineTo(cx + 8 + celebrationSway * 0.3, shoulderY - raiseLength);
            ctx.stroke();
        } else if (isWalking) {
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
        const hopPhase = Math.sin((animationElapsed / 200) * Math.PI * 2);

        if (isCelebrating) {
            // Slight bend while hopping
            const stanceWidth = 14;
            const kneeLift = Math.max(0, hopPhase) * 6;
            const kneeY = hipY + thighLength * 0.7 - kneeLift;

            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx - stanceWidth, kneeY);
            ctx.lineTo(cx - stanceWidth, footY);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx, hipY);
            ctx.lineTo(cx + stanceWidth, kneeY);
            ctx.lineTo(cx + stanceWidth, footY);
            ctx.stroke();
        } else if (player.isJumping) {
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

// Dispatches to the correct directional punch or kick based on currentAttackType
export function DrawAttack(ctx, player, currentTick = null) {
    const attackType = player.currentAttackType || ATTACK_TYPES.NONE;

    // Determine which attack to draw
    if (isPunch(attackType)) {
        DrawDirectionalPunch(ctx, player, attackType);
    } else if (isKick(attackType)) {
        DrawDirectionalKick(ctx, player, attackType);
    } else if (isRanged(attackType)) {
        DrawRangedAttack(ctx, player, currentTick);
    } else if (player.isPunching) {
        // Legacy fallback
        DrawDirectionalPunch(ctx, player, ATTACK_TYPES.MID_PUNCH);
    } else if (player.isKicking) {
        // Legacy fallback
        DrawDirectionalKick(ctx, player, ATTACK_TYPES.MID_KICK);
    }
}

// Draw directional punch with angle based on high/mid/low
export function DrawDirectionalPunch(ctx, player, attackType) {
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

    // Determine punch angle based on attack type
    // HIGH_PUNCH: angle up (-15 degrees), MID_PUNCH: straight (0), LOW_PUNCH: angle down (+20 degrees)
    let punchAngle = 0;
    if (attackType === ATTACK_TYPES.HIGH_PUNCH) {
        punchAngle = -0.25; // ~15 degrees up
    } else if (attackType === ATTACK_TYPES.LOW_PUNCH) {
        punchAngle = 0.35; // ~20 degrees down
    }

    const armLength = player.armWidth || 30;

    if (player.facing === "right") {
        // Non-punching arm (left) — idle position with elbow
        ctx.beginPath();
        ctx.moveTo(cx, shoulderY);
        ctx.lineTo(cx - elbowSpread, shoulderY + elbowDrop);
        ctx.lineTo(cx - handSpread, shoulderY + handDrop);
        ctx.stroke();

        // Punching arm (right) — angled based on attack type
        const fistX = player.x + w + Math.cos(punchAngle) * armLength;
        const fistY = shoulderY + Math.sin(punchAngle) * armLength;
        const elbowX = cx + (fistX - cx) * 0.4;
        const elbowY = shoulderY + (fistY - shoulderY) * 0.4 + 4;
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

        // Punching arm (left) — angled based on attack type
        const fistX = player.x - Math.cos(punchAngle) * armLength;
        const fistY = shoulderY + Math.sin(punchAngle) * armLength;
        const elbowX = cx - (cx - fistX) * 0.4;
        const elbowY = shoulderY + (fistY - shoulderY) * 0.4 + 4;
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

// Legacy DrawPunch - now uses DrawDirectionalPunch with MID_PUNCH
export function DrawPunch(ctx, player) {
    DrawDirectionalPunch(ctx, player, player.currentAttackType || ATTACK_TYPES.MID_PUNCH);
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

// Draw directional kick with angle based on high/mid/low
export function DrawDirectionalKick(ctx, player, attackType) {
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

    // Determine kick angle and Y offset based on attack type
    // HIGH_KICK: angle up, MID_KICK: horizontal, LOW_KICK: angle down (sweep)
    let kickAngle = 0;
    let kickYOffset = player.legYOffset || 70;

    if (attackType === ATTACK_TYPES.HIGH_KICK) {
        kickAngle = -0.4; // ~23 degrees up
        kickYOffset = 10; // Higher kick target
    } else if (attackType === ATTACK_TYPES.LOW_KICK) {
        kickAngle = 0.3; // ~17 degrees down
        kickYOffset = 85; // Lower sweep
    } else {
        // MID_KICK
        kickAngle = 0;
        kickYOffset = 50;
    }

    const legWidth = player.legWidth || 35;

    // Calculate kick Y position
    const baseKickY = player.y + h - (h - kickYOffset);
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

        // Kicking leg (right) — angled based on attack type
        const footEndX = player.x + w + Math.cos(kickAngle) * legWidth;
        const footEndY = kickY + Math.sin(kickAngle) * legWidth;
        const kneeX = cx + (footEndX - cx) * 0.35;
        const kneeKickY = hipY + 8 + (kickAngle < 0 ? -5 : kickAngle > 0 ? 10 : 0);
        ctx.beginPath();
        ctx.moveTo(cx, hipY);
        ctx.lineTo(kneeX, kneeKickY);
        ctx.lineTo(footEndX, footEndY);
        ctx.stroke();

        // Foot circle
        ctx.beginPath();
        ctx.arc(footEndX, footEndY, 4, 0, Math.PI * 2);
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

        // Kicking leg (left) — angled based on attack type
        const footEndX = player.x - Math.cos(kickAngle) * legWidth;
        const footEndY = kickY + Math.sin(kickAngle) * legWidth;
        const kneeX = cx - (cx - footEndX) * 0.35;
        const kneeKickY = hipY + 8 + (kickAngle < 0 ? -5 : kickAngle > 0 ? 10 : 0);
        ctx.beginPath();
        ctx.moveTo(cx, hipY);
        ctx.lineTo(kneeX, kneeKickY);
        ctx.lineTo(footEndX, footEndY);
        ctx.stroke();

        // Foot circle
        ctx.beginPath();
        ctx.arc(footEndX, footEndY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// Legacy DrawKick - now uses DrawDirectionalKick with MID_KICK
export function DrawKick(ctx, player) {
    DrawDirectionalKick(ctx, player, player.currentAttackType || ATTACK_TYPES.MID_KICK);
}

export function DrawRangedAttack(ctx, player, currentTick = null) {
    const ranged = player.rangedAttack;
    if (!ranged) return;

    const w = player.characterWidth;
    const h = player.characterHeight;
    const cx = player.x + w / 2;
    const facingRight = player.facing === "right";
    const launchX = facingRight ? player.x + w + 8 : player.x - 8;
    const accent = ranged.projectileColor || player.visual?.accentColor || "#f8fafc";
    const resolvedTick = currentTick ?? player.attackStartTick ?? 0;
    const projectileState = getProjectileState({
        currentTick: resolvedTick,
        attackStartTick: player.attackStartTick,
        facing: player.facing,
        rangedAttack: ranged,
        spawnX: player.projectileSpawnX,
        spawnHeight: player.projectileSpawnHeight,
    });

    ctx.save();
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.lineWidth = 3;

    // Attack pose
    const shoulderY = player.y + h - (h - STICK_SHOULDER_Y);
    ctx.beginPath();
    ctx.moveTo(cx, shoulderY);
    ctx.lineTo(facingRight ? cx + 8 : cx - 8, shoulderY - 6);
    ctx.lineTo(launchX, shoulderY - 2);
    ctx.stroke();

    if (!projectileState.spawned || projectileState.expired) {
        ctx.restore();
        return;
    }

    const projectileY = CONSTS.FLOOR_Y - player.characterHeight - (player.projectileSpawnHeight ?? 0) + ranged.yOffset;
    const projectileX = projectileState.x;

    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(launchX, shoulderY - 2);
    ctx.lineTo(projectileX, projectileY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (ranged.effect === "arrow") {
        ctx.beginPath();
        ctx.moveTo(projectileX, projectileY);
        ctx.lineTo(projectileX + (facingRight ? 16 : -16), projectileY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(projectileX + (facingRight ? 16 : -16), projectileY);
        ctx.lineTo(projectileX + (facingRight ? 9 : -9), projectileY - 4);
        ctx.lineTo(projectileX + (facingRight ? 9 : -9), projectileY + 4);
        ctx.closePath();
        ctx.fill();
    } else if (ranged.effect === "dagger") {
        ctx.save();
        ctx.translate(projectileX, projectileY);
        ctx.rotate(facingRight ? 0.2 : -0.2);
        ctx.fillRect(facingRight ? 0 : -16, -2, 16, 4);
        ctx.restore();
    } else {
        ctx.beginPath();
        ctx.arc(projectileX, projectileY, 9, 0, Math.PI * 2);
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

// Draws the arena background. The image is rendered in screen space (independent
// of the camera transform) so it always fills the canvas with correct pan/zoom.
// Falls back to the plain floor rect if the image hasn't loaded yet.
export function DrawArena(ctx, canvas, arena, camera) {
    const img = arena?.image;
    if (img?.complete && img.naturalWidth > 0) {
        const { srcX, srcY, srcW, srcH } = camera.getBackgroundCrop(img);
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
    } else {
        const floorY = canvas.height - FLOOR_HEIGHT;
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(0, floorY, canvas.width, FLOOR_HEIGHT);
        ctx.fillStyle = "#228B22";
        ctx.fillRect(0, floorY, canvas.width, 5);
    }
}
