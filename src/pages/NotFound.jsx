// src/pages/NotFound.jsx
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderX } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex items-center justify-center min-h-[70vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <FolderX className="h-16 w-16 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-2xl">Page Not Found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button asChild>
                        <Link to="/">Return to Lobby</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
