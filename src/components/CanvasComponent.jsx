import { useEffect, useRef } from "react";

const CanvasComponent = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Clear canvas
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw colorful rectangles
        const colors = ["#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6"];

        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = colors[i];
            ctx.fillRect(150 + i * 100, 150, 80, 300);
        }

        // Draw a circle
        ctx.fillStyle = "#2c3e50";
        ctx.beginPath();
        ctx.arc(400, 150, 100, 0, Math.PI * 2);
        ctx.fill();

        // Add border
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, 780, 580);

        // Add text
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Canvas is working!", 400, 150);
    }, []);

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <canvas ref={canvasRef} width={800} height={600} className="border border-gray-300 shadow-lg bg-white" />
        </div>
    );
};

export default CanvasComponent;
