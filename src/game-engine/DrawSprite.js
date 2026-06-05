import { getSheetName, getFrameIndex } from "./AnimationStateMachine.js";

// Derived from Blender camera: ortho_scale=4.2, camera_target Z=1.55.
// Frame top = 3.65 BU, frame bottom = -0.55 BU, feet at Z=0 → 0.869 from top.
// Character visual height ≈ 1.9 BU → sprite spans ~231px of the 512px frame.
// At characterHeight=100px world units, drawn sprite height = 100 * 2.2 = 220px.
// Adjust SPRITE_SCALE and FOOT_ANCHOR if the character rides too high/low.
const SPRITE_SCALE = 2.2;   // drawn height = characterHeight * SPRITE_SCALE
const FOOT_ANCHOR = 0.869;  // fraction from sprite top where feet land

// Draws the character using a sprite sheet. Returns true on success, false if
// the caller should fall back to procedural drawing (no sprite or no sheet yet).
export function DrawSprite(ctx, player, spriteLoader, animState, now) {
    const characterType = player.spriteCharacter;
    if (!characterType || !spriteLoader.isLoaded(characterType)) return false;

    const sheetName = getSheetName(animState.name, player.facing);
    if (!sheetName) return false; // knockdown/celebrate — no sprite yet

    const sheet = spriteLoader.getSheet(characterType, sheetName);
    if (!sheet) return false;

    const { image, meta } = sheet;
    const frameIndex = getFrameIndex(meta, animState, now);

    const drawH = player.characterHeight * SPRITE_SCALE;
    const drawW = drawH; // frames are square

    const srcX = frameIndex * meta.frame_width;
    const destX = player.x + player.characterWidth / 2 - drawW / 2;
    const destY = player.y + player.characterHeight - drawH * FOOT_ANCHOR;

    ctx.drawImage(image, srcX, 0, meta.frame_width, meta.frame_height, destX, destY, drawW, drawH);
    return true;
}
