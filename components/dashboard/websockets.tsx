import React, { useEffect, useRef } from "react";

const WS_URL = "wss://ai-task-hub.onrender.com";

export default function WebSocketTest() {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      console.log("WebSocket connected!");
      ws.current?.send(JSON.stringify({ type: "test", message: "Hello from client!" }));
    };

    ws.current.onmessage = (event) => {
      console.log("Received message:", event.data);
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected.");
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  return (
    <div>
      <h2>WebSocket Test</h2>
      <p>Check the browser console for connection status and messages.</p>
    </div>
  );
}