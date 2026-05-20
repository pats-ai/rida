import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RidaUser } from '../lib/auth';
import { MapPin, Package, Clock, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserDashboardProps {
  user: RidaUser;
}

type BookingType = 'ride' | 'delivery';
type ScheduleType = 'now' | 'later' | 'recurring';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DELIVERY_CATEGORIES = [
  { value: 'food',      label: '🍱 Food order'      },
  { value: 'groceries', label: '🛒 Groceries'        },
  { value: 'parcel',    label: '📦 Parcel / document' },
  { value: 'pharmacy',  label: '💊 Pharmacy / meds'  },
  { value: 'household', label: '🏠 Household items'  },
  { value: 'other',     label: '📋 Other'             },
];

interface RideRequest {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  status: string;
  type: BookingType;
  recipient_name?: string;
  recipient_phone?: string;
  notes?: string;
  delivery_category?: string;
  item_description?: string;
  special_instructions?: string;
  schedule_type?: string;
  scheduled_time?: string;
  recurring_days?: string;
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
  // Booking type
  const [bookingType,   setBookingType]   = useState<BookingType>('ride');
  const [scheduleType,  setScheduleType]  = useState<ScheduleType>('now');

  // Core fields
  const [pickup,   setPickup]   = useState('');
  const [dropoff,  setDropoff]  = useState('');

  // Delivery fields
  const [category,     setCategory]     = useState('');
  const [itemDesc,     setItemDesc]     = useState('');
  const [recName,      setRecName]      = useState('');
  const [recPhone,     setRecPhone]     = useState('');
  const [specialInstr, setSpecialInstr] = useState('');

  // Schedule fields
  const [scheduledTime, setScheduledTime] = useState('');
  const [recurringDays, setRecurringDays] = useState<string[]>(['Mon','Tue','Wed','Thu','Fri']);
  const [recurringTime, setRecurringTime] = useState('');

  // State
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg,  setStatusMsg]  = useState('');
  const [rides,      setRides]      = useState<RideRequest[]>([]);
  const [loading,    setLoading]    = useState(true);

  const toggleDay = (day: string) => {
    setRecurringDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // ── Fetch ────────────────────────────────────────────────
  const fetchRides = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'accepted', 'in_progress'])
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
        if (payload.eventType === 'INSERT') {
          const r = payload.new as RideRequest;
          if (['pending','accepted','in_progress'].includes(r.status))
            setRides(p => [r, ...p]);
        }
        if (payload.eventType === 'UPDATE') {
          setRides(p => {
            const updated = payload.new as RideRequest;
            // Remove completed/cancelled from active list
            if (['completed','cancelled'].includes(updated.status))
              return p.filter(r => r.id !== updated.id);
            return p.map(r => r.id === updated.id ? updated : r);
          });
        }
        if (payload.eventType === 'DELETE')
          setRides(p => p.filter(r => r.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  // ── Submit ────────────────────────────────────────────────
  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup.trim() || !dropoff.trim()) {
      setStatusMsg('Please enter pickup and drop-off locations');
      return;
    }
    if (bookingType === 'delivery' && !recName.trim()) {
      setStatusMsg('Please enter the recipient name');
      return;
    }
    if (scheduleType === 'recurring' && recurringDays.length === 0) {
      setStatusMsg('Please select at least one day');
      return;
    }

    setSubmitting(true);
    setStatusMsg('');

    const payload: any = {
      user_id:          user.id,
      pickup_location:  pickup.trim(),
      dropoff_location: dropoff.trim(),
      status:           scheduleType === 'now' ? 'pending' : 'scheduled',
      type:             bookingType,
      schedule_type:    scheduleType,
    };

    if (scheduleType === 'later')     payload.scheduled_time = scheduledTime;
    if (scheduleType === 'recurring') {
      payload.recurring_days = recurringDays.join(',');
      payload.scheduled_time = recurringTime;
    }

    if (bookingType === 'delivery') {
      payload.delivery_category    = category;
      payload.item_description     = itemDesc;
      payload.recipient_name       = recName;
      payload.recipient_phone      = recPhone;
      payload.special_instructions = specialInstr;
    }

    const { error } = await supabase.from('ride_requests').insert([payload]);

    if (error) {
      setStatusMsg(error.message);
    } else {
      const msg =
        scheduleType === 'now'       ? (bookingType === 'ride' ? '🏍️ Looking for a driver...' : '📦 Delivery request sent!')
        : scheduleType === 'later'   ? '📅 Ride scheduled!'
        :                              '🔁 Recurring ride set up!';
      setStatusMsg(msg);
      // Reset form
      setPickup(''); setDropoff(''); setCategory(''); setItemDesc('');
      setRecName(''); setRecPhone(''); setSpecialInstr('');
      setScheduledTime(''); setRecurringTime('');
    }
    setSubmitting(false);
  };

  const inputCls  = 'w-full bg-surface-container-high rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-on-surface-variant/30';
  const selectCls = `${inputCls} appearance-none`;

  return (
    <div className="space-y-8 max-w-md mx-auto">

      {/* ── Booking form ── */}
      <div className="section-recession p-6">

        {/* Ride / Delivery toggle */}
        <div className="flex gap-2 mb-5">
          {([
            { v: 'ride'     as BookingType, label: 'Book a ride',     Icon: MapPin  },
            { v: 'delivery' as BookingType, label: 'Send a delivery', Icon: Package },
          ] as const).map(({ v, label, Icon }) => (
            <button key={v} onClick={() => setBookingType(v)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                bookingType === v ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
              }`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* Schedule type */}
        <div className="flex gap-2 mb-5">
          {([
            { v: 'now'       as ScheduleType, label: 'Now'       },
            { v: 'later'     as ScheduleType, label: 'Schedule'  },
            { v: 'recurring' as ScheduleType, label: 'Recurring' },
          ] as const).map(({ v, label }) => (
            <button key={v} onClick={() => setScheduleType(v)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                scheduleType === v
                  ? 'bg-surface-container-high text-primary border border-primary/30'
                  : 'bg-surface-container-high text-on-surface-variant opacity-50'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submitBooking} className="space-y-3">

          {/* Route */}
          <input className={inputCls} placeholder="Pickup location"   value={pickup}  onChange={e => setPickup(e.target.value)} />
          <input className={inputCls} placeholder="Drop-off location" value={dropoff} onChange={e => setDropoff(e.target.value)} />

          {/* Later — datetime picker */}
          <AnimatePresence>
            {scheduleType === 'later' && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} className="overflow-hidden">
                <input className={inputCls} type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recurring — day picker + time */}
          <AnimatePresence>
            {scheduleType === 'recurring' && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} className="overflow-hidden space-y-3">
                <div>
                  <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest mb-2">Which days?</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS.map(day => (
                      <button key={day} type="button" onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          recurringDays.includes(day)
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <input className={inputCls} type="time" placeholder="Pickup time" value={recurringTime} onChange={e => setRecurringTime(e.target.value)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delivery extra fields */}
          <AnimatePresence>
            {bookingType === 'delivery' && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} className="overflow-hidden space-y-3">

                {/* Category */}
                <div className="relative">
                  <select className={selectCls} value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="">What are you sending?</option>
                    {DELIVERY_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                </div>

                {/* Item description */}
                <textarea className={`${inputCls} resize-none`} rows={2}
                  placeholder="Describe the items e.g. 2 bags rice, cooking oil, bread"
                  value={itemDesc} onChange={e => setItemDesc(e.target.value)} />

                {/* Recipient */}
                <input className={inputCls} placeholder="Recipient name *" value={recName}  onChange={e => setRecName(e.target.value)} />
                <input className={inputCls} type="tel" placeholder="Recipient phone e.g. 0712 111 222" value={recPhone} onChange={e => setRecPhone(e.target.value)} />

                {/* Special instructions */}
                <textarea className={`${inputCls} resize-none`} rows={2}
                  placeholder="Special instructions e.g. Call on arrival · Keep upright · Leave at gate"
                  value={specialInstr} onChange={e => setSpecialInstr(e.target.value)} />

                {/* Pricing note for on-demand */}
                <div className="bg-surface-container-high rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant font-mono">Estimated cost</span>
                  <span className="text-sm font-bold text-primary">~2,000 – 3,000 TSh</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pricing note for rides (non-subscriber hint) */}
          {bookingType === 'ride' && scheduleType === 'now' && (
            <div className="bg-surface-container-high rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-on-surface-variant font-mono">
                {user.role === 'commuter' ? 'From your plan' : 'Estimated fare'}
              </span>
              <span className="text-sm font-bold text-primary font-mono">
                {user.role === 'commuter' ? '1 ride' : '~2,000 – 3,500 TSh'}
              </span>
            </div>
          )}

          {statusMsg && (
            <p className={`text-xs font-mono ${statusMsg.startsWith('Please') ? 'text-red-400' : 'text-primary'}`}>
              {statusMsg}
            </p>
          )}

          <motion.button whileTap={{ scale: 0.98 }} disabled={submitting}
            className="w-full primary-cta py-4 rounded-xl font-bold text-sm">
            {submitting ? 'Sending...'
              : scheduleType === 'now'       ? (bookingType === 'ride' ? 'Request ride' : 'Dispatch delivery')
              : scheduleType === 'later'     ? 'Schedule ride'
              :                               'Set up recurring ride'}
          </motion.button>
        </form>
      </div>

      {/* ── Active rides ── */}
      {!loading && rides.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em] mb-4 px-1">Active</h3>
          {rides.map(ride => (
            <motion.div key={ride.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="section-recession p-5 mb-3">

              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {ride.type === 'delivery'
                    ? <Package size={13} className="text-blue-400" />
                    : <MapPin   size={13} className="text-primary"  />}
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase">
                    {ride.type}
                    {ride.delivery_category ? ` · ${ride.delivery_category}` : ''}
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-bold ${STATUS_COLOR[ride.status] ?? 'text-on-surface-variant'}`}>
                  {STATUS_LABEL[ride.status] ?? ride.status}
                </span>
              </div>

              <p className="font-bold text-sm">{ride.pickup_location} → {ride.dropoff_location}</p>

              {ride.item_description && (
                <p className="text-xs text-on-surface-variant mt-1.5">Items: {ride.item_description}</p>
              )}
              {ride.recipient_name && (
                <p className="text-xs text-on-surface-variant mt-1">To: {ride.recipient_name} · {ride.recipient_phone}</p>
              )}
              {ride.special_instructions && (
                <p className="text-xs text-on-surface-variant mt-1 italic">"{ride.special_instructions}"</p>
              )}

              {ride.status === 'accepted' && ride.driver_name && (
                <div className="mt-3 pt-3 border-t border-outline-variant text-xs text-primary font-mono space-y-0.5">
                  <p>Driver: {ride.driver_name}</p>
                  <p>Plate: {ride.plate} · {ride.vehicle}</p>
                  <p>ETA: {ride.eta}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
