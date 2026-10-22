// Decode before handing an image to the renderer so first use does not do that
// work in the middle of a gameplay frame.
export function loadImage(src) {
    const image = new Image();
    image.decoding = "async";
    const ready = new Promise((resolve, reject) => {
        image.onload = async () => {
            try {
                if (image.decode) await image.decode();
                resolve(image);
            } catch (error) {
                reject(error);
            }
        };
        image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    });
    image.src = src;
    return { image, ready };
}
