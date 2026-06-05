const BASE_PATH = '/character-sprites';

export class SpriteLoader {
    constructor() {
        // characterType -> Map<sheetName, { image, meta }>
        this._sheets = new Map();
        this._loading = new Set();
    }

    async load(characterType) {
        if (this._sheets.has(characterType) || this._loading.has(characterType)) return;
        this._loading.add(characterType);

        const basePath = `${BASE_PATH}/${characterType}`;
        const res = await fetch(`${basePath}/sprite_sheet_metadata.json`);
        const metadata = await res.json();

        const sheetMap = new Map();
        await Promise.all(
            Object.entries(metadata.sheets).map(([sheetName, sheetMeta]) =>
                new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        sheetMap.set(sheetName, { image: img, meta: sheetMeta });
                        resolve();
                    };
                    img.onerror = () => reject(new Error(`Failed to load sprite sheet: ${sheetName}`));
                    img.src = `${basePath}/sheets/${sheetName}.png`;
                })
            )
        );

        this._sheets.set(characterType, sheetMap);
        this._loading.delete(characterType);
    }

    // Returns { image, meta } or null if not loaded / not found.
    getSheet(characterType, sheetName) {
        return this._sheets.get(characterType)?.get(sheetName) ?? null;
    }

    isLoaded(characterType) {
        return this._sheets.has(characterType);
    }
}
