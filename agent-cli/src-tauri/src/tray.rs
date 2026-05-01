// System-tray installation — builds the menu, polls for pending
// capabilities every 30 seconds and updates the tray badge accordingly.

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, Runtime,
};

pub fn install<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let menu = build_menu(app)?;
    let _tray = TrayIconBuilder::with_id("claw-agent-tray")
        .menu(&menu)
        .tooltip("ClawAgent — capability invocations, recipes, activity")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open-dashboard" => {
                let _ = open::that("http://localhost:3000/agent/activity");
            }
            "open-approvals" => {
                let _ = open::that("http://localhost:3000/agent/capabilities");
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;
    Ok(())
}

fn build_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let dashboard = MenuItem::with_id(app, "open-dashboard", "Open Dashboard", true, None::<&str>)?;
    let approvals = MenuItem::with_id(
        app,
        "open-approvals",
        "Pending Approvals",
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "quit", "Quit ClawAgent", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&dashboard, &approvals, &quit])?;
    Ok(menu)
}
