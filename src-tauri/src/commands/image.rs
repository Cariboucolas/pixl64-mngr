use std::net::{Ipv4Addr, Ipv6Addr};
use std::time::Duration;

use serde::Serialize;
use url::{Host, Url};

const MAX_BYTES: usize = 20 * 1024 * 1024;
const FETCH_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Serialize)]
pub struct ImageBytes {
    pub bytes: Vec<u8>,
    pub mime: String,
}

#[tauri::command]
pub async fn fetch_image_bytes(url: String) -> Result<ImageBytes, String> {
    let safe_url = validate_url(&url)?;

    let client = reqwest::Client::builder()
        .timeout(FETCH_TIMEOUT)
        .build()
        .map_err(|e| format!("Erreur client HTTP: {e}"))?;

    let response = client
        .get(safe_url)
        .send()
        .await
        .map_err(|e| format!("Erreur de requête: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status().as_u16()));
    }

    let mime = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| "Content-Type manquant".to_string())?
        .to_string();

    if !mime.starts_with("image/") {
        return Err("L'URL ne pointe pas vers une image".to_string());
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Erreur de lecture: {e}"))?;

    if bytes.len() > MAX_BYTES {
        return Err(format!(
            "Image trop volumineuse ({} octets, max {})",
            bytes.len(),
            MAX_BYTES
        ));
    }

    Ok(ImageBytes {
        bytes: bytes.to_vec(),
        mime,
    })
}

fn validate_url(raw: &str) -> Result<Url, String> {
    let url = Url::parse(raw).map_err(|_| "URL invalide".to_string())?;

    if url.scheme() != "https" {
        return Err("Seules les URLs https:// sont autorisées".to_string());
    }

    let host = url.host().ok_or_else(|| "Hostname manquant".to_string())?;

    match host {
        Host::Domain(domain) => validate_domain(domain),
        Host::Ipv4(addr) => validate_ipv4(addr),
        Host::Ipv6(addr) => validate_ipv6(addr),
    }?;

    Ok(url)
}

fn validate_domain(domain: &str) -> Result<(), String> {
    let lowered = domain.to_ascii_lowercase();
    if lowered == "localhost" {
        return Err("Hostname local (localhost) interdit".to_string());
    }
    if lowered.ends_with(".local") {
        return Err("Hostname mDNS (.local) interdit".to_string());
    }
    Ok(())
}

fn validate_ipv4(addr: Ipv4Addr) -> Result<(), String> {
    if addr.is_loopback() {
        return Err("Adresse loopback non autorisée".to_string());
    }
    if addr.is_private() {
        return Err("Adresse privée non autorisée".to_string());
    }
    if addr.is_link_local() {
        return Err("Adresse link-local non autorisée".to_string());
    }
    if addr.is_multicast() || addr.is_broadcast() || addr.is_unspecified() {
        return Err("Adresse IP réservée non autorisée".to_string());
    }
    Ok(())
}

fn validate_ipv6(addr: Ipv6Addr) -> Result<(), String> {
    if let Some(v4) = addr.to_ipv4_mapped() {
        return validate_ipv4(v4).map_err(|_| "IPv4-mapped IPv6 non autorisée".to_string());
    }
    if addr.is_loopback() {
        return Err("Adresse loopback non autorisée".to_string());
    }
    if addr.is_multicast() || addr.is_unspecified() {
        return Err("Adresse IP réservée non autorisée".to_string());
    }
    // Link-local fe80::/10
    if addr.segments()[0] & 0xffc0 == 0xfe80 {
        return Err("Adresse link-local non autorisée".to_string());
    }
    // Unique-local fc00::/7
    if addr.segments()[0] & 0xfe00 == 0xfc00 {
        return Err("Adresse privée non autorisée".to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_https_url() {
        let url = validate_url("https://example.com/cat.png").unwrap();
        assert_eq!(url.scheme(), "https");
    }

    #[test]
    fn rejects_malformed_url() {
        assert!(validate_url("not a url").is_err());
        assert!(validate_url("").is_err());
    }

    #[test]
    fn rejects_non_https_protocols() {
        for url in [
            "http://example.com/",
            "ftp://example.com/",
            "file:///etc/passwd",
        ] {
            let err = validate_url(url).unwrap_err();
            assert!(
                err.contains("https"),
                "expected https rejection, got: {err}"
            );
        }
    }

    #[test]
    fn rejects_loopback_hosts() {
        for url in ["https://localhost/", "https://127.0.0.1/", "https://[::1]/"] {
            assert!(validate_url(url).is_err(), "{url} should be rejected");
        }
    }

    #[test]
    fn rejects_rfc1918_private_ips() {
        for url in [
            "https://10.0.0.1/",
            "https://192.168.1.1/",
            "https://172.16.0.1/",
        ] {
            let err = validate_url(url).unwrap_err();
            assert!(
                err.contains("priv"),
                "expected private rejection for {url}, got: {err}"
            );
        }
    }

    #[test]
    fn rejects_ipv4_link_local() {
        let err = validate_url("https://169.254.0.1/").unwrap_err();
        assert!(err.contains("link-local"));
    }

    #[test]
    fn rejects_mdns_local() {
        let err = validate_url("https://device.local/").unwrap_err();
        assert!(err.contains("mDNS") || err.contains("local"));
    }

    #[test]
    fn rejects_ipv4_mapped_ipv6() {
        let err = validate_url("https://[::ffff:127.0.0.1]/").unwrap_err();
        assert!(err.contains("mapped") || err.contains("loopback"));
    }

    #[test]
    fn rejects_ipv6_unique_local() {
        let err = validate_url("https://[fc00::1]/").unwrap_err();
        assert!(err.contains("priv"));
    }

    #[test]
    fn rejects_ipv6_link_local() {
        let err = validate_url("https://[fe80::1]/").unwrap_err();
        assert!(err.contains("link-local"));
    }
}
