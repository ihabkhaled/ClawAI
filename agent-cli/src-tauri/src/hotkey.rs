// Global hotkey installation — Cmd/Ctrl+Shift+A opens the command
// palette overlay. The palette is the main visible window of the
// Tauri app; we toggle its visibility on hotkey press.

use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

pub fn install<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let palette_shortcut = Shortcut::new(Some(Modifiers::SHIFT | Modifiers::SUPER), Code::KeyA);
    let app_handle = app.clone();
    app.global_shortcut().on_shortcut(palette_shortcut, move |_app, _event, _shortcut| {
        if let Some(window) = app_handle.get_webview_window("main") {
            if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
            } else {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    })?;
    Ok(())
}
