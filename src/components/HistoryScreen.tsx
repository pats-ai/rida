import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RidaUser } from '../lib/auth';
import { MapPin, Package, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface HistoryScreenProps {
  user: RidaUser;
}

interface RideRequest {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  status: string;
  type: string;
  recipient_name?: string;
  driver_name?: string;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  completed:   'text-green-400',
  accepted:    'text-primary',
  in_progress: 'text-yellow-400',
  pending:     'text-blue-400',
  cancelled:   'text-red-400',
};

const STATUS_LABEL: Record<string, string> = {
  completed:   'Completed',
  accepted:    'Accepted',
  in_progress: 'In progress',
  pending:     'Pending',
  cancelled:   'Cancelled',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function HistoryScreen({ user }: HistoryScreenProps) {
  const [rides,   setRides]   = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<'all' | 'ride' | 'delivery'>('all');

  const isDriver = user.role === 'driver';

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const query = supabase
        .from('ride_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Drivers see rides assigned to them
      // Commuters/businesses see their own requests
      if (isDriver) {
        query.eq('driver_id', user.id);
      } else {
        query.eq('user_id', user.id);
      }

      const { data } = await query;
      setRides(data || []);
      setLoading(false);
    };
    fetch();
  }, [user.id, isDriver]);

  const filtered = rides.filter(r => filter === 'all' || r.type === filter);

  const completedCount  = rides.filter(r => r.status === 'completed').length;
  const deliveryCount   = rides.filter(r => r.type === 'delivery').length;
  const rideCount       = rides.filter(r => r.type === 'ride').length;

  return (
    <div className="space-y-6 pb-12">

      <div className="pt-2">
        <h2 className="font-headline text-3xl font-bold tracking-tighter">
          {isDriver ? 'My rides' : 'Trip history'}
        </h2>
        <p className="text-on-surface-variant text-xs font-mono mt-1 uppercase tracking-widest">
          {rides.length} total
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="section-recession p-4 text-center">
          <div className="text-2xl font-headline font-bold text-primary">{completedCount}</div>
          <div className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-1">Completed</div>
        </div>
        <div className="section-recession p-4 text-center">
          <div className="text-2xl font-headline font-bold text-secondary">{rideCount}</div>
          <div className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-1">Rides</div>
        </div>
        <div className="section-recession p-4 text-center">
          <div className="text-2xl font-headline font-bold text-blue-400">{deliveryCount}</div>
          <div className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-1">Deliveries</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'ride', 'delivery'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              filter === f
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}>
            {f === 'all' ? 'All' : f === 'ride' ? 'Rides' : 'Deliveries'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="section-recession p-5 animate-pulse">
              <div className="h-3 bg-surface-container-high rounded w-1/3 mb-3" />
              <div className="h-4 bg-surface-container-high rounded w-2/3 mb-2" />
              <div className="h-3 bg-surface-container-high rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="section-recession p-10 text-center">
          <Clock size={32} className="text-on-surface-variant mx-auto mb-3 opacity-40" />
          <p className="text-sm text-on-surface-variant font-mono">No {filter === 'all' ? '' : filter} history yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ride, i) => (
            <motion.div key={ride.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="section-recession p-5">

              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  {ride.type === 'delivery'
                    ? <Package size={14} className="text-blue-400 flex-shrink-0" />
                    : <MapPin   size={14} className="text-primary flex-shrink-0" />
                  }
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                    {ride.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-mono font-bold ${STATUS_COLOR[ride.status] ?? 'text-on-surface-variant'}`}>
                    {STATUS_LABEL[ride.status] ?? ride.status}
                  </span>
                  <span className="text-[10px] text-on-surface-variant font-mono">
                    {formatDate(ride.created_at)}
                  </span>
                </div>
              </div>

              <p className="font-bold text-sm leading-snug">
                {ride.pickup_location} → {ride.dropoff_location}
              </p>

              {ride.recipient_name && (
                <p className="text-xs text-on-surface-variant mt-1.5">
                  To: {ride.recipient_name}
                </p>
              )}

              {ride.driver_name && (
                <p className="text-xs text-on-surface-variant mt-1.5">
                  Driver: {ride.driver_name}
                </p>
              )}

              {/* Driver earnings per trip */}
              {isDriver && ride.status === 'completed' && (
                <div className="mt-3 pt-3 border-t border-outline-variant flex items-center justify-between">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Earned</span>
                  <span className="text-sm font-bold text-primary font-mono">+2,400 TSh</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
