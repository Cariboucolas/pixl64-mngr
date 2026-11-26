//! Trial against a real Pixoo-64 (ADR-0006). Ignored by default: it needs a
//! device on the local network and changes what the device displays.
//!
//!   cargo test --test device_live -- --ignored --nocapture
//!
//! `PIXOO_IP` picks the device; without it, the first discovered one is used.

use base64::Engine;
use pixl64_mngr_lib::divoom;
use serde_json::json;

const SIZE: usize = 64;

/// Four coloured quadrants with a white border: orientation and colour order
/// are readable at a glance on the device.
fn test_pattern() -> String {
    let mut rgb = Vec::with_capacity(SIZE * SIZE * 3);
    for y in 0..SIZE {
        for x in 0..SIZE {
            let border = x == 0 || y == 0 || x == SIZE - 1 || y == SIZE - 1;
            let pixel: [u8; 3] = match (border, x < SIZE / 2, y < SIZE / 2) {
                (true, _, _) => [255, 255, 255],
                (_, true, true) => [255, 0, 0],
                (_, false, true) => [0, 255, 0],
                (_, true, false) => [0, 0, 255],
                (_, false, false) => [255, 176, 0],
            };
            rgb.extend_from_slice(&pixel);
        }
    }
    base64::engine::general_purpose::STANDARD.encode(rgb)
}

#[test]
#[ignore = "needs a Pixoo-64 on the local network"]
fn reads_settings_and_sends_a_still_image() {
    tauri::async_runtime::block_on(async {
        let client = divoom::DeviceClient::new().expect("HTTP client");
        let ip = match std::env::var("PIXOO_IP") {
            Ok(ip) => ip,
            Err(_) => {
                let devices = client.discover().await.expect("discovery failed");
                println!("discovered: {devices:?}");
                devices
                    .first()
                    .expect("no device discovered")
                    .device_private_ip
                    .clone()
            }
        };

        let settings = client
            .send_command(&ip, &json!({ "Command": "Channel/GetAllConf" }))
            .await
            .expect("Channel/GetAllConf failed");
        println!("settings: {settings}");
        assert!(settings.get("Brightness").is_some());

        let channel = client
            .send_command(&ip, &json!({ "Command": "Channel/GetIndex" }))
            .await
            .expect("Channel/GetIndex failed");
        println!("channel: {channel}");

        let id = client
            .send_command(&ip, &json!({ "Command": "Draw/GetHttpGifId" }))
            .await
            .expect("Draw/GetHttpGifId failed");
        println!("next id: {id}");
        let pic_id = id.get("PicId").and_then(|v| v.as_i64()).unwrap_or(1);

        let sent = client
            .send_command(
                &ip,
                &json!({
                    "Command": "Draw/SendHttpGif",
                    "PicNum": 1,
                    "PicWidth": SIZE,
                    "PicOffset": 0,
                    "PicID": pic_id,
                    "PicSpeed": 100,
                    "PicData": test_pattern(),
                }),
            )
            .await
            .expect("Draw/SendHttpGif failed");
        println!("sent: {sent}");
    });
}
