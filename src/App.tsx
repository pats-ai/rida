import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Menu, RefreshCcw, Bike, Zap, Package, Clock, BadgeCheck, Star,
  MessageSquare, Gift, Home, History, User, LayoutGrid, Cpu, Wallet,
  ShieldCheck, Car, TrendingUp, Radio, Store, Phone, MapPin, Truck,
  Search, Navigation, LogOut
} from "lucide-react";

import { UserDashboard }  from "./components/UserDashboard";
import { DriverDashboard } from "./components/DriverDashboard";
import { AuthScreen }     from "./components/AuthScreen";
import { supabase }       from "./lib/supabase";
import { getProfile, signOut, RidaUser } from "./lib/auth";

export default function App() {
  const [user,    setUser]    = useState<RidaUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [view,    setView]    = useState<'commuter' | 'driver' | 'shopkeeper'>('commuter');

  // ── Restore session on load ──────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const profile = await getProfile(data.session.user.id);
        if (profile) {
          setUser(profile);
          // Auto-switch to correct view based on role
          if (profile.role === 'driver')   setView('driver');
          if (profile.role === 'business') setView('shopkeeper');
        }
      }
      setChecking(false);
    });

    // Keep session fresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth  = (u: RidaUser) => {
    setUser(u);
    if (u.role === 'driver')   setView('driver');
    if (u.role === 'business') setView('shopkeeper');
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setView('commuter');
  };

  // ── Loading ──────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-headline font-bold tracking-tighter mb-4">Ri<span className="text-primary">d</span>a</h1>
          <div className="w-1 h-1 rounded-full bg-primary mx-auto animate-ping" />
        </div>
      </div>
    );
  }

  // ── Not logged in ────────────────────────────────────────
  if (!user) return <AuthScreen onAuth={handleAuth} />;

  // ── Logged in — main app ─────────────────────────────────
  const cycleView = () => {
    if (view === 'commuter') setView('driver');
    else if (view === 'driver') setView('shopkeeper');
    else setView('commuter');
  };

  const getViewColor = () => {
    if (view === 'commuter')   return 'bg-primary shadow-[0_0_20px_rgba(200,240,74,0.3)]';
    if (view === 'driver')     return 'bg-secondary shadow-[0_0_20px_rgba(96,165,250,0.3)]';
    return 'bg-primary-fixed-dim shadow-[0_0_20px_rgba(174,213,47,0.3)]';
  };

  const getAccentColor = () => {
    if (view === 'commuter') return 'text-primary';
    if (view === 'driver')   return 'text-secondary';
    return 'text-primary-fixed-dim';
  };

  const getViewText = () => {
    if (view === 'commuter') return 'STUDIO';
    if (view === 'driver')   return 'DRIVE';
    return 'HUB';
  };

  const initials = user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen pb-32 font-sans bg-background text-on-surface overflow-x-hidden selection:bg-primary selection:text-on-primary">

      {/* Top bar */}
      <header className="fixed top-0 w-full z-50 glass-navigator border-b border-outline-variant">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <motion.div
              whileTap={{ scale: 0.9 }}
              onClick={cycleView}
              className={`w-10 h-10 ${getViewColor()} rounded-lg flex items-center justify-center cursor-pointer transition-all duration-500`}
            >
              {view === 'shopkeeper' ? <Store size={20} className="text-on-primary" /> : <LayoutGrid size={20} className="text-on-primary" />}
            </motion.div>
            <div>
              <h1 className="text-sm font-bold tracking-tight uppercase">
                RIDA <span className={`${getAccentColor()} italic transition-colors duration-500`}>{getViewText()}</span>
              </h1>
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${view === 'commuter' ? 'bg-primary' : 'bg-secondary'} animate-pulse`} />
                <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-mono">
                  {user.full_name} · {user.role}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Avatar with initials */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
              view === 'driver' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
            }`}>
              {initials}
            </div>
            {/* Sign out */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleSignOut} className="text-on-surface-variant hover:text-on-surface transition-colors">
              <LogOut size={18} />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto space-y-8">
        <AnimatePresence mode="wait">

          {/* ── COMMUTER ── */}
          {view === 'commuter' && (
            <motion.div key="commuter" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">

              <motion.section className="relative h-72 rounded-2xl overflow-hidden group bg-surface-container-lowest">
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <div className="px-2 py-1 rounded bg-black/60 border border-outline-variant backdrop-blur-md text-[8px] font-mono text-on-surface-variant uppercase tracking-widest">Mtwara</div>
                  <div className="px-2 py-1 rounded bg-primary/20 border border-primary/30 text-[8px] font-mono text-primary uppercase tracking-widest">Live</div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
                <motion.img
                  initial={{ scale: 1.1, opacity: 0.3 }} animate={{ scale: 1, opacity: 0.6 }} transition={{ duration: 1.5 }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 mix-blend-screen grayscale brightness-125"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCq2_xc8rt5QUcKojAocudBCowXneWkwwh9vdl35Ysu30ymOHbF1Gn0DEjefktEO-SnM1zdWXcEMEW2coUWqbIjuDDCxWygya4js-uoJ08h4QFdRrNggu9AzrIA9pxE2odfOQbCOgPA7nsVrMJXZTeCywCOi7sdv92nEi-iwnwTIiQkKWCaso33G1KuZxzMTrIKPwu8sq5lNUZ0dgmX0fNp9IlrYm_yU16yHb-J-YnaD5YtOi8I1HbuZprj07duMm32cQuLvgo9r80"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-8 left-8 z-20 max-w-[80%]">
                  <p className="text-[10px] font-mono text-primary uppercase tracking-[0.3em] mb-3">Rides · Deliveries · Mtwara</p>
                  <h2 className="font-headline text-5xl font-bold text-on-surface tracking-tighter leading-[0.9] mb-4">
                    Habari,<br /><span className="text-primary italic opacity-90">{user.full_name.split(' ')[0]}.</span>
                  </h2>
                </div>
              </motion.section>

              <UserDashboard user={user} />

              {/* Plan status */}
              <motion.section className="section-recession p-8 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-2">Your plan</h3>
                    <p className="text-primary font-bold text-xl tracking-tight">Commuter</p>
                  </div>
                  <div className="bg-surface-container-high px-4 py-1.5 rounded-full text-[9px] font-mono text-on-surface-variant flex items-center gap-2">
                    <RefreshCcw size={10} className="animate-spin-slow opacity-50" /> Renews in 14 days
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">Rides used</span>
                      <span className="text-3xl font-mono font-bold text-on-surface">14 <span className="text-on-surface-variant font-light">/ 30</span></span>
                    </div>
                    <span className="text-[10px] font-mono text-primary uppercase tracking-widest font-black">46% remaining</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: "46%" }} transition={{ duration: 1, delay: 0.5 }}
                      className="h-full progress-blade shadow-[0_0_15px_rgba(200,240,74,0.3)]"
                    />
                  </div>
                </div>
              </motion.section>
            </motion.div>
          )}

          {/* ── DRIVER ── */}
          {view === 'driver' && (
            <motion.div key="driver" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-12">
              <section className="grid grid-cols-2 gap-6">
                <motion.div className="section-recession p-8 flex flex-col justify-between aspect-square">
                  <div className="flex flex-col"><Wallet size={28} className="text-secondary mb-3" /><span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] font-black">Earnings today</span></div>
                  <div><h2 className="text-4xl font-mono font-bold text-on-surface tracking-tighter">8,400</h2><p className="text-secondary text-[10px] font-mono uppercase tracking-[0.2em] font-black mt-2">TSh</p></div>
                </motion.div>
                <motion.div className="primary-cta p-8 flex flex-col justify-between aspect-square shadow-2xl relative overflow-hidden group">
                  <div className="flex justify-between items-start"><ShieldCheck size={28} className="text-on-primary" fill="currentColor" /><span className="text-[9px] font-mono font-bold uppercase bg-white/20 px-3 py-1 rounded-full text-on-primary border border-white/20">Top rated</span></div>
                  <div><p className="text-on-primary/60 text-[10px] font-mono uppercase tracking-[0.2em] mb-2 font-black">On-time rate</p><h2 className="text-5xl font-mono font-bold text-on-primary tracking-tighter leading-none">98<span className="text-on-primary/30 font-light">%</span></h2></div>
                </motion.div>
              </section>

              <DriverDashboard user={user} />

              <motion.section className="section-recession p-8 relative overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                  <div><h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em] mb-2">Earnings this week</h4><p className="text-[10px] font-mono text-secondary font-black tracking-widest uppercase opacity-70 italic">Last 4 weeks</p></div>
                  <TrendingUp size={32} className="text-secondary opacity-30" />
                </div>
                <div className="h-32 flex items-end gap-2 px-1">
                  {[30, 45, 20, 80, 50, 65, 40, 90].map((h, i) => (
                    <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 1.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      className={`flex-1 rounded-t-sm ${h > 70 ? 'bg-secondary' : 'bg-surface-container-highest opacity-50'} h-full`} />
                  ))}
                </div>
              </motion.section>
            </motion.div>
          )}

          {/* ── SHOPKEEPER / BUSINESS ── */}
          {view === 'shopkeeper' && (
            <motion.div key="shopkeeper" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-12">
              <section className="space-y-2">
                <h2 className={`text-5xl font-headline font-bold tracking-tighter italic ${getAccentColor()}`}>
                  {user.business_name ?? 'Business Hub'}
                </h2>
                <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-[0.4em] font-black">Delivery operations</p>
              </section>

              {/* Dispatch form — now wired to UserDashboard which handles deliveries */}
              <UserDashboard user={user} />

              <section className="grid grid-cols-2 gap-4 pb-12">
                {[
                  { label: 'Deliveries sent',  val: '52',  accent: 'text-primary'  },
                  { label: 'This month (TSh)', val: '300k', accent: 'text-on-surface' },
                  { label: 'Avg delivery',     val: '14m',  accent: 'text-secondary' },
                  { label: 'Driver rating',    val: '4.9',  accent: 'text-primary'  },
                ].map((stat, i) => (
                  <motion.div key={i} className="section-recession p-6 flex flex-col justify-between aspect-video">
                    <span className="text-[9px] font-mono font-black text-on-surface-variant uppercase tracking-[0.2em]">{stat.label}</span>
                    <p className={`text-3xl font-mono font-bold tracking-tighter ${stat.accent}`}>{stat.val}</p>
                  </motion.div>
                ))}
              </section>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FAB */}
      <div className="fixed right-6 bottom-32 z-40 max-w-2xl w-full left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="flex justify-end pr-6">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="pointer-events-auto glass-navigator border border-outline-variant p-1 rounded-2xl shadow-2xl">
            <motion.button whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.95 }} onClick={cycleView}
              className={`w-14 h-14 rounded-xl ${getViewColor()} text-on-primary flex items-center justify-center shadow-lg transition-all duration-700`}>
              <Radio size={28} className="animate-pulse" />
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 px-6 pb-8 max-w-2xl mx-auto left-1/2 -translate-x-1/2">
        <div className="flex justify-around items-center p-2 glass-navigator rounded-3xl border border-outline-variant shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
          <motion.a whileTap={{ scale: 0.9 }} className={`flex-1 flex flex-col items-center justify-center ${getViewColor()} text-on-primary rounded-2xl py-4 shadow-xl border border-white/10 transition-all duration-700`} href="#">
            <Home size={22} fill="currentColor" />
            <span className="text-[10px] font-mono font-black mt-1.5 uppercase tracking-[0.2em]">{view === 'commuter' ? 'Home' : view === 'driver' ? 'Drive' : 'Hub'}</span>
          </motion.a>
          <motion.a whileHover={{ y: -4 }} whileTap={{ scale: 0.9 }} className="flex-1 flex flex-col items-center justify-center text-on-surface-variant transition-all p-4" href="#">
            <History size={22} />
            <span className="text-[10px] font-mono font-black mt-1.5 uppercase tracking-widest">History</span>
          </motion.a>
          <motion.a whileHover={{ y: -4 }} whileTap={{ scale: 0.9 }} className="flex-1 flex flex-col items-center justify-center text-on-surface-variant transition-all p-4" href="#" onClick={e => { e.preventDefault(); handleSignOut(); }}>
            <User size={22} />
            <span className="text-[10px] font-mono font-black mt-1.5 uppercase tracking-widest">Sign out</span>
          </motion.a>
        </div>
      </nav>

    </div>
  );
}
