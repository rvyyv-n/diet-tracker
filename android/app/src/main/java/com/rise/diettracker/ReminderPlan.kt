package com.rise.diettracker

/**
 * The reminder schedule as plain data — no Android types, so the unit tests
 * run on the JVM (app/src/test).
 *
 * The page hands the shell the same snapshot it gives the web service worker
 * and the Windows shell (buildSnapshot() in src/js/core/reminders.js): today's
 * blocks, plus `fresh` — what a new day would look like — for a date the app
 * hasn't been opened on yet.
 */
data class Block(
    val name: String,
    val time: String,
    val kcal: Double,
    val proteinG: Double,
    val done: Boolean,
)

data class Snapshot(
    val date: String,
    val today: Map<String, Block>?,
    val fresh: Map<String, Block>,
)

/** One alarm: a block time on a date, "2026-09-14" + "13:30". */
data class Due(val date: String, val time: String)

object ReminderPlan {
    /** How late a reminder may still be shown. Matches the web and desktop. */
    const val GRACE_MINUTES = 60

    /** The stored day if the snapshot is for [date], else a fresh one — as sw.js does. */
    fun blocksFor(snap: Snapshot, date: String): Map<String, Block> =
        if (snap.date == date && snap.today != null) snap.today else snap.fresh

    fun minutesOf(time: String): Int? {
        val parts = time.split(":")
        if (parts.size != 2) return null
        val h = parts[0].toIntOrNull() ?: return null
        val m = parts[1].toIntOrNull() ?: return null
        return h * 60 + m
    }

    /**
     * The next block time strictly after [afterMinutes] on [today], or the
     * first one on [tomorrow]. Logged blocks are still scheduled: a block can
     * be un-ticked before its time, and the receiver checks `done` when the
     * alarm fires anyway.
     */
    fun next(snap: Snapshot, today: String, tomorrow: String, afterMinutes: Int): Due? {
        val later = blocksFor(snap, today).values
            .mapNotNull { b -> minutesOf(b.time)?.let { it to b } }
            .filter { (m, _) -> m > afterMinutes }
            .minByOrNull { (m, _) -> m }
        if (later != null) return Due(today, later.second.time)
        val first = blocksFor(snap, tomorrow).values
            .mapNotNull { b -> minutesOf(b.time)?.let { it to b } }
            .minByOrNull { (m, _) -> m }
        return first?.let { Due(tomorrow, it.second.time) }
    }

    /**
     * What an alarm for [due] should say, or null for silence: the block is
     * already logged, no longer on the plan at that time, or the alarm is more
     * than [GRACE_MINUTES] late (a phone that was off over lunch).
     */
    fun blockToShow(snap: Snapshot, due: Due, lateMinutes: Long): Block? {
        if (lateMinutes > GRACE_MINUTES) return null
        return blocksFor(snap, due.date).values.firstOrNull { it.time == due.time && !it.done }
    }

    /** Whole numbers without a trailing ".0" — every plan value is one. */
    fun num(n: Double): String = if (n % 1.0 == 0.0) n.toLong().toString() else String.format(java.util.Locale.ROOT, "%.1f", n)

    fun title(block: Block) = "${block.name} · ${block.time}"

    fun body(block: Block) = "${num(block.kcal)} kcal · ${num(block.proteinG)} g protein"
}
