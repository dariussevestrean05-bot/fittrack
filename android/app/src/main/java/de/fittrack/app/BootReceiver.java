package de.fittrack.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

public class BootReceiver extends BroadcastReceiver {
    private static final String PREFS_NAME = "fitx_reminders";
    private static final String KEY_JSON = "json";

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            if (context == null || intent == null) {
                return;
            }
            String action = intent.getAction();
            if (!(Intent.ACTION_BOOT_COMPLETED.equals(action)
                    || "android.intent.action.LOCKED_BOOT_COMPLETED".equals(action)
                    || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                    || Intent.ACTION_TIME_CHANGED.equals(action)
                    || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                    || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action))) {
                return;
            }
            SharedPreferences prefs =
                    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String json = prefs.getString(KEY_JSON, "[]");
            ReminderScheduler.rescheduleAll(context, json);
        } catch (Exception ignored) {
        }
    }
}
