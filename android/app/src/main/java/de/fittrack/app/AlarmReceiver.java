package de.fittrack.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "training";

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            if (context == null || intent == null) {
                return;
            }
            String title = intent.getStringExtra("title");
            String text = intent.getStringExtra("text");
            int reqId = intent.getIntExtra("reqId", 0);
            if (title == null || title.isEmpty()) {
                title = "Zeit fürs Training!";
            }
            if (text == null) {
                text = "Tippe zum Öffnen";
            }

            NotificationManager nm =
                    (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) {
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Training",
                        NotificationManager.IMPORTANCE_HIGH);
                nm.createNotificationChannel(channel);
            }

            Intent openIntent = new Intent(context, MainActivity.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent contentIntent = PendingIntent.getActivity(
                    context, reqId, openIntent, flags);

            Notification.Builder builder;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder = new Notification.Builder(context, CHANNEL_ID);
            } else {
                builder = new Notification.Builder(context);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                    builder.setPriority(Notification.PRIORITY_HIGH);
                }
            }
            builder.setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle(title)
                    .setContentText(text)
                    .setContentIntent(contentIntent)
                    .setAutoCancel(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                nm.notify(reqId, builder.build());
            } else {
                nm.notify(reqId, builder.getNotification());
            }
            // Wöchentliche Reminder: nach Feuer sofort nächsten Termin planen.
            try {
                android.content.SharedPreferences prefs =
                        context.getSharedPreferences("fitx_reminders", Context.MODE_PRIVATE);
                String json = prefs.getString("json", "[]");
                ReminderScheduler.scheduleAll(context, json);
            } catch (Exception ignored) {
            }
        } catch (Exception ignored) {
        }
    }
}
