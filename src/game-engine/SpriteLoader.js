import { loadImage } from './loadImage.js';

const BASE_PATH = '/character-sprites';

export class SpriteLoader {
    constructor() {
        // characterType -> Map<sheetName, { image, meta }>
        this._sheets = new Map();
        this._loading = new Map();
    }

    load(characterType) {
        if (this._sheets.has(characterType)) return Promise.resolve();
        if (this._loading.has(characterType)) return this._loading.get(characterType);

        const loading = this._load(characterType).finally(() => {
            this._loading.delete(characterType);
        });
        this._loading.set(characterType, loading);
        return loading;
    }

    async _load(characterType) {
        const basePath = `${BASE_PATH}/${characterType}`;
        const res = await fetch(`${basePath}/sprite_sheet_metadata.json`);
        if (!res.ok) throw new Error(`Failed to load sprite metadata: ${characterType} (${res.status})`);
        const metadata = await res.json();

        const sheetMap = new Map();
        await Promise.all(
            Object.entries(metadata.sheets).map(async ([sheetName, sheetMeta]) => {
                const file = sheetMeta.file || `${sheetName}.png`;
                const { ready } = loadImage(`${basePath}/sheets/${file}`);
                const image = await ready;
                sheetMap.set(sheetName, { image, meta: sheetMeta });
            })
        );

        this._sheets.set(characterType, sheetMap);
    }

    // Returns { image, meta } or null if not loaded / not found.
    getSheet(characterType, sheetName) {
        return this._sheets.get(characterType)?.get(sheetName) ?? null;
    }

    isLoaded(characterType) {
        return this._sheets.has(characterType);
    }
}

// Share decoded sheets across selection, rounds, and game loop instances.
export const spriteLoader = new SpriteLoader();
