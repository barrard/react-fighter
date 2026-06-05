import CONSTS from "./contants.js";
import { getArena, DEFAULT_ARENA_ID } from "@shared/arenas.js";

const { CANVAS_HEIGHT, FLOOR_HEIGHT } = CONSTS;
const FLOOR_Y = CANVAS_HEIGHT - FLOOR_HEIGHT;

// How many extra world-units of padding to add around the two players
// before the camera starts zooming out.
const VIEWPORT_PADDING = 250;
// Tightest zoom-in (world units visible when players are nose-to-nose).
const MIN_VISIBLE_WIDTH = 600;
// Smoothing factor per frame (~60 fps). Lower = more sluggish, higher = snappier.
const LERP = 0.04;

export class Camera {
    constructor() {
        const arena = getArena(DEFAULT_ARENA_ID);
        this.arenaWidth = arena.worldWidth;
        // Start fully zoomed-out so the arena is visible before players spread.
        this.visibleWidth = arena.worldWidth;
        this.x = arena.worldWidth / 2;
    }

    setArena(arenaId) {
        const arena = getArena(arenaId);
        this.arenaWidth = arena.worldWidth;
        this.visibleWidth = arena.worldWidth;
        this.x = arena.worldWidth / 2;
    }

    // Call once per frame before drawing. Smoothly tracks player positions.
    update(players) {
        const arr = Array.from(players.values());
        if (arr.length === 0) return;

        let minX = Infinity;
        let maxX = -Infinity;
        for (const p of arr) {
            const cx = p.x + (p.characterWidth || 0) / 2;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
        }

        const midX = (minX + maxX) / 2;
        const span = maxX - minX + VIEWPORT_PADDING;
        const targetVisible = Math.min(this.arenaWidth, Math.max(MIN_VISIBLE_WIDTH, span));

        this.visibleWidth += (targetVisible - this.visibleWidth) * LERP;

        // Clamp center so the viewport never shows outside the arena.
        const half = this.visibleWidth / 2;
        const clampedMid = Math.max(half, Math.min(this.arenaWidth - half, midX));
        this.x += (clampedMid - this.x) * LERP;
    }

    // Returns the ctx.setTransform parameters that convert world coordinates
    // to screen coordinates, with the floor pinned to the bottom of the canvas.
    getTransform(canvas) {
        const scale = canvas.width / this.visibleWidth;
        const worldLeft = this.x - this.visibleWidth / 2;
        const offsetX = -worldLeft * scale;
        // Pin FLOOR_Y to canvas bottom: FLOOR_Y * scale + offsetY = canvas.height
        const offsetY = canvas.height - FLOOR_Y * scale;
        return { scale, offsetX, offsetY };
    }

    // Returns the source-rect arguments for drawImage so the background image
    // always fills the canvas, panning/zooming with the camera.
    // The image is assumed to span exactly arenaWidth × CANVAS_HEIGHT in world space.
    getBackgroundCrop(image) {
        const worldLeft = this.x - this.visibleWidth / 2;
        const worldToImg = image.naturalWidth / this.arenaWidth;
        const srcX = worldLeft * worldToImg;
        const srcW = this.visibleWidth * worldToImg;
        // Scale srcH proportionally with srcW so the source crop keeps a constant
        // aspect ratio as the camera zooms in — prevents horizontal stretching.
        const srcH = image.naturalHeight * (srcW / image.naturalWidth);
        // Pin to bottom of image so the floor stays anchored.
        const srcY = image.naturalHeight - srcH;
        return { srcX, srcY, srcW, srcH };
    }
}
