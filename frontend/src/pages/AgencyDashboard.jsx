import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useAuth, API } from "../App";
import Sidebar from "../components/Sidebar";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  Home, Search, Plus, Link2, CreditCard, Settings, MessageCircle,
  Video, Users, Eye, DollarSign, Copy, Check, Image, AlertTriangle,
  TrendingUp, BarChart3
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import ChatPanel from "../components/ChatPanel";

const ACCENT_COLOR = "#FF007F";

export default function AgencyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsRes, announcementsRes] = await Promise.all([
        fetch(`${API}/campaigns`, { credentials: "include" }),
        fetch(`${API}/announcements`, { credentials: "include" }),
      ]);

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns || []);
      }
      if (announcementsRes.ok) {
        const data = await announcementsRes.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const sidebarItems = [
    { id: "home", label: "Accueil — Annonces", icon: Home, path: "/agency" },
    { id: "discover", label: "Découvrir", icon: Search, path: "/agency/discover" },
    { id: "create", label: "Lancer une campagne", icon: Plus, path: "/agency/create" },
    { type: "divider" },
    { type: "section", label: "MES CAMPAGNES" },
    ...campaigns.map((c) => ({
      id: `campaign-${c.campaign_id}`,
      label: c.name,
      icon: Video,
      path: `/agency/campaign/${c.campaign_id}`,
      children: [
        {
          id: `chat-${c.campaign_id}`,
          label: `Chat — ${c.name}`,
          icon: MessageCircle,
          path: `/agency/campaign/${c.campaign_id}/chat`,
        },
      ],
    })),
    { type: "divider" },
    { id: "links", label: "Liens d'accès", icon: Link2, path: "/agency/links" },
    { id: "payment", label: "Paiement", icon: CreditCard, path: "/agency/payment" },
    { id: "settings", label: "Paramètres", icon: Settings, path: "/agency/settings" },
  ];

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <Sidebar 
        items={sidebarItems} 
        accentColor={ACCENT_COLOR}
        role="agency"
      />
      <main className="flex-1 ml-64 p-8">
        <Routes>
          <Route index element={<AgencyHome announcements={announcements} onUpdate={fetchData} />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="create" element={<CreateCampaign onCreated={fetchData} />} />
          <Route path="campaign/:campaignId" element={<CampaignDashboard campaigns={campaigns} />} />
          <Route path="campaign/:campaignId/chat" element={<ChatPanel campaigns={campaigns} />} />
          <Route path="links" element={<LinksPage />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

// Agency Home with Announcements
function AgencyHome({ announcements, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, content }),
      });

      if (res.ok) {
        toast.success("Annonce publiée");
        setTitle("");
        setContent("");
        setShowForm(false);
        onUpdate();
      }
    } catch (error) {
      toast.error("Erreur lors de la publication");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
      data-testid="agency-home"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl text-white mb-2">Accueil — Annonces</h1>
          <p className="text-white/50">Publiez des annonces pour vos clippeurs</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#FF007F] hover:bg-[#FF007F]/80 text-white"
          data-testid="new-announcement-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle annonce
        </Button>
      </div>

      {showForm && (
        <Card className="bg-[#121212] border-[#FF007F]/30">
          <CardContent className="p-6 space-y-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de l'annonce"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              data-testid="announcement-title-input"
            />
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contenu de l'annonce..."
              rows={4}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              data-testid="announcement-content-input"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#FF007F] hover:bg-[#FF007F]/80 text-white"
                data-testid="publish-announcement-btn"
              >
                {isSubmitting ? "Publication..." : "Publier"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-white/10 text-white"
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {announcements.length === 0 ? (
        <Card className="bg-[#121212] border-white/10">
          <CardContent className="p-8 text-center">
            <p className="text-white/50">Aucune annonce publiée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <Card key={ann.announcement_id} className="bg-[#121212] border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-white">{ann.title}</h3>
                  <span className="text-xs text-white/30">
                    {new Date(ann.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <p className="text-white/60">{ann.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Discover Page for Agency
function DiscoverPage() {
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
      data-testid="agency-discover"
    >
      <div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">Découvrir</h1>
        <p className="text-white/50">Campagnes des autres agences (lecture seule)</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-[#121212] border-white/10">
              <CardContent className="p-6">
                <div className="skeleton h-8 w-3/4 rounded mb-4" />
                <div className="skeleton h-4 w-1/2 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.campaign_id} className="bg-[#121212] border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#FF007F]/20 flex items-center justify-center">
                    <Video className="w-5 h-5 text-[#FF007F]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white truncate">{campaign.name}</h3>
                    <p className="text-xs text-white/50">{campaign.agency_name}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Budget total</span>
                    <span className="text-white">
                      {campaign.budget_unlimited ? "Illimité" : `€${campaign.budget_total}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Budget utilisé</span>
                    <span className="text-white">€{campaign.budget_used || 0}</span>
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

// Create Campaign Page
function CreateCampaign({ onCreated }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    image_url: "",
    rpm: "",
    budget_total: "",
    budget_unlimited: false,
    min_view_payout: "0",
    max_view_payout: "",
    pay_for_post: false,
    platforms: [],
    strike_days: "3",
    cadence: "1",
    application_form_enabled: false,
    application_questions: [],
  });
  const [customQuestion, setCustomQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const togglePlatform = (platform) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const addQuestion = () => {
    if (customQuestion.trim()) {
      setFormData((prev) => ({
        ...prev,
        application_questions: [...prev.application_questions, customQuestion.trim()],
      }));
      setCustomQuestion("");
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.rpm) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        rpm: parseFloat(formData.rpm),
        budget_total: formData.budget_unlimited ? null : parseFloat(formData.budget_total) || null,
        min_view_payout: parseInt(formData.min_view_payout) || 0,
        max_view_payout: formData.max_view_payout ? parseInt(formData.max_view_payout) : null,
        strike_days: parseInt(formData.strike_days) || 3,
        cadence: parseInt(formData.cadence) || 1,
      };

      const res = await fetch(`${API}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const campaign = await res.json();
        toast.success("Campagne créée !");
        onCreated();
        navigate(`/agency/campaign/${campaign.campaign_id}`);
      } else {
        const error = await res.json();
        toast.error(error.detail || "Erreur lors de la création");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 max-w-3xl"
      data-testid="create-campaign-page"
    >
      <div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">Lancer une campagne</h1>
        <p className="text-white/50">Créez une nouvelle campagne de clipping</p>
      </div>

      {/* Identity */}
      <Card className="bg-[#121212] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Image className="w-5 h-5 text-[#FF007F]" />
            Identité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-2">Nom de la campagne *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Ex: Clips Gaming 2025"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              data-testid="campaign-name-input"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-2">URL de l'image (optionnel)</label>
            <Input
              value={formData.image_url}
              onChange={(e) => handleChange("image_url", e.target.value)}
              placeholder="https://..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
        </CardContent>
      </Card>

      {/* Remuneration */}
      <Card className="bg-[#121212] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#FF007F]" />
            Rémunération
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-2">RPM (€ par 1000 vues) *</label>
            <Input
              type="number"
              step="0.01"
              value={formData.rpm}
              onChange={(e) => handleChange("rpm", e.target.value)}
              placeholder="3.50"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              data-testid="campaign-rpm-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Budget total (€)</label>
              <Input
                type="number"
                value={formData.budget_total}
                onChange={(e) => handleChange("budget_total", e.target.value)}
                placeholder="10000"
                disabled={formData.budget_unlimited}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 disabled:opacity-50"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.budget_unlimited}
                  onCheckedChange={(checked) => handleChange("budget_unlimited", checked)}
                  className="border-white/30"
                />
                <span className="text-white/70">Budget illimité</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Min. vues payout</label>
              <Input
                type="number"
                value={formData.min_view_payout}
                onChange={(e) => handleChange("min_view_payout", e.target.value)}
                placeholder="1000"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Max. vues payout</label>
              <Input
                type="number"
                value={formData.max_view_payout}
                onChange={(e) => handleChange("max_view_payout", e.target.value)}
                placeholder="1000000"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={formData.pay_for_post}
              onCheckedChange={(checked) => handleChange("pay_for_post", checked)}
              className="border-white/30"
            />
            <span className="text-white/70">Payer pour poster</span>
          </label>
        </CardContent>
      </Card>

      {/* Platforms */}
      <Card className="bg-[#121212] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Plateformes cibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {["tiktok", "youtube", "instagram"].map((platform) => (
              <label key={platform} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.platforms.includes(platform)}
                  onCheckedChange={() => togglePlatform(platform)}
                  className="border-white/30"
                  data-testid={`platform-${platform}`}
                />
                <span className="text-white capitalize">{platform}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rules */}
      <Card className="bg-[#121212] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#FF007F]" />
            Règles de publication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Strike (jours sans post)</label>
              <Input
                type="number"
                value={formData.strike_days}
                onChange={(e) => handleChange("strike_days", e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Cadence (posts/jour min)</label>
              <Input
                type="number"
                value={formData.cadence}
                onChange={(e) => handleChange("cadence", e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Form */}
      <Card className="bg-[#121212] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Formulaire de candidature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={formData.application_form_enabled}
              onCheckedChange={(checked) => handleChange("application_form_enabled", checked)}
              className="border-white/30"
            />
            <span className="text-white/70">Activer le formulaire de candidature</span>
          </label>
          
          {formData.application_form_enabled && (
            <div className="space-y-3 pl-6">
              <p className="text-sm text-white/50">Questions par défaut:</p>
              <ul className="text-sm text-white/70 space-y-1">
                <li>• Nom / Prénom ?</li>
                <li>• Donnez une vidéo créée ?</li>
              </ul>
              
              {formData.application_questions.map((q, i) => (
                <div key={i} className="text-sm text-white/70">• {q}</div>
              ))}
              
              <div className="flex gap-2">
                <Input
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Ajouter une question..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <Button
                  type="button"
                  onClick={addQuestion}
                  variant="outline"
                  className="border-white/10 text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full bg-[#FF007F] hover:bg-[#FF007F]/80 text-white py-6 text-lg"
        data-testid="create-campaign-btn"
      >
        {isSubmitting ? "Création en cours..." : "Créer la campagne"}
      </Button>
    </motion.div>
  );
}

// Campaign Dashboard for Agency
function CampaignDashboard({ campaigns }) {
  const location = useLocation();
  const campaignId = location.pathname.split("/")[3];
  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (campaignId) {
      fetchCampaign();
      fetchStats();
    }
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`${API}/campaigns/${campaignId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCampaign(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#FF007F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-white/50">Campagne non trouvée</p>
      </div>
    );
  }

  const budgetPercentage = campaign.budget_total 
    ? Math.min(100, (campaign.budget_used / campaign.budget_total) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
      data-testid="agency-campaign-dashboard"
    >
      <div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">{campaign.name}</h1>
        <Badge variant="outline" className="border-[#39FF14]/30 text-[#39FF14]">
          {campaign.status}
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#121212] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">Vues totales</p>
                <p className="font-mono font-bold text-2xl text-white">
                  {stats?.total_views?.toLocaleString() || 0}
                </p>
              </div>
              <Eye className="w-8 h-8 text-white/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#121212] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">Clippeurs</p>
                <p className="font-mono font-bold text-2xl text-white">
                  {stats?.clipper_count || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-white/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#121212] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">RPM</p>
                <p className="font-mono font-bold text-2xl text-[#FF007F]">
                  €{campaign.rpm}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-[#FF007F]/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#121212] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">Budget utilisé</p>
                <p className="font-mono font-bold text-2xl text-white">
                  €{stats?.budget_used || 0}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-white/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      {!campaign.budget_unlimited && campaign.budget_total && (
        <Card className="bg-[#121212] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/70">Budget</span>
              <span className="text-white font-mono">
                €{campaign.budget_used || 0} / €{campaign.budget_total}
              </span>
            </div>
            <Progress value={budgetPercentage} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Clippers Ranking */}
      <Card className="bg-[#121212] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#FF007F]" />
            Classement des clippeurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!campaign.members || campaign.members.length === 0 ? (
            <p className="text-white/50 text-center py-8">Aucun clippeur inscrit</p>
          ) : (
            <div className="space-y-3">
              {campaign.members.map((member, index) => (
                <div
                  key={member.member_id}
                  className={`relative flex items-center justify-between p-4 rounded-lg ${
                    member.strikes > 0 ? "bg-red-500/10 border border-red-500/30" : "bg-white/5"
                  }`}
                >
                  {member.strikes > 0 && (
                    <div className="absolute -top-2 left-4 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                      {member.strikes} strike(s)
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-lg text-white/50 w-8">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-white font-medium">
                        {member.user_info?.display_name || member.user_info?.name}
                      </p>
                      <p className="text-xs text-white/50">{member.user_info?.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-white">
                      {stats?.clipper_stats?.[index]?.views?.toLocaleString() || 0} vues
                    </p>
                    <p className="text-sm text-[#FF007F]">
                      €{stats?.clipper_stats?.[index]?.earnings?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Links Page
function LinksPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await fetch(`${API}/campaigns/all-links/agency`, { credentials: "include" });
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

  const copyLink = (type, token, campaignId) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/join/${type}/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(`${campaignId}-${type}`);
    toast.success("Lien copié !");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
      data-testid="links-page"
    >
      <div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">Liens d'accès</h1>
        <p className="text-white/50">Partagez ces liens pour inviter des participants</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-[#121212] border-white/10">
              <CardContent className="p-6">
                <div className="skeleton h-6 w-1/3 rounded mb-4" />
                <div className="skeleton h-4 w-full rounded mb-2" />
                <div className="skeleton h-4 w-full rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="bg-[#121212] border-white/10">
          <CardContent className="p-8 text-center">
            <p className="text-white/50">Aucune campagne créée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.campaign_id} className="bg-[#121212] border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-[#FF007F]" />
                  {campaign.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: "clipper", token: campaign.token_clipper, icon: Video, label: "Lien Clippeur", color: "#00E5FF" },
                  { type: "manager", token: campaign.token_manager, icon: Users, label: "Lien Manager", color: "#39FF14" },
                  { type: "client", token: campaign.token_client, icon: Eye, label: "Lien Client", color: "#FFB300" },
                ].map(({ type, token, icon: Icon, label, color }) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" style={{ color }} />
                      <span className="text-white/70">{label}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(type, token, campaign.campaign_id)}
                      className="text-white/50 hover:text-white"
                      data-testid={`copy-${type}-link-${campaign.campaign_id}`}
                    >
                      {copiedId === `${campaign.campaign_id}-${type}` ? (
                        <Check className="w-4 h-4 text-[#39FF14]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span className="ml-2">Copier</span>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Payment Page
function PaymentPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
      data-testid="agency-payment-page"
    >
      <div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">Paiement</h1>
        <p className="text-white/50">Historique des paiements aux clippeurs</p>
      </div>

      <Card className="bg-[#121212] border-white/10">
        <CardContent className="p-8 text-center">
          <CreditCard className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">L'historique des paiements sera disponible prochainement</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Settings Page
function SettingsPage() {
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [strikeThreshold, setStrikeThreshold] = useState("3");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        fetch(`${API}/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ display_name: displayName }),
        }),
        fetch(`${API}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ strike_threshold: parseInt(strikeThreshold) }),
        }),
      ]);
      toast.success("Paramètres sauvegardés");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
      data-testid="agency-settings-page"
    >
      <div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">Paramètres</h1>
        <p className="text-white/50">Configurez votre agence</p>
      </div>

      <Card className="bg-[#121212] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Profil de l'agence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-2">Nom de l'agence</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-2">Email (Google)</label>
            <Input value={user?.email || ""} disabled className="bg-white/5 border-white/10 text-white/50" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#121212] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Règles de strikes</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Nombre de strikes avant suspension
            </label>
            <Input
              type="number"
              value={strikeThreshold}
              onChange={(e) => setStrikeThreshold(e.target.value)}
              className="bg-white/5 border-white/10 text-white w-24"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#FF007F] hover:bg-[#FF007F]/80 text-white"
        >
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <Button
          variant="outline"
          onClick={logout}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          Se déconnecter
        </Button>
      </div>
    </motion.div>
  );
}
