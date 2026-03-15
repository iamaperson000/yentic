"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Pusher from "pusher-js";

export default function ChatPage() {
  const { data: session, status: sessionStatus } = useSession();
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
      const text = data?.message ?? "";
      const sender = typeof data?.sender === "string" ? data.sender : null;
      setMessages((prev) => [
        ...prev,
        sender ? `${sender}: ${text}` : text,
      ]);
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
      const response = await fetch("/api/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to send message." }));
        setError(data.error ?? "Failed to send message.");
        return;
      }

      setInput("");
    } catch {
      setError("Failed to send message.");
    }
  };

  const canSend = Boolean(session?.user);

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Chat</h1>
        <p style={styles.status}>{status}</p>
        <p style={styles.helper}>
          {canSend
            ? "Signed in users can post messages to the chat demo."
            : sessionStatus === "loading"
              ? "Checking your session…"
              : "Sign in to send messages."}
        </p>

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
            disabled={!canSend}
          />
          {canSend ? (
            <button type="submit" style={styles.button}>
              Send
            </button>
          ) : (
            <button
              type="button"
              style={styles.button}
              onClick={() => signIn("google", { callbackUrl: "/chat" })}
            >
              Sign in
            </button>
          )}
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
    marginBottom: "8px",
    textAlign: "center",
    color: "#94a3b8",
  },
  helper: {
    margin: 0,
    marginBottom: "16px",
    textAlign: "center",
    color: "#cbd5e1",
    fontSize: "0.95rem",
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
