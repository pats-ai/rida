import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyDmXg8TtDyqk5AzOq3NZiY6oiaB4NNRELo",
  authDomain: "freerida-4e874.firebaseapp.com",
  projectId: "freerida-4e874",
  storageBucket: "freerida-4e874.firebasestorage.app",
  messagingSenderId: "550927319039",
  appId: "1:550927319039:web:9d99591800c2e1185bf1ca"
};

const VAPID_KEY = 'BC8dadIVzT_2kZxruk_GDbOG3op_xGEtVt7xLE4vrPCJz9ZL2S3zyhiCn-Sm3XD8-OsUcI82MDPtZJhtRPZyUqs';

export const firebaseApp = initializeApp(firebaseConfig);

export async function requestNotificationPermission(): Promise<string | null> {
  try {
    console.log('FCM: checking support...');
    if (!('serviceWorker' in navigator)) { console.log('FCM: no service worker support'); return null; }
    if (!('PushManager' in window))      { console.log('FCM: no PushManager support');   return null; }

    console.log('FCM: requesting permission...');
    const permission = await Notification.requestPermission();
    console.log('FCM: permission =', permission);
    if (permission !== 'granted') return null;

    console.log('FCM: registering service worker...');
    const reg = await navigator.serviceWorker.register('/firebase-sw.js');
    console.log('FCM: sw registered =', reg);

    console.log('FCM: getting token...');
    const { getMessaging, getToken } = await import('firebase/messaging');
    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    console.log('FCM: token =', token ? token.slice(0, 20) + '...' : 'null');
    return token;
  } catch (err) {
    console.error('FCM error:', err);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  try {
    if (!('serviceWorker' in navigator)) return () => {};
    import('firebase/messaging').then(({ getMessaging, onMessage }) => {
      onMessage(getMessaging(firebaseApp), callback);
    });
  } catch (err) {
    console.error('FCM foreground error:', err);
  }
  return () => {};
}
