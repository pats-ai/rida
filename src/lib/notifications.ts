import { supabase } from './supabase';

// Call this anywhere in the app to notify a user — inserts into the
// notifications table (shows in their bell) AND triggers a push to their phone
export async function sendNotification(userId: string, title: string, body: string, type: string = 'general') {
  await supabase.from('notifications').insert({ user_id: userId, title, body, type });

  try {
    await fetch('/.netlify/functions/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, title, body }),
    });
  } catch (err) {
    console.error('Push trigger failed:', err);
  }
}
