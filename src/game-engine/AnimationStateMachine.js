// Maps player game state to sprite animation names and tracks per-player frame timing.
// Call updateAnimationState() each frame for every player before drawing.

function resolveDesiredAnimation(player, prevX) {
    if (player.isKnockedDown) return 'knockdown';
    if (player.isCelebrating) return 'celebrate';
    if (player.isPunching) return 'high_punch';
    if (player.isKicking) return 'mid_high_kick';
    if (player.isJumping || player.height > 0) return 'jump';
    if (player.isCrouching) return 'crouch';
    const moving =
        Math.abs(player.horizontalVelocity || 0) > 0 ||
        (prevX !== undefined && Math.abs(player.x - prevX) > 0.5);
    return moving ? 'walk_shuffle' : 'idle';
}

// playerId -> { name, startTime, prevX }
const _states = new Map();

export function updateAnimationState(player, now) {
    let state = _states.get(player.id);
    if (!state) {
        state = { name: 'idle', startTime: now, prevX: player.x };
        _states.set(player.id, state);
    }

    const desired = resolveDesiredAnimation(player, state.prevX);
    state.prevX = player.x;

    const isAttack = desired === 'high_punch' || desired === 'mid_high_kick';
    if (isAttack) {
        // Use the per-attack timestamp so rapid attacks (key held) each get a fresh
        // startTime even when the animation name doesn't change between punches.
        const attackStart = player.attackAnimStartTime ?? now;
        if (desired !== state.name || state.startTime !== attackStart) {
            state.name = desired;
            state.startTime = attackStart;
        }
    } else if (desired !== state.name) {
        state.name = desired;
        state.startTime = now;
    }

    return state;
}

// Returns the sprite sheet key (e.g. "high_punch_facing_right"), or null when
// no sprite sheet exists for that animation yet (knockdown, celebrate).
export function getSheetName(animationName, facing) {
    if (animationName === 'knockdown' || animationName === 'celebrate') return null;
    return `${animationName}_facing_${facing}`;
}

// Which column (frame index) to slice from a horizontal sprite sheet.
export function getFrameIndex(sheetMeta, animState, now) {
    const elapsed = now - animState.startTime;
    const frameDurationMs = 1000 / sheetMeta.fps;
    const frame = Math.floor(elapsed / frameDurationMs);
    return sheetMeta.loop
        ? frame % sheetMeta.frame_count
        : Math.min(frame, sheetMeta.frame_count - 1);
}

export function removeAnimationState(playerId) {
    _states.delete(playerId);
}

export function clearAllAnimationStates() {
    _states.clear();
}
