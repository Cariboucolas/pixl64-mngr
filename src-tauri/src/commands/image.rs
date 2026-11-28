use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};
use std::time::Duration;

use serde::Serialize;
use url::{Host, Url};

pub const MAX_BYTES: usize = 20 * 1024 * 1024;
pub const MAX_REDIRECTS: usize = 5;
const FETCH_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum FetchImageError {
    InvalidUrl,
    NonHttps,
    /// Neither `http` nor `https`, where both are accepted.
    UnsupportedScheme,
    TooManyRedirects,
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

/// What a fetch accepts. Tests swap the address check to reach a server on the loopback address.
#[derive(Clone, Copy)]
pub struct FetchPolicy {
    pub https_only: bool,
    pub check_address: fn(IpAddr) -> Result<(), FetchImageError>,
}

impl FetchPolicy {
    pub const HTTPS_ONLY: Self = Self {
        https_only: true,
        check_address: validate_public_address,
    };
    pub const HTTP_OR_HTTPS: Self = Self {
        https_only: false,
        check_address: validate_public_address,
    };
}

/// Downloads the image a user-chosen URL points to, after validating the URL (ADR-0002, ADR-0010).
pub async fn download(url: &str) -> Result<Vec<u8>, FetchImageError> {
    download_with(url, FetchPolicy::HTTPS_ONLY, MAX_BYTES).await
}

async fn download_with(
    url: &str,
    policy: FetchPolicy,
    max_bytes: usize,
) -> Result<Vec<u8>, FetchImageError> {
    let mut response = open(url, policy).await?;

    if !response.status().is_success() {
        return Err(FetchImageError::HttpStatus {
            status: response.status().as_u16(),
        });
    }

    let mime = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .ok_or(FetchImageError::MissingContentType)?;

    if !mime.starts_with("image/") {
        return Err(FetchImageError::NotImage);
    }

    let too_large = |actual_bytes: usize| FetchImageError::TooLarge {
        actual_bytes,
        max_bytes,
    };
    if let Some(announced) = response.content_length() {
        let announced = usize::try_from(announced).unwrap_or(usize::MAX);
        if announced > max_bytes {
            return Err(too_large(announced));
        }
    }

    // Read piece by piece: a server that lies about the length is cut off at the limit.
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| FetchImageError::HttpRead {
            message: e.to_string(),
        })?
    {
        if bytes.len() + chunk.len() > max_bytes {
            return Err(too_large(bytes.len() + chunk.len()));
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok(bytes)
}

/// Calls a user-chosen URL and returns the first response that is not a redirect.
/// Redirects are followed by hand so that every hop is validated before it is called.
pub async fn open(raw: &str, policy: FetchPolicy) -> Result<reqwest::Response, FetchImageError> {
    let mut url = validate_url(raw, policy)?;
    for _ in 0..=MAX_REDIRECTS {
        let response = call(&url, policy).await?;
        if !response.status().is_redirection() {
            return Ok(response);
        }
        let location = response
            .headers()
            .get(reqwest::header::LOCATION)
            .and_then(|value| value.to_str().ok())
            .and_then(|location| url.join(location).ok())
            .ok_or(FetchImageError::InvalidUrl)?;
        url = validate_url(location.as_str(), policy)?;
    }
    Err(FetchImageError::TooManyRedirects)
}

/// One request. A host name is resolved here, its addresses are validated, and the connection
/// is pinned to them: a second lookup could answer something else (DNS rebinding).
async fn call(url: &Url, policy: FetchPolicy) -> Result<reqwest::Response, FetchImageError> {
    let request_failed = |message: String| FetchImageError::HttpRequest { message };
    let mut builder = reqwest::Client::builder()
        .timeout(FETCH_TIMEOUT)
        .redirect(reqwest::redirect::Policy::none());

    if let Some(Host::Domain(domain)) = url.host() {
        let port = url
            .port_or_known_default()
            .ok_or(FetchImageError::InvalidUrl)?;
        let resolved = tokio::net::lookup_host((domain, port))
            .await
            .map_err(|e| request_failed(e.to_string()))?
            .collect();
        let addresses = public_addresses(resolved, policy.check_address)?;
        builder = builder.resolve_to_addrs(domain, &addresses);
    }

    builder
        .build()
        .map_err(|e| FetchImageError::HttpClient {
            message: e.to_string(),
        })?
        .get(url.clone())
        .send()
        .await
        .map_err(|e| request_failed(e.to_string()))
}

/// The addresses a host name resolved to, refused as a whole if one of them is not allowed.
fn public_addresses(
    resolved: Vec<SocketAddr>,
    check_address: fn(IpAddr) -> Result<(), FetchImageError>,
) -> Result<Vec<SocketAddr>, FetchImageError> {
    if resolved.is_empty() {
        return Err(FetchImageError::HttpRequest {
            message: "the host name has no address".to_string(),
        });
    }
    for address in &resolved {
        check_address(address.ip())?;
    }
    Ok(resolved)
}

/// Refuses a URL by what is written in it: scheme, local names, addresses of the local network.
pub fn validate_url(raw: &str, policy: FetchPolicy) -> Result<Url, FetchImageError> {
    let url = Url::parse(raw).map_err(|_| FetchImageError::InvalidUrl)?;

    match url.scheme() {
        "https" => {}
        "http" if !policy.https_only => {}
        _ if policy.https_only => return Err(FetchImageError::NonHttps),
        _ => return Err(FetchImageError::UnsupportedScheme),
    }

    match url.host().ok_or(FetchImageError::MissingHost)? {
        Host::Domain(domain) => validate_domain(domain)?,
        Host::Ipv4(address) => (policy.check_address)(IpAddr::V4(address))?,
        Host::Ipv6(address) => (policy.check_address)(IpAddr::V6(address))?,
    }
    Ok(url)
}

/// Refuses the addresses of the local machine and of the local network (ADR-0002).
pub fn validate_public_address(address: IpAddr) -> Result<(), FetchImageError> {
    match address {
        IpAddr::V4(address) => validate_ipv4(address),
        IpAddr::V6(address) => validate_ipv6(address),
    }
}

fn validate_domain(domain: &str) -> Result<(), FetchImageError> {
    // A trailing dot names the same host.
    let lowered = domain.trim_end_matches('.').to_ascii_lowercase();
    if lowered == "localhost" || lowered.ends_with(".localhost") {
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
    let [first, second, ..] = addr.octets();
    let shared = first == 100 && second & 0xc0 == 64; // 100.64.0.0/10, carrier-grade NAT
    let this_network = first == 0; // 0.0.0.0/8
    let benchmarking = first == 198 && second & 0xfe == 18; // 198.18.0.0/15
    let future_use = first >= 240; // 240.0.0.0/4, broadcast included
    if addr.is_multicast() || shared || this_network || benchmarking || future_use {
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
    // NAT64 64:ff9b::/96 — reaches the IPv4 address it embeds.
    let nat64 = addr.segments()[..6] == [0x64, 0xff9b, 0, 0, 0, 0];
    if addr.is_multicast() || addr.is_unspecified() || nat64 {
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
#[path = "image_tests.rs"]
pub(crate) mod tests;
