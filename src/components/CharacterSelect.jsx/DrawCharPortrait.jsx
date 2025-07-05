// Function to draw character portraits
export default function drawCharacterPortrait(ctx, character, width, height, isSelected = false) {
    const time = Date.now();

    // Clear and set background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = character.color;
    ctx.fillRect(0, 0, width, height);

    // Add a highlight effect for selected character
    if (isSelected) {
        // Outer highlight
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, width - 4, height - 4);

        // Pulsing animation highlight
        const glowSize = Math.sin(time / 200) * 2 + 4;
        ctx.strokeStyle = "#000";
        ctx.lineWidth = glowSize;
        ctx.strokeRect(6, 6, width - 12, height - 12);
    }

    // Define character center
    const centerX = width / 2;
    const centerY = height / 2;

    // Random but consistent features based on character id
    // Use character.id as seed for randomness to keep it consistent
    const seed = character.id * 1000;
    const eyeStyle = seed % 3; // 0: round, 1: angled, 2: dots
    const faceShape = seed % 4; // 0: round, 1: square, 2: oval, 3: triangle
    const mouthStyle = seed % 3; // 0: smile, 1: neutral, 2: frown

    // Draw face
    ctx.fillStyle = "#f8e0cb"; // skin tone

    // Face shape
    if (faceShape === 0) {
        // Round face
        ctx.beginPath();
        ctx.arc(centerX, centerY, width * 0.3, 0, Math.PI * 2);
        ctx.fill();
    } else if (faceShape === 1) {
        // Square face
        ctx.fillRect(centerX - width * 0.25, centerY - height * 0.3, width * 0.5, height * 0.6);
    } else if (faceShape === 2) {
        // Oval face
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, width * 0.25, height * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Triangle face
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - height * 0.3);
        ctx.lineTo(centerX - width * 0.25, centerY + height * 0.25);
        ctx.lineTo(centerX + width * 0.25, centerY + height * 0.25);
        ctx.closePath();
        ctx.fill();
    }

    // Add animation for breathing effect
    const breathingOffset = isSelected ? Math.sin(time / 1000) * 2 : 0;

    // Draw eyes
    ctx.fillStyle = "#000000";
    const eyeY = centerY - height * 0.05 + breathingOffset;
    const eyeDistance = width * 0.12;

    if (eyeStyle === 0) {
        // Round eyes
        ctx.beginPath();
        ctx.arc(centerX - eyeDistance, eyeY, width * 0.05, 0, Math.PI * 2);
        ctx.arc(centerX + eyeDistance, eyeY, width * 0.05, 0, Math.PI * 2);
        ctx.fill();
    } else if (eyeStyle === 1) {
        // Angled eyes
        ctx.beginPath();
        ctx.moveTo(centerX - eyeDistance - width * 0.05, eyeY - height * 0.02);
        ctx.lineTo(centerX - eyeDistance + width * 0.05, eyeY + height * 0.02);
        ctx.lineTo(centerX - eyeDistance + width * 0.05, eyeY - height * 0.02);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(centerX + eyeDistance - width * 0.05, eyeY - height * 0.02);
        ctx.lineTo(centerX + eyeDistance + width * 0.05, eyeY + height * 0.02);
        ctx.lineTo(centerX + eyeDistance + width * 0.05, eyeY - height * 0.02);
        ctx.closePath();
        ctx.fill();
    } else {
        // Dot eyes
        ctx.beginPath();
        ctx.arc(centerX - eyeDistance, eyeY, width * 0.03, 0, Math.PI * 2);
        ctx.arc(centerX + eyeDistance, eyeY, width * 0.03, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw mouth
    const mouthY = centerY + height * 0.15 + breathingOffset;

    if (mouthStyle === 0) {
        // Smile
        ctx.beginPath();
        ctx.arc(centerX, mouthY, width * 0.12, 0, Math.PI);
        ctx.stroke();
    } else if (mouthStyle === 1) {
        // Neutral
        ctx.beginPath();
        ctx.moveTo(centerX - width * 0.1, mouthY);
        ctx.lineTo(centerX + width * 0.1, mouthY);
        ctx.stroke();
    } else {
        // Frown
        ctx.beginPath();
        ctx.arc(centerX, mouthY + height * 0.1, width * 0.12, Math.PI, Math.PI * 2);
        ctx.stroke();
    }

    // Add class-specific features
    switch (character.name?.toLowerCase()) {
        case "knight":
        case "paladin":
        case "samurai":
            // Draw helmet/armor
            ctx.fillStyle = "#888888";
            ctx.beginPath();
            ctx.arc(centerX, centerY - height * 0.32, width * 0.2, 0, Math.PI);
            ctx.fill();
            // Draw sword
            ctx.strokeStyle = "#cccccc";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX + width * 0.25, centerY - height * 0.2);
            ctx.lineTo(centerX + width * 0.25, centerY + height * 0.3);
            ctx.stroke();
            break;

        case "mage":
        case "witch":
            // Draw wizard hat
            ctx.fillStyle = "#5522aa";
            ctx.beginPath();
            ctx.moveTo(centerX - width * 0.2, centerY - height * 0.2);
            ctx.lineTo(centerX, centerY - height * 0.45);
            ctx.lineTo(centerX + width * 0.2, centerY - height * 0.2);
            ctx.closePath();
            ctx.fill();
            // Draw staff
            ctx.strokeStyle = "#8a4b08";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX - width * 0.3, centerY - height * 0.1);
            ctx.lineTo(centerX - width * 0.15, centerY + height * 0.3);
            ctx.stroke();
            break;

        case "archer":
            // Draw hood
            ctx.fillStyle = "#2a612f";
            ctx.beginPath();
            ctx.arc(centerX, centerY - height * 0.1, width * 0.25, Math.PI, 0);
            ctx.fill();
            // Draw bow
            ctx.strokeStyle = "#8a4b08";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX + width * 0.2, centerY, height * 0.25, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
            // Draw bowstring
            ctx.strokeStyle = "#eeeeee";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX + width * 0.2, centerY - height * 0.25);
            ctx.lineTo(centerX + width * 0.2, centerY + height * 0.25);
            ctx.stroke();
            break;

        case "rogue":
        case "ninja":
            // Draw mask
            ctx.fillStyle = "#333333";
            ctx.fillRect(centerX - width * 0.2, centerY - height * 0.1, width * 0.4, height * 0.15);
            // Draw dagger
            ctx.strokeStyle = "#cccccc";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(centerX - width * 0.25, centerY);
            ctx.lineTo(centerX - width * 0.1, centerY + height * 0.2);
            ctx.stroke();
            break;

        case "berserker":
            // Draw axe
            ctx.strokeStyle = "#8a4b08";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - height * 0.3);
            ctx.lineTo(centerX, centerY + height * 0.3);
            ctx.stroke();
            // Axe head
            ctx.fillStyle = "#cccccc";
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - height * 0.25);
            ctx.lineTo(centerX + width * 0.15, centerY - height * 0.15);
            ctx.lineTo(centerX + width * 0.15, centerY - height * 0.3);
            ctx.closePath();
            ctx.fill();
            // Hair
            ctx.fillStyle = "#ff0000";
            ctx.beginPath();
            ctx.arc(centerX, centerY - height * 0.2, width * 0.2, 0, Math.PI);
            ctx.fill();
            break;

        case "druid":
            // Draw antlers
            ctx.strokeStyle = "#8a4b08";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX - width * 0.1, centerY - height * 0.35);
            ctx.lineTo(centerX - width * 0.2, centerY - height * 0.45);
            ctx.moveTo(centerX - width * 0.1, centerY - height * 0.35);
            ctx.lineTo(centerX - width * 0.15, centerY - height * 0.55);
            ctx.moveTo(centerX + width * 0.1, centerY - height * 0.35);
            ctx.lineTo(centerX + width * 0.2, centerY - height * 0.45);
            ctx.moveTo(centerX + width * 0.1, centerY - height * 0.35);
            ctx.lineTo(centerX + width * 0.15, centerY - height * 0.55);
            ctx.stroke();
            // Leaf decoration
            ctx.fillStyle = "#228822";
            ctx.beginPath();
            ctx.ellipse(centerX, centerY + height * 0.3, width * 0.1, height * 0.05, 0, 0, Math.PI * 2);
            ctx.fill();
            break;

        case "monk":
            // Draw bald head
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY - height * 0.2, width * 0.18, 0, Math.PI);
            ctx.stroke();
            // Draw prayer beads
            ctx.fillStyle = "#aa4400";
            for (let i = 0; i < 8; i++) {
                ctx.beginPath();
                ctx.arc(
                    centerX - width * 0.2 + i * width * 0.05,
                    centerY + height * 0.25,
                    width * 0.02,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
            break;

        case "pirate":
            // Draw eye patch
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.ellipse(centerX - eyeDistance, eyeY, width * 0.08, height * 0.06, 0, 0, Math.PI * 2);
            ctx.fill();
            // Draw hat
            ctx.fillStyle = "#333333";
            ctx.beginPath();
            ctx.ellipse(centerX, centerY - height * 0.3, width * 0.3, height * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            break;

        default:
            // Default character has no special features
            break;
    }

    // Add subtle animation if animated flag is true
    if (isSelected) {
        // Slight bobbing motion - different for each character
        const bobOffset = Math.sin(time / 500 + character.id) * 2;

        // Add a small floating particle
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.beginPath();
        ctx.arc(
            centerX + Math.sin(time / 1000 + character.id * 10) * width * 0.2,
            centerY - height * 0.1 + bobOffset - Math.abs(Math.sin(time / 1200) * height * 0.15),
            width * 0.02,
            0,
            Math.PI * 2
        );
        ctx.fill();

        const gradient = ctx.createRadialGradient(centerX, centerY, width * 0.1, centerX, centerY, width * 0.4);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.2)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
}
