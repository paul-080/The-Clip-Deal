import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth, API } from "../App";
import { motion } from "framer-motion";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

export default function ChatPanel({ campaigns }) {
  const location = useLocation();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Extract campaign ID from URL
  const pathParts = location.pathname.split("/");
  const campaignIndex = pathParts.indexOf("campaign");
  const campaignId = campaignIndex !== -1 ? pathParts[campaignIndex + 1] : null;
  const campaign = campaigns?.find((c) => c.campaign_id === campaignId);

  useEffect(() => {
    if (campaignId) {
      fetchMessages();
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [campaignId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API}/campaigns/${campaignId}/messages`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (!user?.user_id) return;

    const wsUrl = process.env.REACT_APP_BACKEND_URL
      .replace("https://", "wss://")
      .replace("http://", "ws://");

    try {
      wsRef.current = new WebSocket(`${wsUrl}/ws/${user.user_id}`);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "new_message" && data.message.campaign_id === campaignId) {
          setMessages((prev) => [...prev, data.message]);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
    } catch (error) {
      console.error("WebSocket error:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !campaignId) return;

    setSending(true);
    try {
      const res = await fetch(`${API}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          campaign_id: campaignId,
          content: newMessage.trim(),
          message_type: "chat",
        }),
      });

      if (res.ok) {
        const message = await res.json();
        // Add to local state if WebSocket didn't catch it
        setMessages((prev) => {
          if (!prev.find((m) => m.message_id === message.message_id)) {
            return [...prev, message];
          }
          return prev;
        });
        setNewMessage("");
      } else {
        toast.error("Erreur lors de l'envoi");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "clipper":
        return "#00E5FF";
      case "agency":
        return "#FF007F";
      case "manager":
        return "#39FF14";
      case "client":
        return "#FFB300";
      default:
        return "#fff";
    }
  };

  if (!campaignId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-white/50">Sélectionnez une campagne</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-8rem)]"
      data-testid="chat-panel"
    >
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white/70" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-white">
            Chat — {campaign?.name || "Campagne"}
          </h2>
          <p className="text-sm text-white/50">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 text-white/20 mb-4" />
            <p className="text-white/50">Aucun message</p>
            <p className="text-sm text-white/30">Soyez le premier à écrire</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === user?.user_id;
            const roleColor = getRoleColor(message.sender_role);

            return (
              <div
                key={message.message_id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] ${
                    isOwn ? "bg-white/10" : "bg-white/5"
                  } rounded-2xl px-4 py-3`}
                  style={{
                    borderLeft: isOwn ? "none" : `3px solid ${roleColor}`,
                  }}
                >
                  {!isOwn && (
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-sm font-medium"
                        style={{ color: roleColor }}
                      >
                        {message.sender_name}
                      </span>
                      <span className="text-xs text-white/30 capitalize">
                        {message.sender_role}
                      </span>
                    </div>
                  )}
                  <p className="text-white text-sm leading-relaxed">
                    {message.content}
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    {new Date(message.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex gap-3">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Écrire un message..."
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            data-testid="chat-input"
          />
          <Button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="bg-white/10 hover:bg-white/20 text-white px-4"
            data-testid="chat-send-btn"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
