"use client";

import { useEffect, useState } from "react";
import Pusher from "pusher-js";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Connecting to Pusher…");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe("chat");

    const handleMessage = (data) => {
      setMessages((prev) => [...prev, data?.message ?? ""]);
    };
    const handleConnected = () => {
      setStatus("Connected");
    };

    channel.bind("message", handleMessage);
    pusher.connection.bind("connected", handleConnected);

    return () => {
      channel.unbind_all();
      pusher.connection.unbind("connected", handleConnected);
      pusher.unsubscribe("chat");
      pusher.disconnect();
    };
  }, []);

  const handleSend = async (event) => {
    event.preventDefault();
    setError("");
    const message = input.trim();
    if (!message) return;

    try {
      await fetch("/api/message", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setInput("");
    } catch {
      setError("Failed to send message.");
    }
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Chat</h1>
        <p style={styles.status}>{status}</p>

        <div style={styles.messages}>
          {messages.length === 0 ? (
            <p style={styles.empty}>No messages yet.</p>
          ) : (
            messages.map((msg, index) => (
              <div key={index} style={styles.message}>
                {msg}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSend} style={styles.form}>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message"
            aria-label="Message"
          />
          <button type="submit" style={styles.button}>
            Send
          </button>
        </form>

        {error ? <p style={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
    padding: "2rem",
  },
  card: {
    width: "100%",
    maxWidth: "640px",
    background: "#111827",
    color: "#e2e8f0",
    padding: "24px",
    borderRadius: "16px",
    border: "1px solid #1f2937",
    boxShadow: "0 20px 35px rgba(0,0,0,0.4)",
  },
  title: {
    margin: 0,
    marginBottom: "8px",
    fontSize: "1.5rem",
    textAlign: "center",
  },
  status: {
    margin: 0,
    marginBottom: "16px",
    textAlign: "center",
    color: "#94a3b8",
  },
  messages: {
    minHeight: "260px",
    maxHeight: "360px",
    overflowY: "auto",
    background: "#0b1222",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #1f2937",
    marginBottom: "16px",
  },
  message: {
    padding: "10px 12px",
    borderRadius: "10px",
    background: "#111827",
    border: "1px solid #1f2937",
    marginBottom: "8px",
  },
  empty: {
    color: "#94a3b8",
    textAlign: "center",
  },
  form: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  input: {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #1f2937",
    background: "#0b1222",
    color: "#e2e8f0",
    outline: "none",
  },
  button: {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#10b981",
    color: "#0b1120",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: {
    marginTop: "12px",
    color: "#f87171",
    textAlign: "center",
  },
};
