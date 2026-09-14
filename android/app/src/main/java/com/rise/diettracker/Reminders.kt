package com.rise.diettracker

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.util.Calendar
import java.util.Locale

/**
 * Meal reminders for the Android shell (passes 55–56).
 *
 * One alarm at a time: the next block time. When it fires, ReminderReceiver
 * shows the block if it isn't logged, then books the one after. Every storage
 * write in the page re-sends the snapshot (see the native section of
 * src/js/core/reminders.js), which reschedules and carries each block's
 * logged state — so a block ticked, skipped or un-ticked before its time is
 * handled when the alarm fires, with no separate bridge call per action.
 *
 * Alarms don't survive a reboot, a clock or timezone change, or an app
 * update; BootReceiver books the next one again after each.
 */
object Reminders {
    private const val PREFS = "rise-reminders"
    private const val KEY_ON = "on"
    private const val KEY_SNAPSHOT = "snapshot"
    private const val CHANNEL = "meal-reminders"
    const val ACTION_FIRE = "com.rise.diettracker.REMINDER"
    const val EXTRA_DATE = "date"
    const val EXTRA_TIME = "time"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun isOn(context: Context) = prefs(context).getBoolean(KEY_ON, false)

    /**
     * Whether Android will actually show them: the Android 13+ runtime
     * permission, and the app-level notification switch in system settings.
     */
    fun notificationsAllowed(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return false
        return NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    /** `{ reminders, blocked }` for the page's Settings group. */
    fun settingsJson(context: Context): String = JSONObject()
        .put("reminders", isOn(context))
        .put("blocked", !notificationsAllowed(context))
        .toString()

    fun setOn(context: Context, on: Boolean) {
        prefs(context).edit().putBoolean(KEY_ON, on).apply()
        schedule(context)
    }

    fun saveSnapshot(context: Context, json: String) {
        prefs(context).edit().putString(KEY_SNAPSHOT, json).apply()
        schedule(context)
    }

    private fun loadSnapshot(context: Context): Snapshot? {
        val text = prefs(context).getString(KEY_SNAPSHOT, null) ?: return null
        return try {
            val obj = JSONObject(text)
            Snapshot(
                date = obj.getString("date"),
                today = obj.optJSONObject("today")?.let(::parseBlocks),
                fresh = parseBlocks(obj.getJSONObject("fresh")),
            )
        } catch (e: Exception) {
            null
        }
    }

    private fun parseBlocks(obj: JSONObject): Map<String, Block> =
        obj.keys().asSequence().associateWith { id ->
            val b = obj.getJSONObject(id)
            Block(b.getString("name"), b.getString("time"), b.getDouble("kcal"), b.getDouble("proteinG"), b.optBoolean("done"))
        }

    private fun isoDate(cal: Calendar) =
        String.format(Locale.ROOT, "%04d-%02d-%02d", cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))

    /** The wall-clock moment of [due] in the device's current timezone. */
    private fun millisOf(due: Due): Long? {
        val parts = due.date.split("-").mapNotNull { it.toIntOrNull() }
        if (parts.size != 3) return null
        val (y, mo, d) = parts
        val minutes = ReminderPlan.minutesOf(due.time) ?: return null
        return Calendar.getInstance().apply {
            clear()
            set(y, mo - 1, d, minutes / 60, minutes % 60)
        }.timeInMillis
    }

    private fun alarmIntent(context: Context, due: Due?): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java).setAction(ACTION_FIRE)
        if (due != null) intent.putExtra(EXTRA_DATE, due.date).putExtra(EXTRA_TIME, due.time)
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    /**
     * Book the next block time, replacing whatever was booked, or cancel when
     * reminders are off. [after] lets the receiver schedule past the alarm
     * that just fired even if it ran a moment early.
     */
    fun schedule(context: Context, after: Due? = null) {
        val alarms = context.getSystemService(AlarmManager::class.java) ?: return
        val snap = loadSnapshot(context)
        if (!isOn(context) || snap == null) {
            alarms.cancel(alarmIntent(context, null))
            return
        }

        val now = Calendar.getInstance()
        val today = isoDate(now)
        val tomorrow = isoDate((now.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, 1) })
        var afterMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
        if (after != null && after.date == today) {
            afterMinutes = maxOf(afterMinutes, ReminderPlan.minutesOf(after.time) ?: afterMinutes)
        }

        val due = ReminderPlan.next(snap, today, tomorrow, afterMinutes) ?: return
        val at = millisOf(due) ?: return
        val pending = alarmIntent(context, due)
        // Exact where the user or OS allows it (Android 12–13 grant it by
        // default; 14+ asks). Otherwise allow-while-idle, which Doze may push
        // back a few minutes — fine for a meal.
        if (Build.VERSION.SDK_INT >= 31 && !alarms.canScheduleExactAlarms()) {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
        } else {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
        }
    }

    /** An alarm fired: show its block if it's still owed, then book the next. */
    fun fire(context: Context, intent: Intent) {
        val date = intent.getStringExtra(EXTRA_DATE)
        val time = intent.getStringExtra(EXTRA_TIME)
        val snap = loadSnapshot(context)
        if (date != null && time != null && snap != null && isOn(context)) {
            val due = Due(date, time)
            val late = millisOf(due)?.let { (System.currentTimeMillis() - it) / 60_000 } ?: Long.MAX_VALUE
            ReminderPlan.blockToShow(snap, due, late)?.let { show(context, it) }
            schedule(context, after = due)
        } else {
            schedule(context)
        }
    }

    private fun show(context: Context, block: Block) {
        if (!notificationsAllowed(context)) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL, "Meal reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "A reminder at each meal time."
                },
            )
        }
        val open = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(ReminderPlan.title(block))
            .setContentText(ReminderPlan.body(block))
            .setContentIntent(open)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .build()
        // One id per block time, so a late lunch doesn't replace an unread shake.
        manager.notify(block.time.hashCode(), notification)
    }
}
