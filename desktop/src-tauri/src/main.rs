// The whole app is the bundled web build (see ../scripts/sync-desktop-assets.sh
// and frontendDist in tauri.conf.json) — this file just opens the window
// Tauri's config already describes. No commands, no native surface.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the Rise desktop shell");
}
