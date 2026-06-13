import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { requestNotificationPermission, onForegroundMessage } from './firebase.ts';

export type NotifStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported';

export function useFCM(userId: string | null) {
  const [status, setStatus] = useState<NotifStatus>('idle');

  // Check existing permission on load
  useEffect(() => {
    if (!('Notification' in window)) { setStatus('unsupported'); return; }
    if (Notification.permission === 'granted') setStatus('granted');
    if (Notification.permission === 'denied')  setStatus('denied');
  }, []);

  // Listen for foreground messages (app is open)
  useEffect(() => {
    const unsub = onForegroundMessage((payload) => {
      const { title, body } = payload.notification ?? {};
      if (title) {
        // Show as a native notification even when app is open
        new Notification(title, {
          body,
          icon: '/icon-192.png',
        });
      }
    });
    return unsub;
  }, []);

  const enable = async () => {
    if (!userId) return;
    setStatus('loading');

    const token = await requestNotificationPermission();

    if (!token) {
      setStatus(Notification.permission === 'denied' ? 'denied' : 'idle');
      return;
    }

    // Save FCM token to Supabase so server can send to this device
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        fcm_token: token,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) { console.error('Token save error:', error); }
    setStatus('granted');
  };

  const disable = async () => {
    if (!userId) return;
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    setStatus('idle');
  };

  return { status, enable, disable };
}
