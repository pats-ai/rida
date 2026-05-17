import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, ArrowRight, Shield, Loader } from 'lucide-react';
import { sendOTP, verifyOTP, createProfile, UserRole, RidaUser } from '../lib/auth';
import { normalisePhone } from '../lib/auth';

interface AuthScreenProps {
  onAuth: (user: RidaUser) => void;
}

type Step = 'phone' | 'otp' | 'profile';

const ROLES: { value: UserRole; label: string; sub: string; emoji: string }[] = [
  { value: 'commuter', label: 'Commuter', sub: 'Daily rides & deliveries', emoji: '🏍️' },
  { value: 'driver',   label: 'Driver',   sub: 'I am a boda driver',       emoji: '🧑‍✈️' },
  { value: 'business', label: 'Business', sub: 'Shop, pharmacy, office',   emoji: '🏢' },
];

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [step, setStep]         = useState<Step>('phone');
  const [phone, setPhone]       = useState('');
  const [otp, setOtp]           = useState('');
  const [name, setName]         = useState('');
  const [area, setArea]         = useState('');
  const [bizName, setBizName]   = useState('');
  const [role, setRole]         = useState<UserRole>('commuter');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [userId, setUserId]     = useState('');

  // ── Step 1: send OTP ──────────────────────────────────────
  const handleSendOTP = async () => {
    if (!phone.trim()) { setError('Enter your phone number'); return; }
    setLoading(true); setError('');

    const { error: err } = await sendOTP(phone);

    if (err) {
      // In dev/test show OTP flow anyway so you can test without Twilio
      if (import.meta.env.DEV) {
        console.warn('OTP send failed (dev mode) — proceeding anyway:', err);
        setStep('otp');
      } else {
        setError(err);
      }
    } else {
      setStep('otp');
    }
    setLoading(false);
  };

  // ── Step 2: verify OTP ────────────────────────────────────
  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length < 4) { setError('Enter the code we sent you'); return; }
    setLoading(true); setError('');

    const { user, error: err } = await verifyOTP(phone, otp);

    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    if (user) {
      // Existing user — go straight in
      onAuth(user);
    } else {
      // New user — collect profile
      setUserId(''); // will be set from session in createProfile
      setStep('profile');
    }
    setLoading(false);
  };

  // ── Step 3: create profile ────────────────────────────────
  const handleCreateProfile = async () => {
    if (!name.trim()) { setError('Enter your name'); return; }
    setLoading(true); setError('');

    // Get user id from session
    const { data } = await (await import('../lib/supabase')).supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) { setError('Session expired — please try again'); setStep('phone'); setLoading(false); return; }

    const profile = {
      id: uid,
      phone: normalisePhone(phone),
      full_name: name,
      role,
      area: area || undefined,
      business_name: role === 'business' ? bizName : undefined,
    };

    const { error: err } = await createProfile(profile);
    if (err) { setError(err); setLoading(false); return; }

    onAuth(profile as any);
    setLoading(false);
  };

  const inputCls = 'w-full bg-surface-container-high rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono placeholder:text-on-surface-variant/30 border border-transparent focus:border-primary/30';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
        <h1 className="text-6xl font-headline font-bold tracking-tighter">
          Ri<span className="text-primary">d</span>a
        </h1>
        <p className="text-on-surface-variant text-xs font-mono uppercase tracking-[0.3em] mt-2">Mtwara · Moving</p>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── STEP 1: Phone ── */}
        {step === 'phone' && (
          <motion.div key="phone" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full max-w-sm">
            <h2 className="text-2xl font-headline font-bold mb-2">Enter your number</h2>
            <p className="text-on-surface-variant text-sm mb-8">We'll send a code to your Vodacom or Airtel number.</p>

            <div className="relative mb-4">
              <Phone size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-primary opacity-50" />
              <input
                className={`${inputCls} pl-12`}
                placeholder="07XX XXX XXX"
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
              />
            </div>

            {error && <p className="text-red-400 text-xs mb-4 font-mono">{error}</p>}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full primary-cta py-4 rounded-2xl font-bold flex items-center justify-center gap-3"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <><span>Send code</span><ArrowRight size={18} /></>}
            </motion.button>

            <p className="text-center text-on-surface-variant text-xs mt-6 font-mono">
              +255 numbers only · No password needed
            </p>
          </motion.div>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === 'otp' && (
          <motion.div key="otp" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full max-w-sm">
            <h2 className="text-2xl font-headline font-bold mb-2">Enter the code</h2>
            <p className="text-on-surface-variant text-sm mb-2">
              Sent to <span className="text-primary font-mono">{phone}</span>
            </p>
            <button onClick={() => { setStep('phone'); setOtp(''); setError(''); }} className="text-xs text-on-surface-variant underline mb-8">Wrong number?</button>

            <div className="relative mb-4">
              <Shield size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-primary opacity-50" />
              <input
                className={`${inputCls} pl-12 text-center text-2xl tracking-[0.5em]`}
                placeholder="······"
                type="number"
                maxLength={6}
                value={otp}
                onChange={e => { setOtp(e.target.value.slice(0, 6)); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                autoFocus
              />
            </div>

            {error && <p className="text-red-400 text-xs mb-4 font-mono">{error}</p>}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleVerifyOTP}
              disabled={loading}
              className="w-full primary-cta py-4 rounded-2xl font-bold flex items-center justify-center gap-3"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <><span>Verify</span><ArrowRight size={18} /></>}
            </motion.button>

            <button onClick={handleSendOTP} className="w-full text-center text-on-surface-variant text-xs mt-4 underline font-mono">
              Resend code
            </button>
          </motion.div>
        )}

        {/* ── STEP 3: Profile ── */}
        {step === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full max-w-sm">
            <h2 className="text-2xl font-headline font-bold mb-2">Almost there</h2>
            <p className="text-on-surface-variant text-sm mb-8">Just a few details to set up your account.</p>

            <input
              className={`${inputCls} mb-4`}
              placeholder="Your full name"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
            />

            <input
              className={`${inputCls} mb-4`}
              placeholder="Your area e.g. Shangani, Chuno"
              value={area}
              onChange={e => setArea(e.target.value)}
            />

            {/* Role selector */}
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-3">I am a...</p>
            <div className="flex flex-col gap-3 mb-4">
              {ROLES.map(r => (
                <motion.button
                  key={r.value}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRole(r.value)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                    role === r.value
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant bg-surface-container-low'
                  }`}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <div>
                    <p className="font-bold text-sm">{r.label}</p>
                    <p className="text-xs text-on-surface-variant">{r.sub}</p>
                  </div>
                  {role === r.value && (
                    <div className="ml-auto w-4 h-4 rounded-full bg-primary" />
                  )}
                </motion.button>
              ))}
            </div>

            {role === 'business' && (
              <input
                className={`${inputCls} mb-4`}
                placeholder="Business name e.g. Mtwara Pharmacy"
                value={bizName}
                onChange={e => setBizName(e.target.value)}
              />
            )}

            {error && <p className="text-red-400 text-xs mb-4 font-mono">{error}</p>}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateProfile}
              disabled={loading}
              className="w-full primary-cta py-4 rounded-2xl font-bold flex items-center justify-center gap-3"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <><span>Start using Rida</span><ArrowRight size={18} /></>}
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
