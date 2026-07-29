import { useCallback, useRef, useState } from 'react';
import { playNewOrderAlert } from '../lib/admin/alert-sound';
import {
  isPushEnabled,
  isSoundEnabled,
  requestPushPermission,
  setPushEnabled,
  setSoundEnabled,
  showOrderNotification,
} from '../lib/admin/notify-prefs';
import type { AdminOrder } from '../types/admin-order';

export function useOrderAlerts() {
  const [soundOn, setSoundOn] = useState(true);
  const [pushOn, setPushOn] = useState(true);
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>('default');
  const [latestNewOrder, setLatestNewOrder] = useState<AdminOrder | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const alertsInitializedRef = useRef(false);

  const initAlerts = useCallback(() => {
    setSoundOn(isSoundEnabled());
    setPushOn(isPushEnabled());
    if (typeof Notification !== 'undefined') {
      setPushPermission(Notification.permission);
    }
    knownOrderIdsRef.current = new Set();
    alertsInitializedRef.current = false;
  }, []);

  const handleNewOrdersDetected = useCallback(
    (fetched: AdminOrder[]) => {
      const newPlaced = Array.isArray(fetched)
        ? fetched.filter(
            (o) => o.status === 'placed' && !knownOrderIdsRef.current.has(o.id),
          )
        : [];
      for (const o of fetched) knownOrderIdsRef.current.add(o.id);

      if (!alertsInitializedRef.current) {
        alertsInitializedRef.current = true;
        return;
      }

      for (const order of newPlaced) {
        if (soundOn) playNewOrderAlert();
        showOrderNotification(order, pushOn);
        setLatestNewOrder(order);
      }
    },
    [soundOn, pushOn],
  );

  const enablePush = useCallback(async () => {
    const perm = await requestPushPermission();
    setPushPermission(perm);
    if (perm === 'granted') setPushOn(true);
  }, []);

  const handleSoundToggle = useCallback((on: boolean) => {
    setSoundOn(on);
    setSoundEnabled(on);
  }, []);

  const handlePushToggle = useCallback((on: boolean) => {
    setPushOn(on);
    setPushEnabled(on);
  }, []);

  const testAlertSound = useCallback(() => {
    playNewOrderAlert();
  }, []);

  return {
    soundOn,
    pushOn,
    pushPermission,
    latestNewOrder,
    setLatestNewOrder,
    initAlerts,
    handleNewOrdersDetected,
    enablePush,
    handleSoundToggle,
    handlePushToggle,
    testAlertSound,
  };
}
