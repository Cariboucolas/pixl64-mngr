use tauri::Manager;

mod commands;
pub mod divoom;
pub mod library;
pub mod source;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let device_client = divoom::DeviceClient::new().expect("the HTTP client could not be built");

    tauri::Builder::default()
        .manage(device_client)
        .manage(commands::source::OpenSource::default())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            app.manage(commands::library::LibraryState::new(data_dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::source::source_open_file,
            commands::source::source_open_url,
            commands::source::source_render,
            commands::library::library_list,
            commands::library::library_add,
            commands::library::library_first_frame,
            commands::library::library_frames,
            commands::library::library_remove,
            commands::direct_play::direct_play_check,
            commands::device::device_send,
            commands::device::device_discover
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
