import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth, API } from "../App";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle, HelpCircle, Lightbulb, Clock, AlertCircle, User } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";

export default function ChatPanel({ campaigns }) {
  const location = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("questions"); // "questions" or "conseils"
  const [messages, setMessages] = useState([]);
  const [clippersForAdvice, setClippersForAdvice] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [adviceContent, setAdviceContent] = useState("");
  const [selectedClipper, setSelectedClipper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Extract campaign ID from URL
  const pathParts = location.pathname.split("/");
  const campaignIndex = pathParts.indexOf("campaign");
  const campaignId = campaignIndex !== -1 ? pathParts[campaignIndex + 1] : null;
  const campaign = campaigns?.find((c) => c.campaign_id === campaignId);

  const isAgencyOrManager = user?.role === "agency" || user?.role === "manager";

  useEffect(() => {
    if (campaignId) {
      fetchMessages();
      if (isAgencyOrManager) {
        fetchClippersForAdvice();
      }
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [campaignId]);

  useEffect(() => {
    if (activeTab === "questions") {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API}/campaigns/${campaignId}/messages`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        // Filter only question-type messages
        const questions = (data.messages || []).filter(m => m.message_type === "question" || m.message_type === "chat");
        setMessages(questions);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClippersForAdvice = async () => {
    try {
      const res = await fetch(`${API}/campaigns/${campaignId}/clippers-advice-status`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setClippersForAdvice(data.clippers || []);
      }
    } catch (error) {
      console.error("Error fetching clippers:", error);
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
          if (data.message.message_type === "question" || data.message.message_type === "chat") {
            setMessages((prev) => [...prev, data.message]);
          }
        }
        if (data.type === "advice_sent") {
          fetchClippersForAdvice();
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        setTimeout(connectWebSocket, 3000);
      };
    } catch (error) {
      console.error("WebSocket error:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendQuestion = async () => {
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
          message_type: "question",
        }),
      });

      if (res.ok) {
        const message = await res.json();
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

  const handleSendAdvice = async () => {
    if (!adviceContent.trim() || !selectedClipper) return;

    setSending(true);
    try {
      const res = await fetch(`${API}/advices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          campaign_id: campaignId,
          recipient_ids: [selectedClipper.user_id],
          content: adviceContent.trim(),
        }),
      });

      if (res.ok) {
        toast.success(`Conseil envoyé à ${selectedClipper.display_name}`);
        setAdviceContent("");
        setSelectedClipper(null);
        fetchClippersForAdvice();
      } else {
        toast.error("Erreur lors de l'envoi du conseil");
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
      handleSendQuestion();
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "clipper": return "#00E5FF";
      case "agency": return "#FF007F";
      case "manager": return "#39FF14";
      case "client": return "#FFB300";
      default: return "#fff";
    }
  };

  const formatTimeAgo = (hours) => {
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.floor(hours / 24);
    return `${days}j`;
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
      {/* Header with Tabs */}
      <div className="border-b border-white/10">
        <div className="flex items-center gap-3 pb-4">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white/70" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-white">
              Chat — {campaign?.name || "Campagne"}
            </h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("questions")}
            data-testid="tab-questions"
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === "questions"
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Questions
            {messages.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/10 rounded-full text-xs">
                {messages.length}
              </span>
            )}
          </button>
          {isAgencyOrManager && (
            <button
              onClick={() => setActiveTab("conseils")}
              data-testid="tab-conseils"
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === "conseils"
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              Conseils
              {clippersForAdvice.filter(c => c.needs_advice).length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-[#FF007F]/20 text-[#FF007F] rounded-full text-xs">
                  {clippersForAdvice.filter(c => c.needs_advice).length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "questions" ? (
          <motion.div
            key="questions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col pt-4"
          >
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <HelpCircle className="w-12 h-12 text-white/20 mb-4" />
                  <p className="text-white/50">Aucune question</p>
                  <p className="text-sm text-white/30">
                    {user?.role === "clipper" 
                      ? "Posez une question à l'agence"
                      : "Les clippeurs peuvent poser des questions ici"}
                  </p>
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
            <div className="pt-4 border-t border-white/10 mt-4">
              <div className="flex gap-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={user?.role === "clipper" ? "Poser une question..." : "Répondre à une question..."}
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  data-testid="chat-input"
                />
                <Button
                  onClick={handleSendQuestion}
                  disabled={sending || !newMessage.trim()}
                  className="bg-white/10 hover:bg-white/20 text-white px-4"
                  data-testid="chat-send-btn"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="conseils"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col pt-4"
          >
            {/* Clippers List for Advice */}
            <div className="flex-1 overflow-y-auto">
              <p className="text-sm text-white/50 mb-4">
                Les clippeurs en attente de conseil remontent automatiquement (72h)
              </p>
              
              {clippersForAdvice.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Lightbulb className="w-12 h-12 text-white/20 mb-4" />
                  <p className="text-white/50">Aucun clippeur dans cette campagne</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clippersForAdvice.map((clipper, index) => (
                    <div
                      key={clipper.user_id}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                        selectedClipper?.user_id === clipper.user_id
                          ? "bg-white/10 border-[#FF007F]/50"
                          : clipper.needs_advice
                          ? "bg-[#FF007F]/10 border-[#FF007F]/30 hover:bg-[#FF007F]/15"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                      onClick={() => setSelectedClipper(clipper)}
                      data-testid={`clipper-${clipper.user_id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#00E5FF]/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-[#00E5FF]" />
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {clipper.display_name || clipper.name}
                            </p>
                            <p className="text-xs text-white/50">
                              {clipper.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {clipper.needs_advice ? (
                            <div className="flex items-center gap-2 text-[#FF007F]">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Besoin de conseil</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-white/40">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm">
                                Dernier conseil: {clipper.hours_since_advice ? formatTimeAgo(clipper.hours_since_advice) : "Jamais"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Advice Input */}
            {selectedClipper && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4 border-t border-white/10 mt-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-[#39FF14]" />
                  <span className="text-sm text-white/70">
                    Conseil pour <strong className="text-white">{selectedClipper.display_name || selectedClipper.name}</strong>
                  </span>
                  <button
                    onClick={() => setSelectedClipper(null)}
                    className="ml-auto text-xs text-white/40 hover:text-white"
                  >
                    Annuler
                  </button>
                </div>
                <Textarea
                  value={adviceContent}
                  onChange={(e) => setAdviceContent(e.target.value)}
                  placeholder="Écrivez votre conseil pour ce clippeur..."
                  rows={3}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 mb-3"
                  data-testid="advice-input"
                />
                <Button
                  onClick={handleSendAdvice}
                  disabled={sending || !adviceContent.trim()}
                  className="bg-[#39FF14] hover:bg-[#39FF14]/80 text-black w-full"
                  data-testid="send-advice-btn"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer le conseil
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
