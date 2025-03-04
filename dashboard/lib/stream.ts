export const createLogStream = (endpoint: string, authToken: string | undefined, onMessage: (log: string) => void, onError?: (error: Event) => void) => {
    const eventSource = new EventSource(`${endpoint}?token=${authToken}`);

    eventSource.onmessage = (event) => {
        console.log(event.data);
        onMessage(event.data);
    };

    eventSource.onerror = (error) => {
        console.error("EventSource failed:", error);
        if (onError) onError(error);
        eventSource.close();
    };

    return eventSource; // Allow caller to close the connection when needed
};
