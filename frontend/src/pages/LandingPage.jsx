import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Users, Zap, TrendingUp, ChevronRight, Video, DollarSign, BarChart3, Building2, Eye, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const roles = [
    {
      id: "clipper",
      title: "Clippeur",
      icon: Video,
      color: "#00E5FF",
      description: "Je crée des clips et je veux être rémunéré selon mes vues",
    },
    {
      id: "agency",
      title: "Agence",
      icon: Building2,
      color: "#FF007F",
      description: "Je gère des campagnes de clipping et des équipes de clippeurs",
    },
    {
      id: "manager",
      title: "Manager",
      icon: Users,
      color: "#39FF14",
      description: "Je supervise des clippeurs et je donne des conseils",
    },
    {
      id: "client",
      title: "Client",
      icon: Eye,
      color: "#FFB300",
      description: "Je suis créateur/influenceur et je veux suivre mes campagnes",
    },
  ];

  const handleGetStarted = () => {
    if (user) {
      if (user.role) {
        navigate(`/${user.role}`);
      } else {
        navigate("/select-role");
      }
    } else {
      // Show role selection modal before login
      setShowRoleModal(true);
    }
  };

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
  };

  const handleContinueWithRole = () => {
    if (selectedRole) {
      // Store selected role in sessionStorage before OAuth
      sessionStorage.setItem("pendingRole", selectedRole);
      login();
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] overflow-hidden relative">
      {/* Background grain texture */}
      <div className="grain absolute inset-0 pointer-events-none" />
      
      {/* Hero Section */}
      <header className="relative">
        {/* Navigation */}
        <nav className="relative z-20 flex items-center justify-between px-6 lg:px-16 py-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00E5FF] via-[#FF007F] to-[#39FF14] flex items-center justify-center">
              <Play className="w-5 h-5 text-black fill-black" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white">
              The Clip Deal Track
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button
              onClick={handleGetStarted}
              data-testid="nav-login-btn"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-6 py-2 font-medium transition-colors duration-200"
            >
              {user ? "Dashboard" : "Se connecter"}
            </Button>
          </motion.div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 px-6 lg:px-16 pt-16 lg:pt-24 pb-32">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
              <span className="text-sm text-white/70">Plateforme de clipping vidéo #1</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display font-black text-5xl sm:text-6xl lg:text-7xl tracking-tighter text-white mb-6 leading-[1.1]"
            >
              Gérez vos campagnes
              <br />
              <span className="gradient-text">de clipping vidéo</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-white/60 max-w-xl mb-10 leading-relaxed"
            >
              Connectez agences, clippeurs et créateurs. Rémunération au RPM, 
              suivi en temps réel, gestion des équipes simplifiée.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                onClick={handleGetStarted}
                data-testid="hero-cta-btn"
                className="bg-[#00E5FF] hover:bg-[#00d4eb] text-black font-bold rounded-full px-8 py-6 text-lg transition-colors duration-200 flex items-center gap-2"
              >
                Commencer ici
                <ChevronRight className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                data-testid="hero-learn-more-btn"
                className="bg-transparent border-white/20 hover:bg-white/5 text-white rounded-full px-8 py-6 text-lg transition-colors duration-200"
              >
                En savoir plus
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-3 gap-8 mt-20 max-w-2xl"
            >
              {[
                { value: "500+", label: "Clippeurs actifs" },
                { value: "2M+", label: "Vues générées" },
                { value: "€50k+", label: "Payés aux clippeurs" },
              ].map((stat, i) => (
                <div key={i} className="text-left">
                  <div className="font-display font-black text-3xl lg:text-4xl text-white tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/50 mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Gradient orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00E5FF]/20 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FF007F]/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3" />
      </header>

      {/* Features Section */}
      <section className="relative z-10 px-6 lg:px-16 py-24 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display font-bold text-3xl lg:text-4xl text-white tracking-tight mb-4">
              Comment ça fonctionne
            </h2>
            <p className="text-white/50 max-w-lg mx-auto">
              Une plateforme conçue pour simplifier la gestion de vos campagnes de clipping
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Users,
                title: "Agences",
                description: "Créez des campagnes, gérez vos clippeurs et suivez les performances",
                color: "#FF007F",
                gradient: "from-[#FF007F]/20 to-transparent",
              },
              {
                icon: Video,
                title: "Clippeurs",
                description: "Rejoignez des campagnes, postez vos clips et soyez rémunérés",
                color: "#00E5FF",
                gradient: "from-[#00E5FF]/20 to-transparent",
              },
              {
                icon: BarChart3,
                title: "Managers",
                description: "Supervisez les équipes et envoyez des conseils personnalisés",
                color: "#39FF14",
                gradient: "from-[#39FF14]/20 to-transparent",
              },
              {
                icon: TrendingUp,
                title: "Clients",
                description: "Suivez vos campagnes et communiquez avec les agences",
                color: "#FFB300",
                gradient: "from-[#FFB300]/20 to-transparent",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative bg-[#121212] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors duration-200"
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${feature.gradient} rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${feature.color}20` }}
                  >
                    <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                  </div>
                  <h3 className="font-display font-bold text-lg text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* RPM Section */}
      <section className="relative z-10 px-6 lg:px-16 py-24 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 bg-[#00E5FF]/10 border border-[#00E5FF]/20 rounded-full px-4 py-2 mb-6">
                <DollarSign className="w-4 h-4 text-[#00E5FF]" />
                <span className="text-sm text-[#00E5FF]">Système RPM</span>
              </div>
              <h2 className="font-display font-bold text-3xl lg:text-4xl text-white tracking-tight mb-6">
                Rémunération transparente
                <br />
                <span className="text-[#00E5FF]">au nombre de vues</span>
              </h2>
              <p className="text-white/50 mb-8 leading-relaxed">
                Les clippeurs sont payés selon leurs performances. Chaque campagne définit 
                un RPM (revenu par 1000 vues), un seuil minimum et un plafond maximum.
              </p>
              <ul className="space-y-4">
                {[
                  "RPM personnalisable par campagne",
                  "Suivi des vues en temps réel",
                  "Paiements automatiques",
                  "Historique détaillé des gains",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <div className="w-5 h-5 rounded-full bg-[#00E5FF]/20 flex items-center justify-center">
                      <Zap className="w-3 h-3 text-[#00E5FF]" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-[#121212] border border-white/10 rounded-2xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-white/50 text-sm">Exemple de campagne</span>
                  <span className="bg-[#39FF14]/20 text-[#39FF14] text-xs font-medium px-3 py-1 rounded-full">Active</span>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-white/50 mb-2">RPM configuré</div>
                    <div className="font-mono font-bold text-4xl text-white">€3.50</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-xs text-white/50 mb-1">Vues totales</div>
                      <div className="font-mono font-bold text-xl text-white">1.2M</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-xs text-white/50 mb-1">Gains distribués</div>
                      <div className="font-mono font-bold text-xl text-[#00E5FF]">€4,200</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-white/50">Budget utilisé</span>
                      <span className="text-white">84%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full w-[84%] bg-gradient-to-r from-[#00E5FF] to-[#FF007F] rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating cards */}
              <div className="absolute -top-4 -right-4 bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#FF007F]" />
                  <span className="text-sm text-white">+12 clippeurs</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 lg:px-16 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display font-bold text-3xl lg:text-5xl text-white tracking-tight mb-6">
              Prêt à commencer ?
            </h2>
            <p className="text-white/50 mb-10 max-w-lg mx-auto">
              Rejoignez la plateforme et commencez à gérer vos campagnes de clipping dès aujourd'hui.
            </p>
            <Button
              onClick={handleGetStarted}
              data-testid="cta-start-btn"
              className="bg-[#00E5FF] hover:bg-[#00d4eb] text-black font-bold rounded-full px-10 py-6 text-lg transition-colors duration-200"
            >
              Commencer gratuitement
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 lg:px-16 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00E5FF] via-[#FF007F] to-[#39FF14] flex items-center justify-center">
              <Play className="w-4 h-4 text-black fill-black" />
            </div>
            <span className="font-display font-bold text-white">The Clip Deal Track</span>
          </div>
          <p className="text-sm text-white/40">© 2025 The Clip Deal Track. Tous droits réservés.</p>
        </div>
      </footer>

      {/* Role Selection Modal */}
      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent className="bg-[#121212] border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-2xl text-white text-center">
              Qui êtes-vous ?
            </DialogTitle>
            <p className="text-white/50 text-center mt-2">
              Choisissez votre rôle pour commencer
            </p>
          </DialogHeader>
          
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                data-testid={`modal-role-${role.id}`}
                className={`relative p-5 rounded-xl border text-left transition-all duration-200 ${
                  selectedRole === role.id
                    ? "bg-white/10 scale-[1.02]"
                    : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]"
                }`}
                style={{
                  borderColor: selectedRole === role.id ? role.color : undefined,
                  boxShadow: selectedRole === role.id ? `0 0 20px ${role.color}30` : undefined,
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${role.color}20` }}
                >
                  <role.icon className="w-5 h-5" style={{ color: role.color }} />
                </div>
                <h3 className="font-display font-bold text-white mb-1">
                  {role.title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {role.description}
                </p>
                {selectedRole === role.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: role.color }}
                  >
                    <ChevronRight className="w-3 h-3 text-black" />
                  </motion.div>
                )}
              </button>
            ))}
          </div>

          <Button
            onClick={handleContinueWithRole}
            disabled={!selectedRole}
            data-testid="modal-continue-btn"
            className={`w-full mt-6 py-6 font-bold rounded-xl text-lg transition-all duration-200 ${
              selectedRole 
                ? "bg-white text-black hover:bg-white/90" 
                : "bg-white/10 text-white/50 cursor-not-allowed"
            }`}
          >
            Continuer avec Google
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
