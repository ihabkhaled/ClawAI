// Tauri command handlers — exposed to the frontend via `tauri::invoke`.
//
// Each handler proxies to the cloud-side ClawAI API on localhost:4000
// using a device-token auth header that the Tauri shell pulls from the
// OS keychain via `keyring` crate (TODO: add `keyring = "2"` dep).

use serde::{Deserialize, Serialize};

const API_BASE: &str = "http://localhost:4000/api/v1";

#[derive(Debug, Serialize, Deserialize)]
pub struct CapabilityInvocation {
    pub id: String,
    #[serde(rename = "capabilityClass")]
    pub capability_class: String,
    #[serde(rename = "capabilityOperation")]
    pub capability_operation: String,
    pub status: String,
    #[serde(rename = "riskLabel")]
    pub risk_label: String,
    #[serde(rename = "riskScore")]
    pub risk_score: i32,
    #[serde(rename = "matchedPolicyName")]
    pub matched_policy_name: Option<String>,
}

fn auth_token() -> String {
    // TODO: read from OS keychain via `keyring::Entry::new("claw-agent", "device-token")`
    // For now, read from env so dev iteration is easy.
    std::env::var("CLAW_AGENT_TOKEN").unwrap_or_default()
}

#[tauri::command]
pub async fn get_pending_capabilities() -> Result<Vec<CapabilityInvocation>, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!(
            "{}/agent/capabilities?status=PENDING_APPROVAL&pageSize=20",
            API_BASE
        ))
        .header("authorization", format!("Bearer {}", auth_token()))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let data = body
        .get("data")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let invocations: Vec<CapabilityInvocation> = serde_json::from_value(serde_json::Value::Array(data))
        .map_err(|e| e.to_string())?;
    Ok(invocations)
}

#[tauri::command]
pub async fn approve_capability(id: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let _ = client
        .post(format!("{}/agent/capabilities/{}/approve", API_BASE, id))
        .header("authorization", format!("Bearer {}", auth_token()))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn reject_capability(id: String, reason: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({ "reason": reason });
    let _ = client
        .post(format!("{}/agent/capabilities/{}/reject", API_BASE, id))
        .header("authorization", format!("Bearer {}", auth_token()))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn open_browser_to_run(run_id: String) -> Result<(), String> {
    let url = format!("http://localhost:3000/agent/recipe-runs/{}", run_id);
    open::that(url).map_err(|e| e.to_string())
}
