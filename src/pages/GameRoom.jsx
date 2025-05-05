// src/pages/GameRoom.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useOutletContext } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Heart, Swords, Timer, ArrowLeft } from "lucide-react";

import CharacterSelect from "@/components/CharacterSelect.jsx";
export default function GameRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { someValue, someFunction } = useOutletContext();

    const { socket, username, error } = useSocket();

    const [roomState, setRoomState] = useState("verifying"); // verifying, waiting, ready, fighting, finished
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [player1, setPlayer1] = useState(null);
    const [player2, setPlayer2] = useState(null);
    const [spectators, setSpectators] = useState({});

    const [roomVerified, setRoomVerified] = useState(false);
    // const [errorAlert, setErrorAlert] = useState("");

    //actions to take per various possible errors
    useEffect(() => {
        let errMsg = error?.message || error;
        if (errMsg) {
            //handle various messages
            if (errMsg === "You are not in this room") {
                navigate("/");
            }
        }
    }, [error]);

    //Sanity checks, and verify room
    useEffect(() => {
        if (!roomId) {
            navigate("/");
        } else {
            socket.emit("verifyRoom", roomId);
        }
        setRoomState("verifying");

        socket.on("roomVerified", (inRoomAs) => {
            setRoomVerified(inRoomAs);
            setRoomState("verified");
        });

        socket.on("characterSelected", (character = {}) => {
            const { isPlayer1 } = character;
        });

        return () => {
            socket.off("roomVerified");
        };
    }, [roomId]);

    useEffect(() => {
        if (!roomVerified) {
            if (roomState !== "verifying") setRoomState("verifying");
            return;
        }
    }, [roomVerified]);

    function leaveRoom() {
        socket.emit("leaveRoom", roomId);
        navigate("/");
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={leaveRoom}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    {/* <h1 className="text-2xl font-bold">{roomId}</h1> */}
                    <Badge variant="outline" className="ml-2">
                        Room ID: {roomId}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5" />
                    <span>
                        Game {roomState}: {roomVerified}
                    </span>
                </div>
            </div>

            <CharacterSelect />
        </div>
    );
}
