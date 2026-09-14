package com.rise.diettracker

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ReminderPlanTest {
    private fun block(name: String, time: String, done: Boolean = false) =
        Block(name, time, 580.0, 33.0, done)

    private val snap = Snapshot(
        date = "2026-09-14",
        today = mapOf(
            "B1" to block("Breakfast", "08:00", done = true),
            "B3" to block("Lunch", "13:30"),
            "B4" to block("Dinner", "19:30"),
        ),
        fresh = mapOf(
            "B1" to block("Breakfast", "08:00"),
            "B3" to block("Lunch", "13:30"),
        ),
    )

    @Test
    fun nextIsTheFirstTimeAfterNow() {
        assertEquals(Due("2026-09-14", "13:30"), ReminderPlan.next(snap, "2026-09-14", "2026-09-15", 12 * 60))
    }

    @Test
    fun aBlockAtExactlyNowIsNotRescheduled() {
        assertEquals(Due("2026-09-14", "19:30"), ReminderPlan.next(snap, "2026-09-14", "2026-09-15", 13 * 60 + 30))
    }

    @Test
    fun afterTheLastBlockItRollsToTomorrowsFreshDay() {
        assertEquals(Due("2026-09-15", "08:00"), ReminderPlan.next(snap, "2026-09-14", "2026-09-15", 20 * 60))
    }

    @Test
    fun loggedBlocksStaySilent() {
        assertNull(ReminderPlan.blockToShow(snap, Due("2026-09-14", "08:00"), 0))
        assertEquals("Lunch", ReminderPlan.blockToShow(snap, Due("2026-09-14", "13:30"), 0)?.name)
    }

    @Test
    fun aNewDateUsesTheFreshDay() {
        assertEquals("Breakfast", ReminderPlan.blockToShow(snap, Due("2026-09-15", "08:00"), 0)?.name)
    }

    @Test
    fun tooLateIsSilent() {
        assertEquals("Lunch", ReminderPlan.blockToShow(snap, Due("2026-09-14", "13:30"), 60)?.name)
        assertNull(ReminderPlan.blockToShow(snap, Due("2026-09-14", "13:30"), 61))
    }

    @Test
    fun copyMatchesTheWeb() {
        val lunch = block("Lunch", "13:30")
        assertEquals("Lunch · 13:30", ReminderPlan.title(lunch))
        assertEquals("580 kcal · 33 g protein", ReminderPlan.body(lunch))
    }
}
