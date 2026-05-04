import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const NotificationService = {
  /**
   * Request permissions for notifications.
   * Returns true if granted, false otherwise.
   */
  requestPermissionsAsync: async (): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10b981',
      });
    }

    return finalStatus === 'granted';
  },

  /**
   * Get the current permission status.
   */
  getPermissionStatusAsync: async (): Promise<Notifications.PermissionStatus> => {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  },

  /**
   * Schedule a local notification to be shown immediately.
   */
  sendLocalNotificationAsync: async (title: string, body: string, data?: any) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { url: '/settings/notifications', ...(data || {}) },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#10b981',
        channelId: 'default',
      },
      trigger: null, // null means show immediately
    });
  },

  /**
   * Schedule a daily recurring notification at a specific time.
   */
  scheduleDailyNotificationAsync: async (identifier: string, title: string, body: string, hour: number, minute: number) => {
    // Cancel existing one first to avoid duplicates
    await Notifications.cancelScheduledNotificationAsync(identifier);

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        data: { url: '/settings/notifications' },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#10b981',
        channelId: 'default',
      },
      trigger: {
        type: 'calendar',
        hour,
        minute,
        repeats: true,
      } as any,
    });
  },

  /**
   * Cancel all scheduled notifications.
   */
  cancelAllNotificationsAsync: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  /**
   * Cancel a specific notification.
   */
  cancelNotificationAsync: async (identifier: string) => {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }
};
