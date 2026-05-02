import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Swords, LogIn, Dumbbell } from "lucide-react";
import API from "../API";

export default function Lobby() {
    const navigate = useNavigate();
    const { socket, username, setUsername, activeRooms, setError, isConnected } = useSocket();
    const [roomName, setRoomName] = useState("");

    // Username modal state
    const [nameInput, setNameInput] = useState("");
    const [nameLoading, setNameLoading] = useState(false);
    const [nameError, setNameError] = useState("");

    useEffect(() => {
        socket.emit("getRooms");
    }, []);

    useEffect(() => {
        const onRoomCreated = (roomId) => {
            navigate(`/game/${roomId}`);
        };
        socket.on("roomCreated", onRoomCreated);
        return () => socket.off("roomCreated", onRoomCreated);
    }, [socket, navigate]);

    const handleSetUsername = async () => {
        if (!nameInput.trim()) {
            setNameError("Please enter a name");
            return;
        }
        setNameLoading(true);
        setNameError("");
        try {
            setUsername(nameInput.trim());
            await API.setName(nameInput.trim());
        } catch {
            setNameError("Could not save name, try again.");
        } finally {
            setNameLoading(false);
        }
    };

    const createRoom = () => {
        if (!username) { setError("Please set a username first"); return; }
        if (!roomName.trim()) { setError("Please enter a room name"); return; }
        socket.emit("createRoom", { username, roomName });
    };

    const joinRoom = (room) => {
        if (!username) { setError("Please set a username first"); return; }
        socket.emit("joinRoom", { roomName: room.roomName });
    };

    const rooms = Object.values(activeRooms);

    return (
        <>
            {/* Force-name modal */}
            {!username && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                    <Card className="w-full max-w-sm mx-4 shadow-2xl">
                        <CardHeader className="text-center pb-2">
                            <div className="flex justify-center mb-2">
                                <Swords className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">Welcome, Fighter</CardTitle>
                            <CardDescription>Choose your name to enter the arena</CardDescription>
                        </CardHeader>
                        <CardContent className="py-3">
                            <Input
                                placeholder="Your fighter name..."
                                value={nameInput}
                                onChange={(e) => { setNameInput(e.target.value); setNameError(""); }}
                                onKeyDown={(e) => e.key === "Enter" && handleSetUsername()}
                                autoFocus
                            />
                            {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={handleSetUsername} disabled={nameLoading}>
                                {nameLoading ? "Entering..." : "Enter Arena"}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Dashboard */}
            <div className="h-full flex flex-col gap-3">

                {/* Action cards */}
                <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                    {/* Create Match */}
                    <Card>
                        <CardHeader className="py-3 pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Swords className="h-4 w-4" />
                                Create Match
                            </CardTitle>
                            <CardDescription className="text-xs">Start a new room</CardDescription>
                        </CardHeader>
                        <CardContent className="py-0">
                            <Input
                                placeholder="Room name..."
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && createRoom()}
                                className="h-8 text-sm"
                            />
                        </CardContent>
                        <CardFooter className="pt-2 pb-3">
                            <Button
                                className="w-full h-8 text-sm"
                                onClick={createRoom}
                                disabled={!roomName.trim()}
                            >
                                Create
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Training Grounds */}
                    <Card className="flex flex-col justify-between">
                        <CardHeader className="py-3 pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Dumbbell className="h-4 w-4" />
                                Training Grounds
                            </CardTitle>
                            <CardDescription className="text-xs">Practice solo, test animations &amp; server physics</CardDescription>
                        </CardHeader>
                        <CardFooter className="pt-0 pb-3">
                            <Button asChild variant="outline" className="w-full h-8 text-sm">
                                <Link to="/training-grounds">Enter</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Active Matches */}
                <Card className="flex-1 flex flex-col min-h-0">
                    <CardHeader className="py-3 flex-shrink-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <LogIn className="h-4 w-4" />
                            Active Matches
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {rooms.length === 0 ? "No open matches yet" : `${rooms.length} match${rooms.length !== 1 ? "es" : ""} available`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 py-0 pb-3">
                        <ScrollArea className="h-full">
                            {rooms.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground text-sm">
                                    No active matches — create one to get started!
                                </div>
                            ) : (
                                <div className="space-y-2 pr-3">
                                    {rooms.map((room) => (
                                        <div
                                            key={room.roomName}
                                            className="flex items-center justify-between border rounded-md px-3 py-2"
                                        >
                                            <div>
                                                <p className="font-medium text-sm">{room.roomName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {room.owner} · {room.players}/2 players
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => joinRoom(room)}
                                                variant={room.players >= 2 ? "outline" : "default"}
                                                className="text-xs h-7"
                                            >
                                                {room.players >= 2 ? "Spectate" : "Join"}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
