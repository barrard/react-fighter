import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";

const TrainingGrounds = () => {
    const { socket } = useSocket();
    const navigate = useNavigate();

    useEffect(() => {
        if (socket) {
            const roomName = `training-${socket.id}`;
            socket.emit("createTrainingRoom", { roomName });

            const onRoomCreated = (roomId) => {
                navigate(`/game/${roomId}`);
            };

            socket.on("roomCreated", onRoomCreated);

            return () => {
                socket.off("roomCreated", onRoomCreated);
            };
        }
    }, [socket, navigate]);

    return (
        <div>
            <h1>Training Grounds</h1>
            <p>Creating a training room...</p>
        </div>
    );
};

export default TrainingGrounds;
