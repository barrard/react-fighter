// src/pages/Lobby.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";

import { useSocket } from "../context/SocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, Swords, Users, LogIn } from "lucide-react";

export default function Lobby() {
    const navigate = useNavigate();
    const { someValue, someFunction } = useOutletContext();

    const { socket, username, setUsername, activeRooms, setError, isConnected } = useSocket();
    const [roomName, setRoomName] = useState("");

    // Set up room created listener
    useState(() => {
        const onRoomCreated = (roomId) => {
            navigate(`/game/${roomId}`);
        };

        socket.on("roomCreated", onRoomCreated);

        // Clean up
        return () => {
            socket.off("roomCreated", onRoomCreated);
        };
    }, [socket, navigate]);

    const createRoom = () => {
        if (!username) {
            setError("Please enter a username");
            return;
        }

        if (!roomName) {
            setError("Please enter a room name");
            return;
        }

        socket.emit("createRoom", { username, roomName });
    };

    const joinRoom = (roomName) => {
        if (!username) {
            setError("Please enter a username");
            return;
        }

        socket.emit("joinRoom", { roomName });
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">Fighter Arena</h1>
                    <p className="text-xl text-muted-foreground mb-8">Create or join a match to start fighting!</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Your Profile
                        </CardTitle>
                        <CardDescription>Enter your username to join or create a match</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Swords className="h-5 w-5" />
                            Create New Match
                        </CardTitle>
                        <CardDescription>Start a new game for others to join</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    placeholder="Enter room name"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button disabled={!roomName.trim()} onClick={createRoom} className="w-full pointer">
                            Create Match
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Active Matches
                    </CardTitle>
                    <CardDescription>Join an existing match</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-72">
                        {Object.values(activeRooms).length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No active matches. Create one to get started!
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.values(activeRooms).map((room) => (
                                    <div
                                        key={room.roomName}
                                        className="flex items-center justify-between border p-4 rounded-md"
                                    >
                                        <div>
                                            <h3 className="font-medium">
                                                {room.roomName} Created by {room.username}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">Players: {room.players}/2</p>
                                        </div>
                                        <Button
                                            onClick={() => joinRoom(room.roomName)}
                                            variant={room.players >= 2 ? "outline" : "default"}
                                            disabled={room.players >= 2}
                                        >
                                            <LogIn className="h-4 w-4 mr-2" />
                                            {room.players >= 2 ? "Full" : "Join"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
