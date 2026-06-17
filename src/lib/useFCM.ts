import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { requestNotificationPermission, onForegroundMessage } from './firebase';

export type NotifStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported';

export function useFCM(userId: string | null) {
  const [status, setStatus] = useState<NotifStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!('Notification' in window)) { setStatus('unsupported'); return; }
    if (Notification.permission === 'granted') setStatus('granted');
    if (Notification.permission === 'denied')  setStatus('denied');
  }, []);

  useEffect(() => {
    const unsub = onForegroundMessage((payload) => {
      const { title, body } = payload.notification ?? {};
      if (title) new Notification(title, { body, icon: '/icon-192.png' });
    });
    return unsub;
  }, []);

  const enable = async () => {
    if (!userId) return;
    setStatus('loading');
    setErrorMsg('');

    const token = await requestNotificationPermission();

    if (!token) {
      const msg = `Permission: ${Notification.permission} · SW: ${'serviceWorker' in navigator} · Push: ${'PushManager' in window}`;
      setErrorMsg(msg);
      setStatus('idle');
      return;
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ user_id: userId, fcm_token: token, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (error) {
      setErrorMsg('DB error: ' + error.message);
      setStatus('idle');
      return;
    }

    setStatus('granted');
  };

  const disable = async () => {
    if (!userId) return;
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    setStatus('idle');
  };

  return { status, enable, disable, errorMsg };
}
