import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RidaUser } from '../lib/auth';
import { MapPin, Package, RefreshCw, CheckCircle, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { sendNotification } from '../lib/notifications';

interface DriverDashboardProps {
  user: RidaUser;
}

interface RideRequest {
  id: string;
  user_id: string;
  pickup_location: string;
  dropoff_location: string;
  status: string;
  type: 'ride' | 'delivery';
  driver_id?: string;
  recipient_name?: string;
  recipient_phone?: string;
  notes?: string;
  created_at: string;
}

export function DriverDashboard({ user }: DriverDashboardProps) {
  const [pending, setPending] = useState<RideRequest[]>([]);
  const [myRides, setMyRides] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState<string | null>(null);
  const [online,  setOnline]  = useState(true);

  // ── Fetch (called once on mount only) ───────────────────
  const fetchRides = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ride_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      setPending(data.filter(r => r.status === 'pending'));
      setMyRides(data.filter(r => r.driver_id === user.id && r.status !== 'completed'));
    }
    setLoading(false);
  };

  // ── Realtime — update state directly, no refetch ─────────
  useEffect(() => {
    fetchRides();
    const ch = supabase
      .channel('driver_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ride_requests' }, payload => {
        const r = payload.new as RideRequest;
        if (r.status === 'pending') {
          setPending(prev => [r, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ride_requests' }, payload => {
        const r = payload.new as RideRequest;
        // Remove from pending if no longer pending
        if (r.status !== 'pending') {
          setPending(prev => prev.filter(x => x.id !== r.id));
        }
        // Update my rides
        if (r.driver_id === user.id) {
          if (r.status === 'completed') {
            setMyRides(prev => prev.filter(x => x.id !== r.id));
          } else {
            setMyRides(prev => {
              const exists = prev.find(x => x.id === r.id);
              if (exists) return prev.map(x => x.id === r.id ? r : x);
              return [r, ...prev];
            });
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user.id]);

  // ── Accept ───────────────────────────────────────────────
  const acceptRide = async (ride: RideRequest) => {
    setActing(ride.id);
    const { error } = await supabase
      .from('ride_requests')
      .update({
        status:      'accepted',
        driver_id:   user.id,
        driver_name: user.full_name,
        vehicle:     'Honda CB 125',
        plate:       'T 234 ABC',
        eta:         '5 mins',
      })
      .eq('id', ride.id)
      .eq('status', 'pending');

    if (error) {
      alert('Could not accept — try again');
    } else {
      // Notify the commuter their ride was accepted
      await sendNotification(
        ride.user_id,
        '🏍️ Driver on the way',
        `${user.full_name} accepted your ride · ETA 5 mins`
      );
    }
    setActing(null);
  };

  // ── Start ────────────────────────────────────────────────
  const startRide = async (ride: RideRequest) => {
    setActing(ride.id);
    await supabase.from('ride_requests').update({ status: 'in_progress' }).eq('id', ride.id);
    // Notify commuter ride has started
    await sendNotification(
      ride.user_id,
      '🏍️ Ride in progress',
      `${user.full_name} has started your ride`
    );
    setActing(null);
  };

  // ── Complete ─────────────────────────────────────────────
  const completeRide = async (ride: RideRequest) => {
    setActing(ride.id);
    await supabase.from('ride_requests').update({ status: 'completed' }).eq('id', ride.id);
    // Notify commuter ride is done
    await sendNotification(
      ride.user_id,
      '✅ Ride complete',
      `You have arrived at ${ride.dropoff_location}`
    );
    setActing(null);
  };

  const TypeIcon = ({ type }: { type: string }) =>
    type === 'delivery'
      ? <Package size={14} className="text-blue-400" />
      : <MapPin   size={14} className="text-primary"  />;

  return (
    <div className="space-y-10">

      {/* ── Online toggle ── */}
      <div className="flex items-center justify-between section-recession px-5 py-4">
        <div>
          <p className="font-bold text-sm">{user.full_name}</p>
          <p className="text-xs text-on-surface-variant font-mono mt-0.5">{online ? 'Taking requests' : 'Off duty'}</p>
        </div>
        <button
          onClick={() => setOnline(v => !v)}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${online ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}
        >
          {online ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* ── Pending requests ── */}
      <div>
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em]">
            New requests {pending.length > 0 && <span className="text-primary ml-1">({pending.length})</span>}
          </h3>
          <button onClick={fetchRides}>
            <RefreshCw size={14} className={`text-on-surface-variant ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {!online && (
          <p className="text-sm text-on-surface-variant font-mono section-recession px-4 py-3">
            You are offline — go online to receive requests
          </p>
        )}

        {online && pending.length === 0 && !loading && (
          <p className="text-sm text-on-surface-variant font-mono">No pending requests</p>
        )}

        {online && pending.map(ride => (
          <motion.div
            key={ride.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="section-recession p-5 mb-3 border border-primary/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <TypeIcon type={ride.type} />
              <span className="text-xs font-mono text-on-surface-variant uppercase">{ride.type}</span>
              <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
            <p className="font-bold text-sm mb-1">{ride.pickup_location} → {ride.dropoff_location}</p>
            {ride.recipient_name && (
              <p className="text-xs text-on-surface-variant mb-3">To: {ride.recipient_name} · {ride.recipient_phone}</p>
            )}
            {ride.notes && (
              <p className="text-xs text-on-surface-variant mb-3 italic">"{ride.notes}"</p>
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={acting === ride.id}
              onClick={() => acceptRide(ride)}
              className="w-full primary-cta py-3 rounded-xl text-sm font-bold mt-2"
            >
              {acting === ride.id ? 'Accepting...' : 'Accept'}
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* ── My active rides ── */}
      <div>
        <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em] mb-3 px-1">My rides</h3>

        {myRides.length === 0 && (
          <p className="text-sm text-on-surface-variant font-mono">No active rides</p>
        )}

        {myRides.map(ride => (
          <motion.div key={ride.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="section-recession p-5 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <TypeIcon type={ride.type} />
              <span className={`text-xs font-mono font-bold ${
                ride.status === 'accepted'    ? 'text-primary' :
                ride.status === 'in_progress' ? 'text-yellow-400' : 'text-on-surface-variant'
              }`}>
                {ride.status === 'accepted' ? 'Accepted' : ride.status === 'in_progress' ? 'In progress' : ride.status}
              </span>
            </div>
            <p className="font-bold text-sm mb-3">{ride.pickup_location} → {ride.dropoff_location}</p>
            <div className="flex gap-3">
              {ride.status === 'accepted' && (
                <motion.button whileTap={{ scale: 0.97 }} disabled={acting === ride.id} onClick={() => startRide(ride)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 py-2.5 rounded-xl text-sm font-bold">
                  <Play size={14} /> Start ride
                </motion.button>
              )}
              {ride.status === 'in_progress' && (
                <motion.button whileTap={{ scale: 0.97 }} disabled={acting === ride.id} onClick={() => completeRide(ride)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary/20 text-primary border border-primary/30 py-2.5 rounded-xl text-sm font-bold">
                  <CheckCircle size={14} /> Mark complete
                </motion.button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

    </div>
  );
}
