use serde_json::Value;
use tauri::State;

use crate::divoom::{DeviceClient, DeviceError, DiscoveredDevice};

#[tauri::command]
pub async fn device_send(
    client: State<'_, DeviceClient>,
    ip: String,
    payload: Value,
) -> Result<Value, DeviceError> {
    client.send_command(&ip, &payload).await
}

#[tauri::command]
pub async fn device_discover(
    client: State<'_, DeviceClient>,
) -> Result<Vec<DiscoveredDevice>, DeviceError> {
    client.discover().await
}
