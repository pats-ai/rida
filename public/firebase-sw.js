// public/firebase-sw.js
// Handles push notifications when the app is closed or in background

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDmXg8TtDyqk5AzOq3NZiY6oiaB4NNRELo",
  authDomain: "freerida-4e874.firebaseapp.com",
  projectId: "freerida-4e874",
  storageBucket: "freerida-4e874.firebasestorage.app",
  messagingSenderId: "550927319039",
  appId: "1:550927319039:web:9d99591800c2e1185bf1ca"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification;

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: payload.data?.url || '/' },
  });
});

// Open app when notification is tapped
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const existing = clientList.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
