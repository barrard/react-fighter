// Function to draw character portraits
export default function drawCharacterPortrait(ctx, character, width, height, isSelected = false) {
    const time = Date.now();
    const visual = character.visual || character.stats?.visual || {};

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = character.color;
    ctx.fillRect(0, 0, width, height);

    if (isSelected) {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, width - 4, height - 4);

        const glowSize = Math.sin(time / 200) * 2 + 4;
        ctx.lineWidth = glowSize;
        ctx.strokeRect(6, 6, width - 12, height - 12);
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const accent = visual.accentColor || "#f8e0cb";
    const secondary = visual.secondaryColor || "#111827";

    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(centerX - width * 0.16, centerY - height * 0.02);
    if (visual.bodyShape === "robe") {
        ctx.lineTo(centerX - width * 0.28, centerY + height * 0.33);
        ctx.lineTo(centerX + width * 0.28, centerY + height * 0.33);
    } else if (visual.bodyShape === "heavy") {
        ctx.lineTo(centerX - width * 0.22, centerY + height * 0.24);
        ctx.lineTo(centerX + width * 0.22, centerY + height * 0.24);
    } else {
        ctx.lineTo(centerX - width * 0.18, centerY + height * 0.24);
        ctx.lineTo(centerX + width * 0.18, centerY + height * 0.24);
    }
    ctx.lineTo(centerX + width * 0.16, centerY - height * 0.02);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent;
    if (visual.headShape === "square") {
        ctx.fillRect(centerX - width * 0.13, centerY - height * 0.28, width * 0.26, height * 0.28);
    } else if (visual.headShape === "oval") {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY - height * 0.14, width * 0.12, height * 0.17, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.arc(centerX, centerY - height * 0.14, width * 0.14, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "#000";
    const eyeY = centerY - height * 0.14;
    ctx.beginPath();
    ctx.arc(centerX - width * 0.05, eyeY, width * 0.02, 0, Math.PI * 2);
    ctx.arc(centerX + width * 0.05, eyeY, width * 0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(centerX - width * 0.06, centerY - height * 0.04);
    ctx.lineTo(centerX + width * 0.06, centerY - height * 0.04);
    ctx.stroke();

    ctx.fillStyle = secondary;
    if (visual.hairStyle === "hood") {
        ctx.beginPath();
        ctx.arc(centerX, centerY - height * 0.18, width * 0.17, Math.PI, 0);
        ctx.fill();
    } else if (visual.hairStyle === "crest") {
        ctx.fillRect(centerX - width * 0.025, centerY - height * 0.4, width * 0.05, height * 0.12);
    } else if (visual.hairStyle === "topknot") {
        ctx.beginPath();
        ctx.arc(centerX, centerY - height * 0.34, width * 0.04, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.lineWidth = 3;

    switch (character.name?.toLowerCase()) {
        case "knight":
            ctx.fillRect(centerX - width * 0.17, centerY - height * 0.27, width * 0.34, height * 0.06);
            ctx.beginPath();
            ctx.moveTo(centerX + width * 0.26, centerY - height * 0.18);
            ctx.lineTo(centerX + width * 0.26, centerY + height * 0.26);
            ctx.stroke();
            break;
        case "mage":
            ctx.beginPath();
            ctx.moveTo(centerX - width * 0.18, centerY - height * 0.18);
            ctx.lineTo(centerX, centerY - height * 0.42);
            ctx.lineTo(centerX + width * 0.18, centerY - height * 0.18);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX + width * 0.24, centerY, width * 0.07, 0, Math.PI * 2);
            ctx.fill();
            break;
        case "archer":
            ctx.beginPath();
            ctx.arc(centerX + width * 0.2, centerY + height * 0.02, height * 0.18, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX + width * 0.2, centerY - height * 0.16);
            ctx.lineTo(centerX + width * 0.2, centerY + height * 0.2);
            ctx.stroke();
            break;
        case "rogue":
            ctx.fillRect(centerX - width * 0.18, centerY - height * 0.16, width * 0.36, height * 0.08);
            ctx.beginPath();
            ctx.moveTo(centerX - width * 0.2, centerY + height * 0.02);
            ctx.lineTo(centerX - width * 0.06, centerY + height * 0.2);
            ctx.stroke();
            break;
        case "berserker":
            ctx.beginPath();
            ctx.moveTo(centerX + width * 0.12, centerY - height * 0.3);
            ctx.lineTo(centerX + width * 0.12, centerY + height * 0.22);
            ctx.stroke();
            ctx.fillRect(centerX + width * 0.12, centerY - height * 0.3, width * 0.12, height * 0.08);
            break;
        case "monk":
            for (let i = 0; i < 7; i += 1) {
                ctx.beginPath();
                ctx.arc(centerX - width * 0.12 + i * width * 0.04, centerY + height * 0.22, width * 0.015, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        default:
            break;
    }

    if (isSelected) {
        const bobOffset = Math.sin(time / 500 + character.id) * 2;
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
    }
}
