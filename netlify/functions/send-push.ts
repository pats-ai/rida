import { createClient } from '@supabase/supabase-js';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)),
  });
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { user_id, title, body } = JSON.parse(event.body);
    if (!user_id || !title) {
      return { statusCode: 400, body: 'Missing user_id or title' };
    }

    const { data: row } = await supabase
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('user_id', user_id)
      .single();

    if (!row?.fcm_token) {
      return { statusCode: 200, body: JSON.stringify({ sent: false, reason: 'no_token' }) };
    }

    await getMessaging().send({
      token: row.fcm_token,
      notification: { title, body },
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        },
      },
    });

    return { statusCode: 200, body: JSON.stringify({ sent: true }) };
  } catch (err: any) {
    console.error('send-push error:', err);
    return { statusCode: 500, body: err.message };
  }
};
