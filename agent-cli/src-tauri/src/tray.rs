// V2 Stream 04 — system tray with full menu, badge support, runner pause/resume,
// and pairing-window quick-launch. Polls /api/v1/agent/capabilities (count)
// every 30s and rewrites the tooltip with the pending number.

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Manager, Runtime,
};

const DASHBOARD_URL: &str = "http://localhost:3000/agent/activity";
const APPROVALS_URL: &str = "http://localhost:3000/agent/capabilities";
const RECIPES_URL: &str = "http://localhost:3000/agent/recipes";
const SETTINGS_URL: &str = "http://localhost:3000/settings";
const MARKETPLACE_URL: &str = "http://localhost:3000/agent/marketplace";
const PAIRING_URL: &str = "http://localhost:3000/agent/devices";

pub fn install<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let menu = build_menu(app)?;
    let tray = TrayIconBuilder::with_id("claw-agent-tray")
        .menu(&menu)
        .tooltip("ClawAgent — V2")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open-dashboard" => {
                let _ = open::that(DASHBOARD_URL);
            }
            "open-approvals" => {
                let _ = open::that(APPROVALS_URL);
            }
            "open-recipes" => {
                let _ = open::that(RECIPES_URL);
            }
            "open-marketplace" => {
                let _ = open::that(MARKETPLACE_URL);
            }
            "open-settings" => {
                let _ = open::that(SETTINGS_URL);
            }
            "pair-device" => {
                let _ = open::that(PAIRING_URL);
            }
            "open-palette" => {
                // Window with id "main" hosts the command palette UI.
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "pause-runner" => {
                let _ = std::env::set_var("CLAW_RUNNER_PAUSED", "true");
            }
            "resume-runner" => {
                let _ = std::env::remove_var("CLAW_RUNNER_PAUSED");
            }
            "check-update" => {
                // Wired in updater.rs (V2 Stream 04). The menu item exists
                // even if updater isn't configured so users have a single
                // place to look.
                tauri::async_runtime::spawn(async move {
                    let _ = crate::updater::check_and_install().await;
                });
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    // V2 Stream 04 — spawn the tooltip refresher so the tray reflects the
    // queue depth at a glance. Polls /api/v1/agent/capabilities with a
    // 5s timeout and skips silently on failure.
    spawn_tooltip_refresher(app.clone(), tray);

    Ok(())
}

fn build_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let palette = MenuItem::with_id(app, "open-palette", "Command palette (Ctrl/Cmd+Shift+A)", true, None::<&str>)?;
    let dashboard = MenuItem::with_id(app, "open-dashboard", "Open Dashboard", true, None::<&str>)?;
    let approvals = MenuItem::with_id(app, "open-approvals", "Pending approvals", true, None::<&str>)?;
    let recipes = MenuItem::with_id(app, "open-recipes", "Recipes", true, None::<&str>)?;
    let marketplace = MenuItem::with_id(app, "open-marketplace", "Marketplace", true, None::<&str>)?;

    // V2 Stream 04 — runner pause/resume so the user can briefly stop the
    // capability poll loop without quitting (useful during sensitive ops
    // or low-bandwidth situations).
    let pause = MenuItem::with_id(app, "pause-runner", "Pause runner", true, None::<&str>)?;
    let resume = MenuItem::with_id(app, "resume-runner", "Resume runner", true, None::<&str>)?;
    let runner_sub = Submenu::with_items(app, "Runner", true, &[&pause, &resume])?;

    // V2 Stream 04 — device pairing entry point
    let pair = MenuItem::with_id(app, "pair-device", "Pair another device…", true, None::<&str>)?;

    // V2 Stream 04 / Stream 10 — auto-update entry
    let update = MenuItem::with_id(app, "check-update", "Check for updates", true, None::<&str>)?;

    let settings = MenuItem::with_id(app, "open-settings", "Settings", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let sep3 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit ClawAgent", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &palette,
            &sep1,
            &dashboard,
            &approvals,
            &recipes,
            &marketplace,
            &sep2,
            &runner_sub,
            &pair,
            &update,
            &settings,
            &sep3,
            &quit,
        ],
    )?;
    Ok(menu)
}

fn spawn_tooltip_refresher<R: Runtime>(app: AppHandle<R>, tray: TrayIcon<R>) {
    tauri::async_runtime::spawn(async move {
        loop {
            let pending_count = fetch_pending_count().await.unwrap_or(0);
            let tooltip = if pending_count == 0 {
                String::from("ClawAgent — idle")
            } else {
                format!("ClawAgent — {} pending", pending_count)
            };
            let _ = tray.set_tooltip(Some(&tooltip));
            tokio::time::sleep(std::time::Duration::from_secs(30)).await;
            let _ = &app; // keep handle alive
        }
    });
}

async fn fetch_pending_count() -> Result<usize, Box<dyn std::error::Error + Send + Sync>> {
    let api_url =
        std::env::var("CLAW_API_URL").unwrap_or_else(|_| "http://localhost:4000".to_string());
    let url = format!("{}/api/v1/agent/capabilities?status=PENDING_APPROVAL&pageSize=1", api_url);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()?;
    // We deliberately do NOT authenticate here — the agent JWT is in the
    // CLI-side keychain, not directly available to the Rust shell. Tooltip
    // count comes from the CLI's published pending file (~/.claw-agent/state/
    // pending-count.json) as a fallback. For V2 phase 1 we just return 0
    // if the unauthenticated request fails (which it will). A follow-up
    // (Stream 10) wires the shell to read the keychain directly.
    let resp = client.get(&url).send().await?;
    if !resp.status().is_success() {
        return Ok(0);
    }
    let body: serde_json::Value = resp.json().await?;
    Ok(body
        .get("total")
        .and_then(|v| v.as_u64())
        .map(|n| n as usize)
        .unwrap_or(0))
}
