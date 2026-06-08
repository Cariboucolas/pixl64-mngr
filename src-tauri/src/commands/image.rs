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

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum FetchImageError {
    InvalidUrl,
    NonHttps,
    MissingHost,
    Localhost,
    Mdns,
    Loopback,
    Private,
    LinkLocal,
    Ipv4Mapped,
    ReservedIp {
        range: String,
    },
    HttpClient {
        message: String,
    },
    HttpRequest {
        message: String,
    },
    HttpStatus {
        status: u16,
    },
    MissingContentType,
    NotImage,
    HttpRead {
        message: String,
    },
    TooLarge {
        actual_bytes: usize,
        max_bytes: usize,
    },
}

#[tauri::command]
pub async fn fetch_image_bytes(url: String) -> Result<ImageBytes, FetchImageError> {
    let safe_url = validate_url(&url)?;

    let client = reqwest::Client::builder()
        .timeout(FETCH_TIMEOUT)
        .build()
        .map_err(|e| FetchImageError::HttpClient {
            message: e.to_string(),
        })?;

    let response = client
        .get(safe_url)
        .send()
        .await
        .map_err(|e| FetchImageError::HttpRequest {
            message: e.to_string(),
        })?;

    if !response.status().is_success() {
        return Err(FetchImageError::HttpStatus {
            status: response.status().as_u16(),
        });
    }

    let mime = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .ok_or(FetchImageError::MissingContentType)?
        .to_string();

    if !mime.starts_with("image/") {
        return Err(FetchImageError::NotImage);
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| FetchImageError::HttpRead {
            message: e.to_string(),
        })?;

    if bytes.len() > MAX_BYTES {
        return Err(FetchImageError::TooLarge {
            actual_bytes: bytes.len(),
            max_bytes: MAX_BYTES,
        });
    }

    Ok(ImageBytes {
        bytes: bytes.to_vec(),
        mime,
    })
}

fn validate_url(raw: &str) -> Result<Url, FetchImageError> {
    let url = Url::parse(raw).map_err(|_| FetchImageError::InvalidUrl)?;

    if url.scheme() != "https" {
        return Err(FetchImageError::NonHttps);
    }

    let host = url.host().ok_or(FetchImageError::MissingHost)?;

    match host {
        Host::Domain(domain) => validate_domain(domain),
        Host::Ipv4(addr) => validate_ipv4(addr),
        Host::Ipv6(addr) => validate_ipv6(addr),
    }?;

    Ok(url)
}

fn validate_domain(domain: &str) -> Result<(), FetchImageError> {
    let lowered = domain.to_ascii_lowercase();
    if lowered == "localhost" {
        return Err(FetchImageError::Localhost);
    }
    if lowered.ends_with(".local") {
        return Err(FetchImageError::Mdns);
    }
    Ok(())
}

fn validate_ipv4(addr: Ipv4Addr) -> Result<(), FetchImageError> {
    if addr.is_loopback() {
        return Err(FetchImageError::Loopback);
    }
    if addr.is_private() {
        return Err(FetchImageError::Private);
    }
    if addr.is_link_local() {
        return Err(FetchImageError::LinkLocal);
    }
    if addr.is_multicast() || addr.is_broadcast() || addr.is_unspecified() {
        return Err(FetchImageError::ReservedIp {
            range: "ipv4-reserved".to_string(),
        });
    }
    Ok(())
}

fn validate_ipv6(addr: Ipv6Addr) -> Result<(), FetchImageError> {
    // Reject all IPv4-mapped IPv6 (::ffff:0:0/96) — bypasses IPv4 allowlists otherwise.
    if addr.to_ipv4_mapped().is_some() {
        return Err(FetchImageError::Ipv4Mapped);
    }
    if addr.is_loopback() {
        return Err(FetchImageError::Loopback);
    }
    if addr.is_multicast() || addr.is_unspecified() {
        return Err(FetchImageError::ReservedIp {
            range: "ipv6-reserved".to_string(),
        });
    }
    // Link-local fe80::/10
    if addr.segments()[0] & 0xffc0 == 0xfe80 {
        return Err(FetchImageError::LinkLocal);
    }
    // Unique-local fc00::/7
    if addr.segments()[0] & 0xfe00 == 0xfc00 {
        return Err(FetchImageError::Private);
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
        assert!(matches!(
            validate_url("not a url"),
            Err(FetchImageError::InvalidUrl)
        ));
        assert!(matches!(validate_url(""), Err(FetchImageError::InvalidUrl)));
    }

    #[test]
    fn rejects_non_https_protocols() {
        for url in [
            "http://example.com/",
            "ftp://example.com/",
            "file:///etc/passwd",
        ] {
            assert!(matches!(validate_url(url), Err(FetchImageError::NonHttps)));
        }
    }

    #[test]
    fn rejects_loopback_hosts() {
        assert!(matches!(
            validate_url("https://localhost/"),
            Err(FetchImageError::Localhost)
        ));
        assert!(matches!(
            validate_url("https://127.0.0.1/"),
            Err(FetchImageError::Loopback)
        ));
        assert!(matches!(
            validate_url("https://[::1]/"),
            Err(FetchImageError::Loopback)
        ));
    }

    #[test]
    fn rejects_rfc1918_private_ips() {
        for url in [
            "https://10.0.0.1/",
            "https://192.168.1.1/",
            "https://172.16.0.1/",
        ] {
            assert!(matches!(validate_url(url), Err(FetchImageError::Private)));
        }
    }

    #[test]
    fn rejects_ipv4_link_local() {
        assert!(matches!(
            validate_url("https://169.254.0.1/"),
            Err(FetchImageError::LinkLocal)
        ));
    }

    #[test]
    fn rejects_mdns_local() {
        assert!(matches!(
            validate_url("https://device.local/"),
            Err(FetchImageError::Mdns)
        ));
    }

    #[test]
    fn rejects_ipv4_mapped_ipv6() {
        assert!(matches!(
            validate_url("https://[::ffff:127.0.0.1]/"),
            Err(FetchImageError::Ipv4Mapped)
        ));
    }

    #[test]
    fn rejects_ipv6_unique_local() {
        assert!(matches!(
            validate_url("https://[fc00::1]/"),
            Err(FetchImageError::Private)
        ));
    }

    #[test]
    fn rejects_ipv6_link_local() {
        assert!(matches!(
            validate_url("https://[fe80::1]/"),
            Err(FetchImageError::LinkLocal)
        ));
    }
}
