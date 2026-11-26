mod commands;
pub mod divoom;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let device_client = divoom::DeviceClient::new().expect("the HTTP client could not be built");

    tauri::Builder::default()
        .manage(device_client)
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::image::fetch_image_bytes,
            commands::device::device_send,
            commands::device::device_discover
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
