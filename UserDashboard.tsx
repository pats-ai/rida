import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RidaUser } from '../lib/auth';
import { MapPin, Package, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface UserDashboardProps {
  user: RidaUser;
}

type BookingType = 'ride' | 'delivery';

interface RideRequest {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  status: string;
  type: BookingType;
  recipient_name?: string;
  recipient_phone?: string;
  notes?: string;
  driver_name?: string;
  vehicle?: string;
  plate?: string;
  eta?: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending:     'Finding your driver...',
  accepted:    'Driver is on the way',
  in_progress: 'Ride in progress',
  completed:   'Completed',
};

const STATUS_COLOR: Record<string, string> = {
  pending:     'text-blue-400',
  accepted:    'text-primary',
  in_progress: 'text-yellow-400',
  completed:   'text-on-surface-variant',
};

export function UserDashboard({ user }: UserDashboardProps) {
  const [bookingType, setBookingType] = useState<BookingType>('ride');
  const [pickup,   setPickup]   = useState('');
  const [dropoff,  setDropoff]  = useState('');
  const [recName,  setRecName]  = useState('');
  const [recPhone, setRecPhone] = useState('');
  const [notes,    setNotes]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg,  setStatusMsg]  = useState('');
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch rides ──────────────────────────────────────────
  const fetchRides = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRides(data || []);
    setLoading(false);
  };

  // ── Realtime ─────────────────────────────────────────────
  useEffect(() => {
    fetchRides();
    const channel = supabase
      .channel(`user_rides_${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'ride_requests',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        if (payload.eventType === 'INSERT') setRides(p => [payload.new as RideRequest, ...p]);
        if (payload.eventType === 'UPDATE') setRides(p => p.map(r => r.id === payload.new.id ? payload.new as RideRequest : r));
        if (payload.eventType === 'DELETE') setRides(p => p.filter(r => r.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  // ── Submit booking ────────────────────────────────────────
  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff) { setStatusMsg('Enter pickup and drop-off'); return; }

    const hasActive = rides.some(r => ['pending', 'accepted', 'in_progress'].includes(r.status));
    if (hasActive) { setStatusMsg('You already have an active booking'); return; }

    setSubmitting(true); setStatusMsg('');

    const payload: any = {
      user_id: user.id,
      pickup_location: pickup,
      dropoff_location: dropoff,
      status: 'pending',
      type: bookingType,
    };

    if (bookingType === 'delivery') {
      payload.recipient_name  = recName;
      payload.recipient_phone = recPhone;
      payload.notes           = notes;
    }

    const { error } = await supabase.from('ride_requests').insert([payload]);
    if (error) { setStatusMsg(error.message); }
    else {
      setStatusMsg(bookingType === 'ride' ? 'Looking for a driver...' : 'Delivery request sent!');
      setPickup(''); setDropoff(''); setRecName(''); setRecPhone(''); setNotes('');
    }
    setSubmitting(false);
  };

  const inputCls = 'w-full bg-surface-container-high rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-on-surface-variant/30';

  return (
    <div className="space-y-8 max-w-md mx-auto">

      {/* ── Booking form ── */}
      <div className="section-recession p-6">

        {/* Type toggle */}
        <div className="flex gap-3 mb-6">
          {[
            { v: 'ride' as BookingType,     label: 'Book a ride',     Icon: MapPin  },
            { v: 'delivery' as BookingType, label: 'Send a delivery', Icon: Package },
          ].map(({ v, label, Icon }) => (
            <button
              key={v}
              onClick={() => setBookingType(v)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                bookingType === v
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submitBooking} className="space-y-3">
          <input className={inputCls} placeholder="Pickup location" value={pickup} onChange={e => setPickup(e.target.value)} />
          <input className={inputCls} placeholder="Drop-off location" value={dropoff} onChange={e => setDropoff(e.target.value)} />

          {bookingType === 'delivery' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 overflow-hidden">
              <input className={inputCls} placeholder="Recipient name" value={recName}  onChange={e => setRecName(e.target.value)} />
              <input className={inputCls} placeholder="Recipient phone" type="tel" value={recPhone} onChange={e => setRecPhone(e.target.value)} />
              <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Notes e.g. Handle with care, ask for Mama Amani" value={notes} onChange={e => setNotes(e.target.value)} />
            </motion.div>
          )}

          {statusMsg && <p className="text-xs text-primary font-mono">{statusMsg}</p>}

          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={submitting}
            className="w-full primary-cta py-4 rounded-xl font-bold text-sm"
          >
            {submitting ? 'Sending...' : bookingType === 'ride' ? 'Request ride' : 'Dispatch delivery'}
          </motion.button>
        </form>
      </div>

      {/* ── Ride history ── */}
      <div>
        <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em] mb-4 px-1">Your rides</h3>

        {loading ? (
          <p className="text-sm text-on-surface-variant font-mono">Loading...</p>
        ) : rides.length === 0 ? (
          <p className="text-sm text-on-surface-variant font-mono">No rides yet. Book one above.</p>
        ) : (
          rides.map(ride => (
            <motion.div
              key={ride.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="section-recession p-5 mb-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {ride.type === 'delivery' ? <Package size={13} className="text-primary" /> : <MapPin size={13} className="text-primary" />}
                    <span className="text-xs font-mono text-on-surface-variant uppercase">{ride.type}</span>
                  </div>
                  <p className="font-bold text-sm">{ride.pickup_location} → {ride.dropoff_location}</p>
                  {ride.recipient_name && <p className="text-xs text-on-surface-variant mt-1">To: {ride.recipient_name} · {ride.recipient_phone}</p>}
                </div>
                <span className={`text-xs font-mono font-bold ${STATUS_COLOR[ride.status] ?? 'text-on-surface-variant'}`}>
                  {STATUS_LABEL[ride.status] ?? ride.status}
                </span>
              </div>

              {ride.status === 'accepted' && ride.driver_name && (
                <div className="mt-3 pt-3 border-t border-outline-variant text-xs text-primary font-mono space-y-0.5">
                  <p>Driver: {ride.driver_name}</p>
                  <p>Plate: {ride.plate} · {ride.vehicle}</p>
                  <p>ETA: {ride.eta}</p>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
