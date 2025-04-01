import React, { useState, useEffect } from 'react';
import { Bell, Calendar } from 'lucide-react';
import { supabase } from '../supabase';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`bg-gray-50 p-4 rounded-lg ${
                  !notification.read ? 'border-l-4 border-pink-500 bg-white' : ''
                }`}
                onClick={() => !notification.read && markAsRead(notification.id)}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      {notification.type === 'appointment_update' ? (
                        <Calendar className="w-5 h-5 text-pink-600" />
                      ) : (
                        <Bell className="w-5 h-5 text-pink-600" />
                      )}
                      {notification.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>                    
                  </div>
                </div>
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No notifications available
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}