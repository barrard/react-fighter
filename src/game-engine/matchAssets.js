import { getArena, DEFAULT_ARENA_ID } from '@shared/arenas.js';
import { spriteLoader } from './SpriteLoader.js';
import { loadImage } from './loadImage.js';

const arenas = new Map();

export function getArenaAsset(arenaId = DEFAULT_ARENA_ID) {
    const config = getArena(arenaId);
    if (!arenas.has(config.id)) {
        const asset = { config, ...loadImage(config.backgroundUrl) };
        arenas.set(config.id, asset);
        asset.ready.catch(() => arenas.delete(config.id));
    }
    return arenas.get(config.id);
}

export function preloadMatchAssets(characters, arenaId = DEFAULT_ARENA_ID) {
    const types = new Set(characters.map((character) => character?.spriteCharacter).filter(Boolean));
    return Promise.all([
        getArenaAsset(arenaId).ready,
        ...Array.from(types, (type) => spriteLoader.load(type)),
    ]);
}
