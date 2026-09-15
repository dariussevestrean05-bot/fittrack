package de.fittrack.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

public class ReminderScheduler {
    private static final String PREFS_NAME = "fitx_reminders";
    private static final String KEY_SCHEDULED = "scheduled_req_codes";
    private static final String TAG = "FitTrack";

    public static void scheduleAll(Context context, String json) {
        try {
            if (context == null) {
                return;
            }
            AlarmManager am =
                    (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) {
                return;
            }

            // 1) Zuerst alle eigenen Alarme canceln.
            //    Derselbe PendingIntent-Typ wie beim Schedulen (expliziter
            //    Broadcast an AlarmReceiver, FLAG_IMMUTABLE|FLAG_UPDATE_CURRENT).
            cancelPrevious(context, am);
            if (json == null || json.trim().isEmpty()) {
                persistScheduledCodes(context, new HashSet<Integer>());
                return;
            }

            JSONArray arr;
            try {
                arr = new JSONArray(json);
            } catch (Exception e) {
                Log.w(TAG, "syncReminders: ungültiges JSON, überspringe", e);
                persistScheduledCodes(context, new HashSet<Integer>());
                return;
            }

            Set<Integer> scheduled = new HashSet<Integer>();
            for (int i = 0; i < arr.length(); i++) {
                try {
                    JSONObject o = arr.optJSONObject(i);
                    if (o == null) {
                        continue;
                    }
                    String id = o.optString("id", null);
                    if (id == null || id.isEmpty()) {
                        continue;
                    }
                    String label = o.optString("label", null);
                    String time = o.optString("time", null);
                    if (time == null || !time.matches("\\d{1,2}:\\d{2}")) {
                        continue;
                    }
                    String[] hm = time.split(":");
                    int hour;
                    int minute;
                    try {
                        hour = Integer.parseInt(hm[0]);
                        minute = Integer.parseInt(hm[1]);
                    } catch (NumberFormatException nfe) {
                        continue;
                    }
                    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
                        continue;
                    }
                    JSONArray daysJson = o.optJSONArray("days");
                    if (daysJson == null || daysJson.length() == 0) {
                        continue;
                    }
                    Set<Integer> days = new HashSet<Integer>();
                    for (int d = 0; d < daysJson.length(); d++) {
                        String day = daysJson.optString(d, null);
                        Integer calDay = mapGermanDay(day);
                        if (calDay != null) {
                            days.add(calDay);
                        }
                    }
                    if (days.isEmpty()) {
                        continue;
                    }

                    long triggerAt = nextTriggerMillis(days, hour, minute);
                    if (triggerAt <= 0) {
                        continue;
                    }

                    String title = (label == null || label.isEmpty())
                            ? "Zeit fürs Training!"
                            : label;
                    int reqId = id.hashCode();
                    int requestCode = toRequestCode(id);

                    // Alten PendingIntent mit gleichem Typ sicher canceln (kein Stacking).
                    try {
                        PendingIntent old = buildPendingIntent(
                                context, requestCode, title, "Tippe zum Öffnen", reqId);
                        if (old != null) {
                            am.cancel(old);
                            old.cancel();
                        }
                    } catch (Exception ignored) {
                    }

                    Intent alarmIntent = new Intent(context, AlarmReceiver.class);
                    alarmIntent.putExtra("title", title);
                    alarmIntent.putExtra("text", "Tippe zum Öffnen");
                    alarmIntent.putExtra("reqId", reqId);
                    PendingIntent pi = PendingIntent.getBroadcast(
                            context, requestCode, alarmIntent, pendingFlags());

                    try {
                        boolean exactAllowed = true;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                            try {
                                exactAllowed = am.canScheduleExactAlarms();
                            } catch (Exception ignored) {
                                exactAllowed = false;
                            }
                        }
                        if (exactAllowed) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                am.setExactAndAllowWhileIdle(
                                        AlarmManager.RTC_WAKEUP, triggerAt, pi);
                            } else {
                                am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                            }
                        } else {
                            // Fallback: inexact, damit Reminder trotzdem kommt.
                            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                        }
                        scheduled.add(requestCode);
                    } catch (SecurityException se) {
                        Log.w(TAG, "Exakter Alarm verweigert (Permission fehlt?)", se);
                        try {
                            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                            scheduled.add(requestCode);
                        } catch (Exception ignored) {
                            try {
                                pi.cancel();
                            } catch (Exception ignored2) {
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Kaputten Reminder übersprungen", e);
                }
            }
            persistScheduledCodes(context, scheduled);
        } catch (Exception e) {
            Log.w(TAG, "scheduleAll fehlgeschlagen", e);
        }
    }

    public static void rescheduleAll(Context context, String json) {
        scheduleAll(context, json);
    }

    private static int pendingFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return flags;
    }

    private static PendingIntent buildPendingIntent(
            Context context, int requestCode, String title, String text, int reqId) {
        try {
            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.putExtra("title", title);
            intent.putExtra("text", text);
            intent.putExtra("reqId", reqId);
            return PendingIntent.getBroadcast(context, requestCode, intent, pendingFlags());
        } catch (Exception e) {
            return null;
        }
    }

    private static void cancelPrevious(Context context, AlarmManager am) {
        try {
            SharedPreferences prefs =
                    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String stored = prefs.getString(KEY_SCHEDULED, "");
            if (stored == null || stored.isEmpty()) {
                return;
            }
            String[] parts = stored.split(",");
            for (String p : parts) {
                try {
                    String t = p.trim();
                    if (t.isEmpty()) {
                        continue;
                    }
                    int rc = Integer.parseInt(t);
                    Intent intent = new Intent(context, AlarmReceiver.class);
                    PendingIntent pi = PendingIntent.getBroadcast(
                            context, rc, intent, pendingFlags());
                    try {
                        am.cancel(pi);
                    } catch (Exception ignored) {
                    }
                    try {
                        pi.cancel();
                    } catch (Exception ignored) {
                    }
                } catch (Exception ignored) {
                }
            }
        } catch (Exception ignored) {
        }
    }

    private static void persistScheduledCodes(Context context, Set<Integer> codes) {
        try {
            StringBuilder sb = new StringBuilder();
            boolean first = true;
            for (Integer c : codes) {
                if (c == null) {
                    continue;
                }
                if (!first) {
                    sb.append(",");
                }
                sb.append(c.intValue());
                first = false;
            }
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .putString(KEY_SCHEDULED, sb.toString())
                    .apply();
        } catch (Exception ignored) {
        }
    }

    private static int toRequestCode(String id) {
        int h = id.hashCode();
        if (h == Integer.MIN_VALUE) {
            return 0;
        }
        return Math.abs(h);
    }

    private static Integer mapGermanDay(String day) {
        if (day == null) {
            return null;
        }
        String d = day.trim();
        if (d.equals("Mo")) {
            return Calendar.MONDAY;
        } else if (d.equals("Di")) {
            return Calendar.TUESDAY;
        } else if (d.equals("Mi")) {
            return Calendar.WEDNESDAY;
        } else if (d.equals("Do")) {
            return Calendar.THURSDAY;
        } else if (d.equals("Fr")) {
            return Calendar.FRIDAY;
        } else if (d.equals("Sa")) {
            return Calendar.SATURDAY;
        } else if (d.equals("So")) {
            return Calendar.SUNDAY;
        }
        return null;
    }

    private static long nextTriggerMillis(Set<Integer> days, int hour, int minute) {
        try {
            long now = System.currentTimeMillis();
            Calendar base = Calendar.getInstance();
            // Offset 0..7: heute (falls Zeit noch in Zukunft) bis gleiche Wochentag +7 Tage.
            for (int offset = 0; offset <= 7; offset++) {
                Calendar c = (Calendar) base.clone();
                c.add(Calendar.DAY_OF_YEAR, offset);
                c.set(Calendar.HOUR_OF_DAY, hour);
                c.set(Calendar.MINUTE, minute);
                c.set(Calendar.SECOND, 0);
                c.set(Calendar.MILLISECOND, 0);
                if (!days.contains(c.get(Calendar.DAY_OF_WEEK))) {
                    continue;
                }
                if (c.getTimeInMillis() <= now) {
                    continue;
                }
                return c.getTimeInMillis();
            }
        } catch (Exception ignored) {
        }
        return 0;
    }
}
