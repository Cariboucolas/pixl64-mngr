//! Talks to a Divoom Pixoo-64 over its local HTTP API.
//! Commands and limits: docs/reference/divoom-api.md.

use std::net::Ipv4Addr;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::Mutex;

const DEVICE_PORT: u16 = 80;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(5);
/// Pause kept between two commands to the device. Divoom documents no rate limit;
/// this value comes from community observations (docs/reference/divoom-api.md).
const MIN_COMMAND_INTERVAL: Duration = Duration::from_millis(35);
/// Largest reply read from the device or the discovery service; real ones are a few hundred bytes.
const MAX_REPLY_BYTES: usize = 64 * 1024;
const DISCOVERY_URL: &str = "https://app.divoom-gz.com/Device/ReturnSameLANDevice";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct DiscoveredDevice {
    pub device_name: String,
    pub device_id: u64,
    #[serde(rename = "DevicePrivateIP")]
    pub device_private_ip: String,
    pub device_mac: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct DiscoveryReply {
    return_code: i64,
    device_list: Option<Vec<DiscoveredDevice>>,
}

#[derive(Debug, PartialEq, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum DeviceError {
    InvalidIp,
    NotPrivateIp,
    Unreachable { message: String },
    HttpStatus { status: u16 },
    InvalidResponse,
    CommandRefused { error_code: i64 },
}

/// A device lives on the local network: only a private IPv4 address is accepted,
/// so a command can never be sent to a public host.
pub fn parse_device_ip(raw: &str) -> Result<Ipv4Addr, DeviceError> {
    let ip: Ipv4Addr = raw.trim().parse().map_err(|_| DeviceError::InvalidIp)?;
    if !ip.is_private() {
        return Err(DeviceError::NotPrivateIp);
    }
    Ok(ip)
}

/// Reads a device reply. `error_code` is absent from some replies
/// (`Channel/GetIndex`), which then count as accepted.
pub fn parse_reply(body: &str) -> Result<Value, DeviceError> {
    let reply: Value = serde_json::from_str(body).map_err(|_| DeviceError::InvalidResponse)?;
    if !reply.is_object() {
        return Err(DeviceError::InvalidResponse);
    }
    match reply.get("error_code").and_then(Value::as_i64) {
        Some(error_code) if error_code != 0 => Err(DeviceError::CommandRefused { error_code }),
        _ => Ok(reply),
    }
}

/// Reads the reply of Divoom's online discovery service.
pub fn parse_discovery(body: &str) -> Result<Vec<DiscoveredDevice>, DeviceError> {
    let reply: DiscoveryReply =
        serde_json::from_str(body).map_err(|_| DeviceError::InvalidResponse)?;
    if reply.return_code != 0 {
        return Err(DeviceError::CommandRefused {
            error_code: reply.return_code,
        });
    }
    Ok(reply.device_list.unwrap_or_default())
}

/// How long to wait before the next command, given the time since the last one.
pub fn pause_before_next_command(since_last: Option<Duration>) -> Duration {
    since_last.map_or(Duration::ZERO, |elapsed| {
        MIN_COMMAND_INTERVAL.saturating_sub(elapsed)
    })
}

/// The single door to the device: commands go out one at a time, paced.
pub struct DeviceClient {
    http: reqwest::Client,
    last_command: Mutex<Option<Instant>>,
}

impl DeviceClient {
    pub fn new() -> Result<Self, DeviceError> {
        let http = reqwest::Client::builder()
            .timeout(REQUEST_TIMEOUT)
            // A redirect would lead away from the address that was validated.
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(unreachable)?;
        Ok(Self {
            http,
            last_command: Mutex::new(None),
        })
    }

    /// Sends one command to the device and returns its reply.
    pub async fn send_command(&self, raw_ip: &str, payload: &Value) -> Result<Value, DeviceError> {
        let ip = parse_device_ip(raw_ip)?;
        let url = format!("http://{ip}:{DEVICE_PORT}/post");

        // Held until the reply: the device handles one command at a time.
        let mut last_command = self.last_command.lock().await;
        let pause = pause_before_next_command(last_command.map(|at| at.elapsed()));
        tokio::time::sleep(pause).await;
        let result = self.post_json(&url, payload.to_string()).await;
        *last_command = Some(Instant::now());

        parse_reply(&result?)
    }

    /// Asks Divoom's online service for the devices on this local network.
    pub async fn discover(&self) -> Result<Vec<DiscoveredDevice>, DeviceError> {
        let body = self.post_json(DISCOVERY_URL, String::new()).await?;
        parse_discovery(&body)
    }

    async fn post_json(&self, url: &str, body: String) -> Result<String, DeviceError> {
        let mut response = self
            .http
            .post(url)
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .body(body)
            .send()
            .await
            .map_err(unreachable)?;
        if !response.status().is_success() {
            return Err(DeviceError::HttpStatus {
                status: response.status().as_u16(),
            });
        }
        let mut reply = Vec::new();
        while let Some(chunk) = response.chunk().await.map_err(unreachable)? {
            if reply.len() + chunk.len() > MAX_REPLY_BYTES {
                return Err(DeviceError::InvalidResponse);
            }
            reply.extend_from_slice(&chunk);
        }
        String::from_utf8(reply).map_err(|_| DeviceError::InvalidResponse)
    }
}

fn unreachable(error: reqwest::Error) -> DeviceError {
    let message = error_chain(&error);
    // The interface shows a plain sentence; the cause is only readable here.
    eprintln!("[divoom] exchange failed: {message}");
    DeviceError::Unreachable { message }
}

/// An error and everything that caused it: the top-level text of an HTTP
/// error names the URL but not why the exchange failed.
fn error_chain(error: &dyn std::error::Error) -> String {
    let mut description = error.to_string();
    let mut cause = error.source();
    while let Some(error) = cause {
        description.push_str(": ");
        description.push_str(&error.to_string());
        cause = error.source();
    }
    description
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;

    /// Serves one canned HTTP response on a local port and returns its URL.
    fn serve_once(response: String) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/post", listener.local_addr().unwrap());
        std::thread::spawn(move || {
            if let Ok((mut stream, _)) = listener.accept() {
                let _ = stream.read(&mut [0; 2048]);
                let _ = stream.write_all(response.as_bytes());
            }
        });
        url
    }

    fn post(url: &str) -> Result<String, DeviceError> {
        let client = DeviceClient::new().unwrap();
        tauri::async_runtime::block_on(client.post_json(url, "{}".into()))
    }

    #[test]
    fn describes_an_error_with_its_causes() {
        #[derive(Debug)]
        struct Layer(&'static str, Option<Box<Layer>>);
        impl std::fmt::Display for Layer {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                f.write_str(self.0)
            }
        }
        impl std::error::Error for Layer {
            fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
                self.1.as_deref().map(|cause| cause as _)
            }
        }
        let error = Layer(
            "error sending request",
            Some(Box::new(Layer(
                "tcp connect error",
                Some(Box::new(Layer("No route to host (os error 65)", None))),
            ))),
        );

        assert_eq!(
            error_chain(&error),
            "error sending request: tcp connect error: No route to host (os error 65)"
        );
        assert_eq!(error_chain(&Layer("alone", None)), "alone");
    }

    #[test]
    fn does_not_follow_a_redirect() {
        let elsewhere = serve_once("HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\n{}".into());
        let url = serve_once(format!(
            "HTTP/1.1 302 Found\r\nLocation: {elsewhere}\r\nContent-Length: 0\r\n\r\n"
        ));
        assert_eq!(post(&url), Err(DeviceError::HttpStatus { status: 302 }));
    }

    #[test]
    fn refuses_an_oversized_reply() {
        let body = "x".repeat(MAX_REPLY_BYTES + 1);
        let url = serve_once(format!(
            "HTTP/1.1 200 OK\r\nContent-Length: {}\r\n\r\n{body}",
            body.len()
        ));
        assert_eq!(post(&url), Err(DeviceError::InvalidResponse));
    }

    #[test]
    fn accepts_a_private_ipv4_address() {
        assert_eq!(
            parse_device_ip("192.168.1.121"),
            Ok(Ipv4Addr::new(192, 168, 1, 121))
        );
        assert!(parse_device_ip(" 10.0.0.100 ").is_ok());
    }

    #[test]
    fn rejects_what_is_not_an_ipv4_address() {
        for raw in ["", "pixoo.local", "192.168.1", "::1", "192.168.1.121:8080"] {
            assert_eq!(parse_device_ip(raw), Err(DeviceError::InvalidIp), "{raw}");
        }
    }

    #[test]
    fn rejects_an_address_outside_the_local_network() {
        for raw in ["8.8.8.8", "127.0.0.1", "169.254.1.1", "0.0.0.0"] {
            assert_eq!(
                parse_device_ip(raw),
                Err(DeviceError::NotPrivateIp),
                "{raw}"
            );
        }
    }

    #[test]
    fn sends_the_first_command_without_waiting() {
        assert_eq!(pause_before_next_command(None), Duration::ZERO);
    }

    #[test]
    fn waits_for_the_rest_of_the_interval_between_commands() {
        assert_eq!(
            pause_before_next_command(Some(Duration::from_millis(10))),
            Duration::from_millis(25)
        );
        assert_eq!(
            pause_before_next_command(Some(Duration::from_millis(500))),
            Duration::ZERO
        );
    }

    #[test]
    fn names_error_fields_in_camel_case_for_the_front() {
        let json = serde_json::to_value(DeviceError::CommandRefused { error_code: 3 }).unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "kind": "commandRefused", "errorCode": 3 })
        );
    }

    #[test]
    fn returns_the_reply_of_an_accepted_command() {
        let reply = parse_reply(r#"{"error_code":0,"Brightness":80}"#).unwrap();
        assert_eq!(reply["Brightness"], 80);
    }

    #[test]
    fn accepts_a_reply_without_error_code() {
        let reply = parse_reply(r#"{"SelectIndex":1}"#).unwrap();
        assert_eq!(reply["SelectIndex"], 1);
    }

    #[test]
    fn reports_a_refused_command() {
        assert_eq!(
            parse_reply(r#"{"error_code":3}"#),
            Err(DeviceError::CommandRefused { error_code: 3 })
        );
    }

    #[test]
    fn lists_the_discovered_devices() {
        let body = r#"{"ReturnCode":0,"ReturnMessage":"","DeviceList":[{"DeviceName":"Pixoo64","DeviceId":300000020,"DevicePrivateIP":"10.0.0.100","DeviceMac":"a8032aff46b1","Hardware":92}]}"#;
        let devices = parse_discovery(body).unwrap();
        assert_eq!(devices.len(), 1);
        assert_eq!(devices[0].device_private_ip, "10.0.0.100");
        assert_eq!(devices[0].device_name, "Pixoo64");
    }

    #[test]
    fn discovers_nothing_when_the_list_is_missing() {
        assert_eq!(parse_discovery(r#"{"ReturnCode":0}"#), Ok(vec![]));
    }

    #[test]
    fn reports_a_discovery_the_service_refused() {
        assert_eq!(
            parse_discovery(r#"{"ReturnCode":1,"ReturnMessage":"nope"}"#),
            Err(DeviceError::CommandRefused { error_code: 1 })
        );
    }

    #[test]
    fn rejects_a_reply_that_is_not_a_json_object() {
        for body in ["", "<html></html>", "[1,2]", "42"] {
            assert_eq!(
                parse_reply(body),
                Err(DeviceError::InvalidResponse),
                "{body}"
            );
        }
    }
}
