// FitTrack Phase 4 – hooks/useLocalNotifications.ts
// Capacitor LocalNotifications.schedule/cancel + Permission-Request
// + Fallback Web Notification + In-App due-banner + Reschedule nach Reboot.
//
// Verwendung (fittrack/src):
//   const { due, permission, requestPermission, rescheduleAll, cancelAll } =
//     useLocalNotifications(reminders, { onDue: (rem) => setDueReminder(rem) });
//
// Reboot-Hinweis (Android):
//   Capacitor-LocalNotifications überleben einen Reboot NICHT automatisch.
//   -> Bei jedem App-Start rescheduleAll() aufrufen (macht dieser Hook).
//   -> Für echte Boot-Persistenz zusätzlich in android/app/src/main/AndroidManifest.xml:
//        <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
//        <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
//      + ggf. nativer BroadcastReceiver, der die Capacitor-Schedules aus
//      SharedPreferences/Cache neu anlegt. Ohne Receiver = Reschedule on next app open.

import { useCallback, useEffect, useRef, useState } from "react";
import { buildOccurrencesNextDays, type Reminder } from "../lib/reminders";

type DueHandler = (rem: Reminder) => void;

interface Options {
  onDue?: DueHandler;
  daysAhead?: number; // wie viele Tage im Voraus nativ schedulen (Default 7)
  enabled?: boolean;
}

type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

async function tryImportCapacitorLN(): Promise<any | null> {
  try {
    // dynamisch, damit Web-Build ohne Capacitor nicht crasht
    const mod = await import("@capacitor/local-notifications");
    return (mod as any)?.LocalNotifications ?? null;
  } catch {
    return null;
  }
}

function canUseWebNotification(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function showWebNotification(title: string, body: string) {
  try {
    if (!canUseWebNotification()) return false;
    if (Notification.permission !== "granted") return false;
    // tag verhindert Stapel-Dopplungen
    new Notification(title, { body, tag: `fittrack-${Date.now()}` });
    return true;
  } catch {
    return false;
  }
}

// Eindeutige native ID aus Reminder-ID + Occurrence ableiten (int32).
function nativeIdFor(reminderId: string, targetMs: number): number {
  let h = 0;
  const s = `${reminderId}|${targetMs}`;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 2147483647);
}

export function useLocalNotifications(reminders: Reminder[], opts: Options = {}) {
  const { onDue, daysAhead = 7, enabled = true } = opts;
  const [permission, setPermission] = useState<PermissionState>("prompt");
  const [due, setDue] = useState<Reminder | null>(null);
  const onDueRef = useRef<DueHandler | undefined>(onDue);
  onDueRef.current = onDue;
  const scheduledRef = useRef<Set<number>>(new Set());

  const refreshPermission = useCallback(async (): Promise<PermissionState> => {
    // 1) Capacitor versuchen
    const LN = await tryImportCapacitorLN();
    if (LN?.checkPermissions) {
      try {
        const res = await LN.checkPermissions();
        const v = res?.display ?? res?.notifications ?? "prompt";
        const mapped: PermissionState =
          v === "granted" ? "granted" : v === "denied" ? "denied" : "prompt";
        setPermission(mapped);
        if (mapped !== "unsupported") return mapped;
      } catch {
        // fallthrough zu Web
      }
    }
    // 2) Web-Fallback
    if (canUseWebNotification()) {
      setPermission(Notification.permission as PermissionState);
      return Notification.permission as PermissionState;
    }
    setPermission("unsupported");
    return "unsupported";
  }, []);

  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    const LN = await tryImportCapacitorLN();
    if (LN?.requestPermissions) {
      try {
        const res = await LN.requestPermissions();
        const v = res?.display ?? res?.notifications ?? "prompt";
        const mapped: PermissionState =
          v === "granted" ? "granted" : v === "denied" ? "denied" : "prompt";
        setPermission(mapped);
        return mapped;
      } catch {
        // fallthrough
      }
    }
    if (canUseWebNotification()) {
      try {
        const r = await Notification.requestPermission();
        setPermission(r as PermissionState);
        return r as PermissionState;
      } catch {
        setPermission("prompt");
        return "prompt";
      }
    }
    setPermission("unsupported");
    return "unsupported";
  }, []);

  const cancelAll = useCallback(async () => {
    const LN = await tryImportCapacitorLN();
    // Native stornieren
    if (LN?.cancel) {
      try {
        const ids = [...scheduledRef.current].map((id) => ({ id }));
        if (ids.length) await LN.cancel({ notifications: ids });
      } catch {
        // ignorieren – Web-Fallback hat kein cancel
      }
    }
    scheduledRef.current.clear();
  }, []);

  const rescheduleAll = useCallback(async () => {
    if (!enabled) return;
    await cancelAll();
    const list = Array.isArray(reminders) ? reminders.filter((r) => r?.active) : [];
    if (!list.length) return;

    const occurrences = buildOccurrencesNextDays(list, new Date(), daysAhead);
    // Nur zukünftige (+ kleine Karenz 60s wie getNextEvent)
    const now = Date.now();
    const upcoming = occurrences.filter((o) => o.target.getTime() >= now - 60_000);
    if (!upcoming.length) return;

    const LN = await tryImportCapacitorLN();
    const perm = await refreshPermission();

    if (LN?.schedule && perm === "granted") {
      const notifications = upcoming.slice(0, 64).map((o) => ({
        title: "Zeit fürs Training!",
        body: o.reminder.label || "Fitnessstudio",
        id: nativeIdFor(String(o.reminder.id), o.target.getTime()),
        schedule: { at: new Date(o.target.getTime()), allowWhileIdle: true },
        smallIcon: "ic_stat_icon_config_sample",
        extra: { reminderId: String(o.reminder.id), target: o.target.getTime() },
      }));
      try {
        await LN.schedule({ notifications });
        notifications.forEach((n) => scheduledRef.current.add(n.id));
        return;
      } catch {
        // fällt unten auf In-App/Web zurück
      }
    }
    // Kein nativer Pfad -> In-App-Polling + Web Notification übernimmt (siehe Effect unten).
  }, [reminders, daysAhead, enabled, cancelAll, refreshPermission]);

  // Reschedule bei Start + bei Reminder-Änderung (= Reboot-Recovery beim nächsten Öffnen).
  useEffect(() => {
    refreshPermission();
    rescheduleAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleAll]);

  // In-App-Fallback-Polling: feuert onDue + Web Notification im ±60s-Fenster.
  // Nötig für Web und als Backup wenn native Notifications verweigert wurden.
  useEffect(() => {
    if (!enabled) return;
    const fired = new Set<string>(); // session-Key: id|yyyy-mm-dd
    const check = () => {
      const now = new Date();
      const dayKey = now.toDateString();
      (reminders || []).forEach((rem) => {
        if (!rem?.active || !Array.isArray(rem.days)) return;
        // Wochentags-Mapping Mo..So wie fitX.js DAYS[(getDay()+6)%7]
        const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
        const day = DAYS[(now.getDay() + 6) % 7];
        if (!rem.days.includes(day)) return;
        if (typeof rem.time !== "string" || !rem.time.includes(":")) return;
        const [h, m] = rem.time.split(":").map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return;
        const target = new Date(now);
        target.setHours(h, m, 0, 0);
        const diff = Math.abs(target.getTime() - now.getTime());
        const key = `${rem.id}|${dayKey}`;
        if (diff <= 60_000 && !fired.has(key)) {
          fired.add(key);
          setDue(rem);
          onDueRef.current?.(rem);
          showWebNotification("Zeit fürs Training!", rem.label || "Fitnessstudio");
        }
      });
    };
    const iv = setInterval(check, 20_000);
    check();
    const onVis = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reminders, enabled]);

  const dismissDue = useCallback(() => setDue(null), []);

  return { due, dismissDue, permission, requestPermission, rescheduleAll, cancelAll, refreshPermission };
}
