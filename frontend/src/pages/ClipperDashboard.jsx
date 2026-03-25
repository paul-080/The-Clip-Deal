import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useAuth, API } from "../App";
import Sidebar from "../components/Sidebar";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  Home, Search, Smartphone, CreditCard, Settings, MessageCircle,
  Video, TrendingUp, Eye, DollarSign, Plus, Trash2, Check, X, AlertTriangle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import ChatPanel from "../components/ChatPanel";

const ACCENT_COLOR = "#00E5FF";

export default function ClipperDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [campaigns, setCampaigns] = useState([]);
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsRes, accountsRes, announcementsRes, statsRes] = await Promise.all([
        fetch(`${API}/campaigns`, { credentials: "include" }),
        fetch(`${API}/social-accounts`, { credentials: "include" }),
        fetch(`${API}/announcements`, { credentials: "include" }),
        fetch(`${API}/clipper/stats`, { credentials: "include" }),
      ]);

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns || []);
      }
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setSocialAccounts(data.accounts || []);
      }
      if (announcementsRes.ok) {
        const data = await announcementsRes.json();
        setAnnouncements(data.announcements || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const sidebarItems = [
    { id: "home", label: "Accueil", icon: Home, path: "/clipper" },
    { id: "discover", label: "Découvrir", icon: Search, path: "/clipper/discover" },
    { id: "accounts", label: "Mes comptes", icon: Smartphone, path: "/clipper/accounts" },
    { type: "divider" },
    { type: "section", label: "MES CAMPAGNES" },
    ...campaigns.map((c) => ({
      id: `campaign-${c.campaign_id}`,
      label: c.name,
      icon: Video,
      path: `/clipper/campaign/${c.campaign_id}`,
      children: [
        {
          id: `chat-${c.campaign_id}`,
          label: `Chat — ${c.name}`,
          icon: MessageCircle,
          path: `/clipper/campaign/${c.campaign_id}/chat`,
        },
      ],
    })),
    { type: "divider" },
    { id: "payment", label: "Paiement", icon: CreditCard, path: "/clipper/payment" },
    { id: "settings", label: "Paramètres", icon: Settings, path: "/clipper/settings" },
  ];

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar 
        items={sidebarItems} 
        accentColor={ACCENT_COLOR}
        role="clipper"
      />
      <main className="flex-1 ml-64 p-8">
        <Routes>
          <Route index element={<ClipperHome announcements={announcements} stats={stats} />} />
          <Route path="discover" element={<DiscoverCampaigns onJoin={fetchData} />} />
          <Route path="accounts" element={
            <AccountsPage 
              accounts={socialAccounts} 
              campaigns={campaigns}
              onUpdate={fetchData}
            />
          } />
          <Route path="campaign/:campaignId" element={<CampaignDashboard campaigns={campaigns} />} />
          <Route path="campaign/:campaignId/chat" element={<ChatPanel campaigns={campaigns} />} />
          <Route path="payment" element={<PaymentPage stats={stats} />} />
          <Route path="settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

// Clipper Home Page
function ClipperHome({ announcements, stats }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
      data-testid="clipper-home"
    >
      <div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">Accueil</h1>
        <p className="text-white/50">Bienvenue sur votre tableau de bord clippeur</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#121212] border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/50">Gains totaux</p>
                  <p className="font-mono font-bold text-2xl text-[#00E5FF]">
                    €{stats.total_earnings?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-[#00E5FF]/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#121212] border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/50">Campagnes actives</p>
                  <p className="font-mono font-bold text-2xl text-white">
                    {stats.campaign_stats?.length || 0}
                  </p>
                </div>
                <Video className="w-8 h-8 text-white/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#121212] border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/50">Vues totales</p>
                  <p className="font-mono font-bold text-2xl text-white">
                    {stats.campaign_stats?.reduce((acc, c) => acc + c.views, 0)?.toLocaleString() || 0}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-white/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Announcements Feed */}
      <div>
        <h2 className="font-display font-bold text-xl text-white mb-4">Annonces récentes</h2>
        {announcements.length === 0 ? (
          <Card className="bg-[#121212] border-white/10">
            <CardContent className="p-8 text-center">
              <p className="text-white/50">Aucune annonce pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => (
              <Card key={ann.announcement_id} className="bg-[#121212] border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#FF007F]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#FF007F] font-bold text-sm">
                        {ann.agency?.display_name?.[0] || "A"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{ann.agency?.display_name}</span>
                        <span className="text-xs text-white/30">
                          {new Date(ann.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      <h3 className="font-bold text-white mb-2">{ann.title}</h3>
                      <p className="text-white/60 text-sm">{ann.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Discover Campaigns Page
function DiscoverCampaigns({ onJoin }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${API}/campaigns/discover`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
      data-testid="discover-page"
    >
      <div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">Découvrir</h1>
        <p className="text-white/50">Explorez les campagnes disponibles</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-[#121212] border-white/10">
              <CardContent className="p-6">
                <div className="skeleton h-8 w-3/4 rounded mb-4" />
                <div className="skeleton h-4 w-1/2 rounded mb-2" />
                <div className="skeleton h-4 w-2/3 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="bg-[#121212] border-white/10">
          <CardContent className="p-8 text-center">
            <p className="text-white/50">Aucune campagne disponible</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <Card 
              key={campaign.campaign_id} 
              className="bg-[#121212] border-white/10 hover:border-[#00E5FF]/30 transition-colors duration-200"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-[#FF007F]/20 flex items-center justify-center">
                    <Video className="w-6 h-6 text-[#FF007F]" />
                  </div>
                  <Badge variant="outline" className="border-[#39FF14]/30 text-[#39FF14]">
                    Active
                  </Badge>
                </div>
                <h3 className="font-display font-bold text-lg text-white mb-2 truncate">
                  {campaign.name}
                </h3>
                <p className="text-sm text-white/50 mb-4">{campaign.agency_name}</p>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-white/50">RPM: </span>
                    <span className="font-mono text-[#00E5FF]">€{campaign.rpm}</span>
                  </div>
                  <div className="flex gap-1">
                    {campaign.platforms?.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs bg-white/5">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Accounts Management Page
function AccountsPage({ accounts, campaigns, onUpdate }) {
  const [newPlatform, setNewPlatform] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [campaignAccounts, setCampaignAccounts] = useState({});

  useEffect(() => {
    fetchCampaignAccounts();
  }, [campaigns]);

  const fetchCampaignAccounts = async () => {
    const accountsMap = {};
    for (const campaign of campaigns) {
      try {
        const res = await fetch(`${API}/campaigns/${campaign.campaign_id}/social-accounts`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          accountsMap[campaign.campaign_id] = data.accounts || [];
        }
      } catch (error) {
        console.error("Error fetching campaign accounts:", error);
      }
    }
    setCampaignAccounts(accountsMap);
  };

  const handleAddAccount = async () => {
    if (!newPlatform || !newUsername.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch(`${API}/social-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ platform: newPlatform, username: newUsername.trim() }),
      });

      if (res.ok) {
        toast.success("Compte ajouté");
        setNewPlatform("");
        setNewUsername("");
        onUpdate();
      } else {
        const error = await res.json();
        toast.error(error.detail || "Erreur lors de l'ajout");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    try {
      const res = await fetch(`${API}/social-accounts/${accountId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Compte supprimé");
        onUpdate();
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleAssignAccount = async (campaignId, accountId) => {
    try {
      const res = await fetch(`${API}/campaigns/${campaignId}/social-accounts/${accountId}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Compte assigné à la campagne");
        fetchCampaignAccounts();
      } else {
        const error = await res.json();
        toast.error(error.detail || "Erreur");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    }
  };

  const handleRemoveFromCampaign = async (campaignId, accountId) => {
    try {
      const res = await fetch(`${API}/campaigns/${campaignId}/social-accounts/${accountId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Compte retiré de la campagne");
        fetchCampaignAccounts();
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
      data-testid="accounts-page"
    >
      <div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">Mes comptes</h1>
        <p className="text-white/50">Gérez vos comptes réseaux sociaux</p>
      </div>

      {/* Section 1: Global Account Management */}
      <Card className="bg-[#121212] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Gestion globale des comptes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={newPlatform} onValueChange={setNewPlatform}>
              <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white" data-testid="platform-select">
                <SelectValue placeholder="Plateforme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="@username"
              className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              data-testid="username-input"
            />
            <Button
              onClick={handleAddAccount}
              disabled={isAdding}
              className="bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black"
              data-testid="add-account-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>

          {accounts.length === 0 ? (
            <p className="text-white/50 text-sm py-4">Aucun compte ajouté</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <div
                  key={account.account_id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      className={
                        account.status === "verified" 
                          ? "bg-[#39FF14]/20 text-[#39FF14]"
                          : account.status === "error"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }
                    >
                      {account.status === "verified" ? <Check className="w-3 h-3 mr-1" /> : null}
                      {account.platform}
                    </Badge>
                    <span className="text-white">{account.username}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAccount(account.account_id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Campaign Attribution */}
      <div>
        <h2 className="font-display font-bold text-xl text-white mb-4">Attribution par campagne</h2>
        {campaigns.length === 0 ? (
          <Card className="bg-[#121212] border-white/10">
            <CardContent className="p-8 text-center">
              <p className="text-white/50">Rejoignez une campagne pour attribuer vos comptes</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => {
              const assignedAccounts = campaignAccounts[campaign.campaign_id] || [];
              const availableAccounts = accounts.filter(
                (a) => a.status === "verified" && !assignedAccounts.find((ca) => ca.account_id === a.account_id)
              );

              return (
                <Card key={campaign.campaign_id} className="bg-[#121212] border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Video className="w-5 h-5 text-[#00E5FF]" />
                      {campaign.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {assignedAccounts.length === 0 ? (
                      <p className="text-white/50 text-sm">Aucun compte assigné</p>
                    ) : (
                      assignedAccounts.map((account) => (
                        <div
                          key={account.account_id}
                          className="flex items-center justify-between p-2 bg-white/5 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-[#39FF14]" />
                            <Badge className="bg-white/10 text-white">{account.platform}</Badge>
                            <span className="text-white text-sm">{account.username}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromCampaign(campaign.campaign_id, account.account_id)}
                            className="text-white/50 hover:text-white"
                          >
                            Retirer
                          </Button>
                        </div>
                      ))
                    )}
                    {availableAccounts.length > 0 && (
                      <Select
                        onValueChange={(accountId) => handleAssignAccount(campaign.campaign_id, accountId)}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid={`assign-account-${campaign.campaign_id}`}>
                          <SelectValue placeholder="+ Ajouter un compte" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAccounts.map((account) => (
                            <SelectItem key={account.account_id} value={account.account_id}>
                              {account.platform} — {account.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Campaign Dashboard
function CampaignDashboard({ campaigns }) {
  const location = useLocation();
  const campaignId = location.pathname.split("/")[3];
  const campaign = campaigns.find((c) => c.campaign_id === campaignId);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (campaignId) {
      fetchStats();
    }
  }, [campaignId]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/campaigns/${campaignId}/stats`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-white/50">Campagne non trouvée</p>
      </div>
    );
  }

  const myStats = stats?.clipper_stats?.find((s) => true); // First one for demo

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
      data-testid="campaign-dashboard"
    >
      <div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">{campaign.name}</h1>
        <p className="text-white/50">Votre tableau de bord pour cette campagne</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#121212] border-white/10">
          <CardContent className="p-6">
            <p className="text-sm text-white/50 mb-1">Votre classement</p>
            <p className="font-mono font-bold text-3xl text-white">
              #{myStats?.rank || "-"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#121212] border-white/10">
          <CardContent className="p-6">
            <p className="text-sm text-white/50 mb-1">Vos vues</p>
            <p className="font-mono font-bold text-3xl text-white">
              {myStats?.views?.toLocaleString() || "0"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#121212] border-white/10">
          <CardContent className="p-6">
            <p className="text-sm text-white/50 mb-1">Gains en attente</p>
            <p className="font-mono font-bold text-3xl text-[#00E5FF]">
              €{myStats?.earnings?.toFixed(2) || "0.00"}
            </p>
          </CardContent>
        </Card>
      </div>

      {myStats?.strikes > 0 && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">
              Vous avez {myStats.strikes} strike(s) actif(s)
            </span>
          </CardContent>
        </Card>
      )}

      <Card className="bg-[#121212] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Détails de la campagne</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-white/50">RPM</p>
              <p className="font-mono text-lg text-white">€{campaign.rpm}</p>
            </div>
            <div>
              <p className="text-sm text-white/50">Min. vues payout</p>
              <p className="font-mono text-lg text-white">{campaign.min_view_payout}</p>
            </div>
            <div>
              <p className="text-sm text-white/50">Max. vues payout</p>
              <p className="font-mono text-lg text-white">{campaign.max_view_payout || "∞"}</p>
            </div>
            <div>
              <p className="text-sm text-white/50">Plateformes</p>
              <div className="flex gap-1 mt-1">
                {campaign.platforms?.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Payment Page
function PaymentPage({ stats }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
      data-testid="payment-page"
    >
      <div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">Paiement</h1>
        <p className="text-white/50">Historique de vos paiements</p>
      </div>

      <Card className="bg-[#121212] border-white/10">
        <CardContent className="p-8">
          <div className="text-center">
            <p className="text-sm text-white/50 mb-2">Total généré</p>
            <p className="font-mono font-black text-5xl text-[#00E5FF]">
              €{stats?.total_earnings?.toFixed(2) || "0.00"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#121212] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Historique par campagne</CardTitle>
        </CardHeader>
        <CardContent>
          {!stats?.campaign_stats || stats.campaign_stats.length === 0 ? (
            <p className="text-white/50 text-center py-8">Aucun historique disponible</p>
          ) : (
            <div className="space-y-3">
              {stats.campaign_stats.map((cs, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{cs.campaign_name}</p>
                    <p className="text-sm text-white/50">{cs.views?.toLocaleString()} vues</p>
                  </div>
                  <p className="font-mono font-bold text-[#00E5FF]">€{cs.earnings?.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Settings Page
function SettingsPage() {
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ display_name: displayName }),
      });
      if (res.ok) {
        toast.success("Profil mis à jour");
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
      data-testid="settings-page"
    >
      <div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">Paramètres</h1>
        <p className="text-white/50">Gérez votre profil</p>
      </div>

      <Card className="bg-[#121212] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-2">Pseudo</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              data-testid="display-name-settings"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-2">Email (Google)</label>
            <Input
              value={user?.email || ""}
              disabled
              className="bg-white/5 border-white/10 text-white/50"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-black"
            data-testid="save-settings-btn"
          >
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#121212] border-white/10">
        <CardContent className="p-6">
          <Button
            variant="outline"
            onClick={logout}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            data-testid="logout-btn"
          >
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
