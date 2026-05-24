// ClawAgent — Tauri shell entry point.
//
// This binary wraps the Node.js `agent-cli` runtime in a system-tray UI
// with a global hotkey and a command palette. The Node runtime is
// spawned as a child process; the Tauri layer:
//   1. shows pending capability invocations in the tray menu
//   2. surfaces approval / reject buttons via tauri's native menu
//   3. listens for a global hotkey (default Cmd/Ctrl+Shift+A) that
//      opens a command palette overlay
//   4. forwards palette commands to the local agent-cli process
//
// The frontend (`ui/`) is plain HTML+JS — no React/Vue dependency on
// the desktop side.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_os::init())
        // V2 Stream 04 / Stream 10 — auto-update plumbing
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::get_pending_capabilities,
            commands::approve_capability,
            commands::reject_capability,
            commands::open_browser_to_run,
        ])
        .setup(|app| {
            tray::install(app)?;
            hotkey::install(app)?;
            // V2 Stream 04 — schedule a background updater check 60s after
            // boot so the user is not blocked at startup. Check cadence
            // and channel (stable/beta/canary) is controlled by
            // tauri.conf.json.bundle.updater.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(60)).await;
                let _ = updater::check_and_install_with_handle(&handle).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}

mod commands;
mod hotkey;
mod tray;
mod updater;
