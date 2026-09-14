package com.rise.diettracker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** The booked alarm firing. Not exported: only our own PendingIntent reaches it. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Reminders.ACTION_FIRE) Reminders.fire(context, intent)
    }
}

/**
 * Books the next alarm again after the system drops it: a reboot, an app
 * update, or the clock or timezone changing under it. Exported so the
 * system broadcasts arrive; all it can do is reschedule, which is harmless
 * to trigger.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Reminders.schedule(context)
    }
}
