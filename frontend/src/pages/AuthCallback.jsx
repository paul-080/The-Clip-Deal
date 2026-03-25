import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use ref to prevent double processing under StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        navigate("/");
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        const response = await fetch(`${API}/auth/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!response.ok) {
          throw new Error("Failed to authenticate");
        }

        const data = await response.json();
        const user = data.user;
        setUser(user);

        // Clear the hash from URL
        window.history.replaceState(null, "", window.location.pathname);

        // Redirect based on user state
        if (!user.role) {
          navigate("/select-role", { state: { user } });
        } else {
          navigate(`/${user.role}`, { state: { user } });
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        navigate("/");
      }
    };

    processAuth();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60">Connexion en cours...</p>
      </div>
    </div>
  );
}
