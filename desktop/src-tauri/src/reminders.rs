// Meal reminders for the desktop shell (pass 54).
//
// The clock lives here, not in the page. WebView2 throttles timers in a hidden
// window, and a login start may never show the window at all, so a thread in
// this process decides when a block is due and raises the toast itself.
//
// What it knows about the plan is the same snapshot the web build mirrors into
// IndexedDB for its service worker (buildSnapshot() in
// src/js/core/reminders.js): today's blocks with name, time, kcal, protein and
// whether they're ticked, plus a `fresh` copy for a date the app hasn't seen
// yet. The page pushes it here after every storage write, and it's kept on
// disk so a login start can remind before the page has finished loading.

use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use chrono::{Local, NaiveDate, NaiveDateTime, NaiveTime, TimeDelta};
use serde::{Deserialize, Serialize};
use tauri::menu::MenuItem;
use tauri::{AppHandle, Manager, Wry};

/// How often the clock is checked.
const TICK: Duration = Duration::from_secs(20);

/// How late a reminder may still be shown — after the PC wakes from sleep,
/// say. Matches the hour either side the service worker allows.
const GRACE_MINUTES: i64 = 60;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Block {
    pub name: String,
    pub time: String,
    pub kcal: f64,
    pub protein_g: f64,
    pub done: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Snapshot {
    pub date: String,
    pub today: Option<HashMap<String, Block>>,
    pub fresh: HashMap<String, Block>,
}

/// Everything the shell remembers between runs. Device settings, not diet
/// data — none of it goes in a backup.
#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Stored {
    pub reminders: bool,
    pub tray: bool,
    pub tray_hint_shown: bool,
    pub snapshot: Option<Snapshot>,
}

pub struct Desktop {
    stored: Mutex<Stored>,
    path: Option<PathBuf>,
    /// The tray menu's "Next: Lunch · 13:30" line, and the text it last had.
    next_item: Mutex<Option<(MenuItem<Wry>, String)>>,
}

impl Desktop {
    pub fn load(app: &AppHandle) -> Self {
        let path = app.path().app_config_dir().ok().map(|dir| dir.join("desktop.json"));
        let stored = path
            .as_ref()
            .and_then(|p| fs::read_to_string(p).ok())
            .and_then(|text| serde_json::from_str(&text).ok())
            .unwrap_or_default();
        Self { stored: Mutex::new(stored), path, next_item: Mutex::new(None) }
    }

    pub fn get(&self) -> Stored {
        self.stored.lock().unwrap().clone()
    }

    /// Change the stored state, write it to disk, and return the new copy.
    pub fn update(&self, change: impl FnOnce(&mut Stored)) -> Stored {
        let mut stored = self.stored.lock().unwrap();
        change(&mut stored);
        if let Some(path) = &self.path {
            if let Some(dir) = path.parent() {
                let _ = fs::create_dir_all(dir);
            }
            if let Ok(text) = serde_json::to_string(&*stored) {
                let _ = fs::write(path, text);
            }
        }
        stored.clone()
    }

    pub fn set_next_item(&self, item: MenuItem<Wry>, text: String) {
        *self.next_item.lock().unwrap() = Some((item, text));
    }
}

/// The blocks for a date: the stored day if the snapshot is for that date,
/// otherwise what a new day would look like — the same choice sw.js makes.
fn blocks_for<'a>(snap: &'a Snapshot, date: NaiveDate) -> &'a HashMap<String, Block> {
    match &snap.today {
        Some(today) if snap.date == date.format("%Y-%m-%d").to_string() => today,
        _ => &snap.fresh,
    }
}

fn block_time(block: &Block) -> Option<NaiveTime> {
    NaiveTime::parse_from_str(&block.time, "%H:%M").ok()
}

/// Whole numbers without a trailing ".0" — every plan value is one.
fn num(n: f64) -> String {
    if n.fract() == 0.0 {
        format!("{n:.0}")
    } else {
        format!("{n:.1}")
    }
}

/// The tray's status line.
pub fn next_label(stored: &Stored, now: NaiveDateTime) -> String {
    if !stored.reminders {
        return "Meal reminders are off".into();
    }
    let Some(snap) = &stored.snapshot else {
        return "No meal reminders yet".into();
    };
    blocks_for(snap, now.date())
        .values()
        .filter(|b| !b.done)
        .filter_map(|b| block_time(b).map(|t| (t, b)))
        .filter(|(t, _)| *t > now.time())
        .min_by_key(|(t, _)| *t)
        .map(|(_, b)| format!("Next: {} · {}", b.name, b.time))
        .unwrap_or_else(|| "No more reminders today".into())
}

/// Bring the tray's status line up to date, touching the menu only when the
/// text actually changed.
///
/// The lock is released before `set_text`: from the clock thread that call
/// waits on the main thread, and the main thread takes this same lock when a
/// command calls in here. Holding it across the call can hang the app.
pub fn refresh_tray(app: &AppHandle) {
    let desktop = app.state::<Desktop>();
    let label = next_label(&desktop.get(), Local::now().naive_local());
    let item = {
        let mut slot = desktop.next_item.lock().unwrap();
        match slot.as_mut() {
            Some((item, shown)) if *shown != label => {
                *shown = label.clone();
                item.clone()
            }
            _ => return,
        }
    };
    let _ = item.set_text(&label);
}

/// Blocks that came due in (last, now], not yet logged, and not too stale to
/// be worth saying. Both dates are checked so a tick that spans midnight
/// doesn't lose a block.
fn due(snap: &Snapshot, last: NaiveDateTime, now: NaiveDateTime) -> Vec<(String, Block)> {
    let mut dates = vec![last.date()];
    if now.date() != last.date() {
        dates.push(now.date());
    }
    let mut out = Vec::new();
    for date in dates {
        for block in blocks_for(snap, date).values() {
            let Some(time) = block_time(block) else { continue };
            let at = date.and_time(time);
            if at > last && at <= now && now - at <= TimeDelta::minutes(GRACE_MINUTES) && !block.done {
                out.push((format!("{date} {}", block.time), block.clone()));
            }
        }
    }
    out
}

/// Start the reminder clock. It starts from "now", so opening Rise at 13:35
/// doesn't replay the 13:30 lunch; a PC waking from sleep does get the block
/// it slept through, if that was within the hour.
pub fn start(app: AppHandle) {
    thread::spawn(move || {
        let mut last = Local::now().naive_local();
        // Keys already shown ("2026-09-14 13:30"). A clock that falls back an
        // hour for DST would otherwise repeat them.
        let mut fired: HashSet<String> = HashSet::new();
        loop {
            thread::sleep(TICK);
            let now = Local::now().naive_local();
            let stored = app.state::<Desktop>().get();
            if let (true, Some(snap)) = (stored.reminders, &stored.snapshot) {
                if now > last {
                    for (key, block) in due(snap, last, now) {
                        if fired.insert(key) {
                            let body = format!("{} kcal · {} g protein", num(block.kcal), num(block.protein_g));
                            notify(&app, &format!("{} · {}", block.name, block.time), Some(&body));
                        }
                    }
                }
            }
            let keep = [last.date().to_string(), now.date().to_string()];
            fired.retain(|k| keep.iter().any(|d| k.starts_with(d.as_str())));
            last = now;
            refresh_tray(&app);
        }
    });
}

/// Show a Windows toast. Clicking it opens Rise.
#[cfg(windows)]
pub fn notify(app: &AppHandle, title: &str, body: Option<&str>) {
    use tauri_winrt_notification::Toast;

    // An installed build has a Start menu shortcut carrying the identifier as
    // its AppUserModelID (Tauri's NSIS template sets it); `tauri dev` has no
    // shortcut, so its toasts borrow PowerShell's.
    let app_id = if cfg!(debug_assertions) {
        Toast::POWERSHELL_APP_ID.to_string()
    } else {
        app.config().identifier.clone()
    };
    let handle = app.clone();
    let mut toast = Toast::new(&app_id).title(title);
    if let Some(body) = body {
        toast = toast.text1(body);
    }
    let shown = toast
        .on_activated(move |_| {
            crate::show_main(&handle);
            Ok(())
        })
        .show();
    if let Err(err) = shown {
        eprintln!("reminder toast failed: {err}");
    }
}

#[cfg(not(windows))]
pub fn notify(_app: &AppHandle, _title: &str, _body: Option<&str>) {}

#[cfg(test)]
mod tests {
    use super::*;

    fn block(name: &str, time: &str, done: bool) -> Block {
        Block { name: name.into(), time: time.into(), kcal: 580.0, protein_g: 33.0, done }
    }

    fn at(s: &str) -> NaiveDateTime {
        NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M").unwrap()
    }

    fn snap() -> Snapshot {
        let today = HashMap::from([
            ("B1".to_string(), block("Breakfast", "08:00", true)),
            ("B3".to_string(), block("Lunch", "13:30", false)),
        ]);
        let fresh = HashMap::from([
            ("B1".to_string(), block("Breakfast", "08:00", false)),
            ("B3".to_string(), block("Lunch", "13:30", false)),
        ]);
        Snapshot { date: "2026-09-14".into(), today: Some(today), fresh }
    }

    #[test]
    fn fires_a_block_crossed_this_tick() {
        let got = due(&snap(), at("2026-09-14 13:29"), at("2026-09-14 13:30"));
        assert_eq!(got.len(), 1);
        assert_eq!(got[0].1.name, "Lunch");
    }

    #[test]
    fn skips_logged_blocks() {
        assert!(due(&snap(), at("2026-09-14 07:59"), at("2026-09-14 08:00")).is_empty());
    }

    #[test]
    fn uses_fresh_on_a_new_date() {
        let got = due(&snap(), at("2026-09-15 07:59"), at("2026-09-15 08:00"));
        assert_eq!(got.len(), 1);
    }

    #[test]
    fn catches_up_after_sleep_within_the_hour_only() {
        assert_eq!(due(&snap(), at("2026-09-14 12:00"), at("2026-09-14 14:15")).len(), 1);
        assert!(due(&snap(), at("2026-09-14 12:00"), at("2026-09-14 14:45")).is_empty());
    }

    #[test]
    fn label_names_the_next_unlogged_block() {
        let stored = Stored { reminders: true, snapshot: Some(snap()), ..Default::default() };
        assert_eq!(next_label(&stored, at("2026-09-14 07:00")), "Next: Lunch · 13:30");
        assert_eq!(next_label(&stored, at("2026-09-14 14:00")), "No more reminders today");
    }
}
