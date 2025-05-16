const VITE_API_URL = import.meta.env.VITE_API_URL;

export default {
    async setName(username) {
        const response = await fetch(`${VITE_API_URL}/users/set-name`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username }),
            credentials: "include", // Important for cookies
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(`Error: ${error.message || "Something went wrong"}`);
        }
    },
};
