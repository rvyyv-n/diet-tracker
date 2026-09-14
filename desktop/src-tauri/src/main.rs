// The whole app is the bundled web build (see ../scripts/sync-desktop-assets.sh
// and frontendDist in tauri.conf.json). What this file adds on top is the part
// a browser can't do (pass 54): a tray icon, hide-to-tray on close, start on
// login, and meal reminders that fire with the window hidden (reminders.rs).
// The page talks to it through the three commands below — see the desktop
// section of src/js/core/reminders.js.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod reminders;

use chrono::Local;
use serde::Serialize;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, State, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

use reminders::{Desktop, Snapshot};

/// Passed by the login entry, so a start with Windows goes straight to the tray.
const HIDDEN_ARG: &str = "--hidden";

pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    reminders: bool,
    tray: bool,
    autostart: bool,
}

fn settings(app: &AppHandle, desktop: &Desktop) -> Settings {
    let stored = desktop.get();
    Settings {
        reminders: stored.reminders,
        tray: stored.tray,
        // The registry is the truth here, not a stored flag — the entry can be
        // removed from Task Manager's Startup tab behind the app's back.
        autostart: app.autolaunch().is_enabled().unwrap_or(false),
    }
}

#[tauri::command]
fn desktop_settings(app: AppHandle, desktop: State<Desktop>) -> Settings {
    settings(&app, &desktop)
}

#[tauri::command]
fn desktop_set(app: AppHandle, desktop: State<Desktop>, key: String, on: bool) -> Result<Settings, String> {
    match key.as_str() {
        "reminders" => {
            desktop.update(|s| s.reminders = on);
        }
        "tray" => {
            desktop.update(|s| s.tray = on);
            if let Some(tray) = app.tray_by_id("main") {
                tray.set_visible(on).map_err(|e| e.to_string())?;
            }
        }
        "autostart" => {
            let launcher = app.autolaunch();
            let result = if on { launcher.enable() } else { launcher.disable() };
            result.map_err(|e| e.to_string())?;
        }
        _ => return Err(format!("unknown setting {key}")),
    }
    reminders::refresh_tray(&app);
    Ok(settings(&app, &desktop))
}

#[tauri::command]
fn desktop_sync(app: AppHandle, desktop: State<Desktop>, snapshot: Snapshot) {
    desktop.update(|s| s.snapshot = Some(snapshot));
    reminders::refresh_tray(&app);
}

fn main() {
    tauri::Builder::default()
        // First, so a second launch hands off before anything else starts.
        // A login start finding Rise already running has nothing to show.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if !args.iter().any(|a| a == HIDDEN_ARG) {
                show_main(app);
            }
        }))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![HIDDEN_ARG])))
        .invoke_handler(tauri::generate_handler![desktop_settings, desktop_set, desktop_sync])
        .setup(|app| {
            let desktop = Desktop::load(app.handle());
            let stored = desktop.get();
            app.manage(desktop);

            let next_text = reminders::next_label(&stored, Local::now().naive_local());
            let open = MenuItem::with_id(app, "open", "Open Rise", true, None::<&str>)?;
            let next = MenuItem::with_id(app, "next", &next_text, false, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Rise", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[&open, &PredefinedMenuItem::separator(app)?, &next, &PredefinedMenuItem::separator(app)?, &quit],
            )?;
            let mut tray = TrayIconBuilder::with_id("main")
                .tooltip("Rise")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_main(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_main(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?.set_visible(stored.tray)?;
            app.state::<Desktop>().set_next_item(next, next_text);

            // The window is created hidden (tauri.conf.json) so a login start
            // never flashes it. Show it unless this is that start and the tray
            // is there to come back to — without the tray, a hidden window
            // would leave nothing on screen to reopen it from.
            let login_start = std::env::args().any(|a| a == HIDDEN_ARG);
            if !(login_start && stored.tray) {
                show_main(app.handle());
            }

            reminders::start(app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            let WindowEvent::CloseRequested { api, .. } = event else { return };
            let app = window.app_handle();
            let desktop = app.state::<Desktop>();
            if !desktop.get().tray {
                return;
            }
            api.prevent_close();
            let _ = window.hide();
            // Say where the window went, once ever. Closing a window and
            // having the app carry on is surprising the first time.
            if !desktop.get().tray_hint_shown {
                desktop.update(|s| s.tray_hint_shown = true);
                reminders::notify(app, "Rise is still running", Some("It's in the tray. Right-click the icon to quit."));
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running the Rise desktop shell");
}
