import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home, History, User, Wallet, ShieldCheck, TrendingUp,
  Store, LogOut, RefreshCcw, LayoutGrid, Package
} from "lucide-react";

import { UserDashboard }   from "./components/UserDashboard";
import { DriverDashboard } from "./components/DriverDashboard";
import { AuthScreen }      from "./components/AuthScreen";
import { HistoryScreen }   from "./components/HistoryScreen";
import { supabase }        from "./lib/supabase";
import { getProfile, signOut, RidaUser } from "./lib/auth";

type Tab = 'home' | 'history' | 'profile';

export default function App() {
  const [user,     setUser]     = useState<RidaUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab,      setTab]      = useState<Tab>('home');

  // ── Restore session ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const profile = await getProfile(data.session.user.id);
        if (profile) setUser(profile);
      }
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth    = (u: RidaUser) => { setUser(u); setTab('home'); };
  const handleSignOut = async () => { await signOut(); setUser(null); setTab('home'); };

  // ── Loading splash ───────────────────────────────────────
  if (checking) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-headline font-bold tracking-tighter mb-4">
          Ri<span className="text-primary">d</span>a
        </h1>
        <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto animate-ping" />
      </div>
    </div>
  );

  // ── Auth gate ────────────────────────────────────────────
  if (!user) return <AuthScreen onAuth={handleAuth} />;

  // ── Role-based config ────────────────────────────────────
  const isDriver   = user.role === 'driver';
  const isBusiness = user.role === 'business';
  const isCommuter = user.role === 'commuter';

  const accentClass = isDriver   ? 'bg-secondary text-on-primary shadow-[0_0_20px_rgba(96,165,250,0.35)]'
                    : isBusiness ? 'bg-primary-fixed-dim text-on-primary shadow-[0_0_20px_rgba(174,213,47,0.3)]'
                    :              'bg-primary text-on-primary shadow-[0_0_20px_rgba(200,240,74,0.35)]';

  const accentText = isDriver   ? 'text-secondary'
                   : isBusiness ? 'text-primary-fixed-dim'
                   :              'text-primary';

  const viewLabel = isDriver ? 'DRIVE' : isBusiness ? 'HUB' : 'STUDIO';
  const initials  = user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="h-screen flex flex-col font-sans bg-background text-on-surface overflow-hidden selection:bg-primary selection:text-on-primary">

      {/* ── Header — stays fixed at top, never scrolls ── */}
      <header className="flex-shrink-0 w-full z-50 glass-navigator border-b border-outline-variant">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 ${accentClass} rounded-lg flex items-center justify-center transition-all duration-500`}>
              {isBusiness ? <Store size={20} /> : isDriver ? <ShieldCheck size={20} /> : <LayoutGrid size={20} />}
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight uppercase">
                RIDA <span className={`${accentText} italic transition-colors duration-500`}>{viewLabel}</span>
              </h1>
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${isDriver ? 'bg-secondary' : 'bg-primary'} animate-pulse`} />
                <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-mono">
                  {user.full_name} · {user.role}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
              isDriver ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
            }`}>{initials}</div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleSignOut}
              className="text-on-surface-variant hover:text-on-surface transition-colors">
              <LogOut size={18} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto pb-32 px-6 max-w-2xl w-full mx-auto space-y-8 pt-6">
        <AnimatePresence mode="wait">

          {/* ── COMMUTER HOME ── */}
          {isCommuter && tab === 'home' && (
            <motion.div key="commuter-home"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-10">

              {/* Hero */}
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

              {/* Plan card */}
              <motion.section className="section-recession p-8 relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-2">Your plan</h3>
                    <p className="text-primary font-bold text-xl tracking-tight">Commuter</p>
                  </div>
                  <div className="bg-surface-container-high px-4 py-1.5 rounded-full text-[9px] font-mono text-on-surface-variant flex items-center gap-2">
                    <RefreshCcw size={10} className="animate-spin-slow opacity-50" /> Renews in 14 days
                  </div>
                </div>
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">Rides used</span>
                    <div className="text-3xl font-mono font-bold text-on-surface">14 <span className="text-on-surface-variant font-light">/ 30</span></div>
                  </div>
                  <span className="text-[10px] font-mono text-primary uppercase tracking-widest font-black">46% remaining</span>
                </div>
                <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '46%' }} transition={{ duration: 1, delay: 0.5 }}
                    className="h-full progress-blade shadow-[0_0_15px_rgba(200,240,74,0.3)]" />
                </div>
              </motion.section>
            </motion.div>
          )}

          {/* ── DRIVER HOME ── */}
          {isDriver && tab === 'home' && (
            <motion.div key="driver-home"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="space-y-10">
              <section className="grid grid-cols-2 gap-6">
                <motion.div className="section-recession p-8 flex flex-col justify-between aspect-square">
                  <div><Wallet size={28} className="text-secondary mb-3" /><span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-[0.2em] font-black">Earnings today</span></div>
                  <div><h2 className="text-4xl font-mono font-bold text-on-surface tracking-tighter">8,400</h2><p className="text-secondary text-[10px] font-mono uppercase tracking-[0.2em] font-black mt-2">TSh</p></div>
                </motion.div>
                <motion.div className="primary-cta p-8 flex flex-col justify-between aspect-square shadow-2xl">
                  <div className="flex justify-between items-start"><ShieldCheck size={28} className="text-on-primary" fill="currentColor" /><span className="text-[9px] font-mono font-bold uppercase bg-white/20 px-3 py-1 rounded-full text-on-primary border border-white/20">Top rated</span></div>
                  <div><p className="text-on-primary/60 text-[10px] font-mono uppercase tracking-[0.2em] mb-2 font-black">On-time rate</p><h2 className="text-5xl font-mono font-bold text-on-primary tracking-tighter leading-none">98<span className="text-on-primary/30 font-light">%</span></h2></div>
                </motion.div>
              </section>
              <DriverDashboard user={user} />
              <motion.section className="section-recession p-8">
                <div className="flex justify-between items-center mb-6">
                  <div><h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em] mb-2">Earnings trend</h4><p className="text-[10px] font-mono text-secondary font-black tracking-widest uppercase opacity-70 italic">Last 8 sessions</p></div>
                  <TrendingUp size={32} className="text-secondary opacity-30" />
                </div>
                <div className="h-32 flex items-end gap-2 px-1">
                  {[30,45,20,80,50,65,40,90].map((h,i) => (
                    <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 1.5, delay: i*0.1, ease: [0.22,1,0.36,1] }}
                      className={`flex-1 rounded-t-sm ${h>70?'bg-secondary':'bg-surface-container-highest opacity-50'} h-full`} />
                  ))}
                </div>
              </motion.section>
            </motion.div>
          )}

          {/* ── BUSINESS HOME ── */}
          {isBusiness && tab === 'home' && (
            <motion.div key="biz-home"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="space-y-10">
              <section className="space-y-2">
                <h2 className={`text-5xl font-headline font-bold tracking-tighter italic ${accentText}`}>
                  {user.business_name ?? 'Business Hub'}
                </h2>
                <p className="text-on-surface-variant text-[10px] font-mono uppercase tracking-[0.4em] font-black">Delivery operations</p>
              </section>
              <UserDashboard user={user} />
              <section className="grid grid-cols-2 gap-4 pb-12">
                {[
                  { label:'Deliveries sent', val:'52',  accent:'text-primary'    },
                  { label:'This month (TSh)', val:'300k', accent:'text-on-surface' },
                  { label:'Avg delivery',    val:'14m', accent:'text-secondary'  },
                  { label:'Driver rating',   val:'4.9', accent:'text-primary'    },
                ].map((s,i) => (
                  <motion.div key={i} className="section-recession p-6 flex flex-col justify-between aspect-video">
                    <span className="text-[9px] font-mono font-black text-on-surface-variant uppercase tracking-[0.2em]">{s.label}</span>
                    <p className={`text-3xl font-mono font-bold tracking-tighter ${s.accent}`}>{s.val}</p>
                  </motion.div>
                ))}
              </section>
            </motion.div>
          )}

          {/* ── HISTORY TAB (all roles) ── */}
          {tab === 'history' && (
            <motion.div key="history"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <HistoryScreen user={user} />
            </motion.div>
          )}

          {/* ── PROFILE TAB (all roles) ── */}
          {tab === 'profile' && (
            <motion.div key="profile"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="space-y-6 pb-12">
              <div className="flex flex-col items-center pt-6 pb-8">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-headline font-bold text-2xl mb-4 ${
                  isDriver ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
                }`}>{initials}</div>
                <h2 className="font-headline text-2xl font-bold">{user.full_name}</h2>
                <p className="text-on-surface-variant text-sm mt-1">{user.phone}</p>
                <div className={`mt-3 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isDriver   ? 'bg-secondary/10 text-secondary' :
                  isBusiness ? 'bg-primary-fixed-dim/10 text-primary-fixed-dim' :
                               'bg-primary/10 text-primary'
                }`}>{user.role}</div>
              </div>

              <div className="section-recession p-6 space-y-4">
                <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Name</span><span>{user.full_name}</span></div>
                <div className="h-px bg-outline-variant" />
                <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Phone</span><span>{user.phone}</span></div>
                <div className="h-px bg-outline-variant" />
                <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Role</span><span className={accentText}>{user.role}</span></div>
                {user.area && (<><div className="h-px bg-outline-variant" /><div className="flex justify-between text-sm"><span className="text-on-surface-variant">Area</span><span>{user.area}</span></div></>)}
                {user.business_name && (<><div className="h-px bg-outline-variant" /><div className="flex justify-between text-sm"><span className="text-on-surface-variant">Business</span><span>{user.business_name}</span></div></>)}
                <div className="h-px bg-outline-variant" />
                <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Plan</span><span className={accentText}>Commuter · Active</span></div>
                <div className="h-px bg-outline-variant" />
                <div className="flex justify-between text-sm"><span className="text-on-surface-variant">Payment</span><span className="text-green-400">Paid via M-Pesa</span></div>
              </div>

              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSignOut}
                className="w-full py-4 rounded-2xl border border-red-500/30 text-red-400 text-sm font-bold bg-red-500/5">
                Sign out
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Bottom nav ── */}
      <nav className="flex-shrink-0 w-full z-50 px-4 pb-6 pt-2 max-w-2xl mx-auto bg-background">
        <div className="flex justify-around items-center p-2 glass-navigator rounded-3xl border border-outline-variant shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
          {[
            { t: 'home'    as Tab, icon: Home,    label: isDriver ? 'Drive' : isBusiness ? 'Hub' : 'Home' },
            { t: 'history' as Tab, icon: History, label: 'History' },
            { t: 'profile' as Tab, icon: User,    label: 'Profile'  },
          ].map(({ t, icon: Icon, label }) => (
            <motion.button key={t} whileTap={{ scale: 0.9 }} onClick={() => setTab(t)}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all duration-300 ${
                tab === t
                  ? `${accentClass} shadow-xl border border-white/10`
                  : 'text-on-surface-variant'
              }`}>
              <Icon size={20} fill={tab === t ? 'currentColor' : 'none'} />
              <span className="text-[10px] font-mono font-black mt-1.5 uppercase tracking-[0.2em]">{label}</span>
            </motion.button>
          ))}
        </div>
      </nav>
    </div>
  );
}
