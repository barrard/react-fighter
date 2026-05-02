import React from "react";
import { Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useLatency } from "../hooks/useLatency";
import { Swords } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function pingColor(ms) {
    if (ms === 0) return "text-muted-foreground";
    if (ms < 60) return "text-green-500";
    if (ms < 150) return "text-yellow-500";
    return "text-red-500";
}

export default function Navbar() {
    const { username, isConnected, error, socket } = useSocket();
    const latency = useLatency(socket);

    return (
        <header className="bg-background border-b flex-shrink-0">
            <div className="container mx-auto py-2 px-4 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    <Swords className="h-5 w-5 text-primary" />
                    <span className="font-bold tracking-tight">Fighter Arena</span>
                </Link>

                {error && (
                    <Alert variant="destructive" className="py-1 px-3 max-w-xs">
                        <AlertDescription className="text-xs">{error}</AlertDescription>
                    </Alert>
                )}

                <div className="flex items-center gap-4">
                    {/* Ping stats */}
                    <div className="flex items-center gap-2 font-mono text-xs">
                        <span className={`font-semibold ${pingColor(latency.current)}`}>
                            {latency.current > 0 ? `${latency.current}ms` : "—"}
                        </span>
                        {latency.min !== null && (
                            <span className="text-muted-foreground">
                                ↓{latency.min} ↑{latency.max}
                            </span>
                        )}
                    </div>

                    {/* Connection + username */}
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                        {username && (
                            <span className="text-sm font-medium">{username}</span>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
