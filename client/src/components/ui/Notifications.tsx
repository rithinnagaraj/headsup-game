'use client';

import { useGameStore, selectNotifications } from '@/store/gameStore';
import { cn } from '@/lib/utils';

export function Notifications() {
  const notifications = useGameStore(selectNotifications);
  const removeNotification = useGameStore((s) => s.removeNotification);
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            'px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 animate-in slide-in-from-right',
            {
              'bg-green-500/90 text-white': notification.type === 'success',
              'bg-red-500/90 text-white': notification.type === 'error',
              'bg-blue-500/90 text-white': notification.type === 'info',
              'bg-yellow-500/90 text-black': notification.type === 'warning',
            }
          )}
        >
          <span className="text-lg">
            {notification.type === 'success' && '✓'}
            {notification.type === 'error' && '✕'}
            {notification.type === 'info' && 'ℹ'}
            {notification.type === 'warning' && '⚠'}
          </span>
          <p className="flex-1 text-sm">{notification.message}</p>
          <button
            onClick={() => removeNotification(notification.id)}
            className="opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
