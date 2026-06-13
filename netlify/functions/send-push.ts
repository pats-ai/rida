// netlify/functions/send-push.ts
// Call this from Supabase webhook when ride events happen

import { createClient } from '@supabase/supabase-js';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Init Firebase Admin (once)
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)),
  });
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Notification templates
const TEMPLATES: Record<string, (d: any) => { title: string; body: string }> = {
  new_ride_request:           (d) => ({ title: '🏍️ New ride request',    body: `${d.pickup} → ${d.dropoff}` }),
  ride_accepted_confirmation: (d) => ({ title: '✅ Ride confirmed',        body: `Ride with ${d.commuter_name} confirmed` }),
  customer_message:           (d) => ({ title: `💬 ${d.commuter_name}`,   body: d.message }),
  driver_accepted:            (d) => ({ title: '🏍️ Driver on the way',   body: `${d.driver_name} accepted · ${d.eta ?? 'coming soon'}` }),
  driver_nearby:              (d) => ({ title: '📍 Driver is nearby',     body: `${d.driver_name} is 2 min away` }),
  ride_completed:             (d) => ({ title: '✅ Ride complete',         body: `Arrived at ${d.dropoff} · ${d.amount} TSh` }),
  delivery_update:            (d) => ({ title: '📦 Delivery update',      body: d.message }),
};

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  if (event.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const { event_type, user_id, data } = JSON.parse(event.body);

    const template = TEMPLATES[event_type];
    if (!template) return { statusCode: 400, body: `Unknown event: ${event_type}` };

    const { title, body } = template(data);

    const { data: row, error } = await supabase
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('user_id', user_id)
      .single();

    if (error || !row?.fcm_token) return { statusCode: 404, body: 'No token found' };

    await getMessaging().send({
      token: row.fcm_token,
      notification: { title, body },
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
        },
      },
    });

    return { statusCode: 200, body: JSON.stringify({ sent: true }) };
  } catch (err: any) {
    console.error('send-push error:', err);
    return { statusCode: 500, body: err.message };
  }
};
