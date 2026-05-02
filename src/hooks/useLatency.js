import { useState, useEffect } from "react";

const HISTORY_SIZE = 10;

export function useLatency(socket) {
    const [stats, setStats] = useState({ current: 0, min: null, max: 0 });

    useEffect(() => {
        if (!socket) return;
        const history = [];
        let min = null;
        let max = 0;

        const onPong = (data = {}) => {
            const ct = data.ct ?? data.clientTimestamp;
            if (!ct) return;
            const latency = Date.now() - ct;

            history.push(latency);
            if (history.length > HISTORY_SIZE) history.shift();

            const avg = Math.round(history.reduce((s, v) => s + v, 0) / history.length);
            min = min === null ? latency : Math.min(min, latency);
            max = Math.max(max, latency);

            setStats({ current: avg, min, max });
        };

        socket.on("pong", onPong);
        return () => socket.off("pong", onPong);
    }, [socket]);

    return stats;
}
