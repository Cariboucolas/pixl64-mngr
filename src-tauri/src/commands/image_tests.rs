use std::net::{IpAddr, SocketAddr};

use super::*;

/// Canned HTTP responses served on the loopback address, for the tests of every fetch.
pub(crate) mod server {
    use std::io::{Read, Write};
    use std::net::{IpAddr, TcpListener};

    use super::super::{validate_public_address, FetchImageError, FetchPolicy};

    /// Serves the responses on a local port, one per connection, and returns its URL.
    pub(crate) fn serve(responses: Vec<Vec<u8>>) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/a.gif", listener.local_addr().unwrap());
        std::thread::spawn(move || {
            for response in responses {
                if let Ok((mut stream, _)) = listener.accept() {
                    let _ = stream.read(&mut [0; 2048]);
                    let _ = stream.write_all(&response);
                }
            }
        });
        url
    }

    pub(crate) fn ok(body: &[u8]) -> Vec<u8> {
        let mut response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: image/gif\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
            body.len()
        )
        .into_bytes();
        response.extend_from_slice(body);
        response
    }

    /// A response that does not announce its length: only reading it tells how long it is.
    pub(crate) fn ok_without_length(body: &[u8]) -> Vec<u8> {
        let mut response =
            b"HTTP/1.1 200 OK\r\nContent-Type: image/gif\r\nConnection: close\r\n\r\n".to_vec();
        response.extend_from_slice(body);
        response
    }

    pub(crate) fn redirect(location: &str) -> Vec<u8> {
        format!("HTTP/1.1 302 Found\r\nLocation: {location}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").into_bytes()
    }

    fn loopback_or_public(address: IpAddr) -> Result<(), FetchImageError> {
        if address.is_loopback() {
            Ok(())
        } else {
            validate_public_address(address)
        }
    }

    /// The real policy, except that it reaches the test server: plain http, loopback address.
    pub(crate) const LOCAL_SERVER: FetchPolicy = FetchPolicy {
        https_only: false,
        check_address: loopback_or_public,
    };
}

use server::{ok, ok_without_length, redirect, serve, LOCAL_SERVER};

fn validate(raw: &str) -> Result<Url, FetchImageError> {
    validate_url(raw, FetchPolicy::HTTPS_ONLY)
}

fn fetch(url: &str, max_bytes: usize) -> Result<Vec<u8>, FetchImageError> {
    tauri::async_runtime::block_on(download_with(url, LOCAL_SERVER, max_bytes))
}

fn socket(address: &str) -> SocketAddr {
    SocketAddr::new(address.parse::<IpAddr>().unwrap(), 443)
}

#[test]
fn accepts_valid_https_url() {
    let url = validate("https://example.com/cat.png").unwrap();
    assert_eq!(url.scheme(), "https");
}

#[test]
fn rejects_malformed_url() {
    assert!(matches!(
        validate("not a url"),
        Err(FetchImageError::InvalidUrl)
    ));
    assert!(matches!(validate(""), Err(FetchImageError::InvalidUrl)));
}

#[test]
fn rejects_non_https_protocols() {
    for url in [
        "http://example.com/",
        "ftp://example.com/",
        "file:///etc/passwd",
    ] {
        assert!(matches!(validate(url), Err(FetchImageError::NonHttps)));
    }
}

#[test]
fn accepts_http_too_when_the_policy_allows_it() {
    assert!(validate_url(
        "http://f.divoom-gz.com/64_64.gif",
        FetchPolicy::HTTP_OR_HTTPS
    )
    .is_ok());
    assert!(validate_url("https://example.com/a.gif", FetchPolicy::HTTP_OR_HTTPS).is_ok());
    assert!(matches!(
        validate_url("ftp://example.com/a.gif", FetchPolicy::HTTP_OR_HTTPS),
        Err(FetchImageError::UnsupportedScheme)
    ));
}

#[test]
fn rejects_loopback_hosts() {
    assert!(matches!(
        validate("https://localhost/"),
        Err(FetchImageError::Localhost)
    ));
    assert!(matches!(
        validate("https://127.0.0.1/"),
        Err(FetchImageError::Loopback)
    ));
    assert!(matches!(
        validate("https://[::1]/"),
        Err(FetchImageError::Loopback)
    ));
}

#[test]
fn rejects_local_names_written_with_a_trailing_dot() {
    assert!(matches!(
        validate("https://localhost./"),
        Err(FetchImageError::Localhost)
    ));
    assert!(matches!(
        validate("https://device.local./"),
        Err(FetchImageError::Mdns)
    ));
}

#[test]
fn rejects_rfc1918_private_ips() {
    for url in [
        "https://10.0.0.1/",
        "https://192.168.1.1/",
        "https://172.16.0.1/",
    ] {
        assert!(matches!(validate(url), Err(FetchImageError::Private)));
    }
}

#[test]
fn rejects_ipv4_link_local() {
    assert!(matches!(
        validate("https://169.254.0.1/"),
        Err(FetchImageError::LinkLocal)
    ));
}

#[test]
fn rejects_reserved_ipv4_ranges() {
    for url in [
        "https://100.64.0.1/",
        "https://0.1.2.3/",
        "https://198.18.0.1/",
        "https://240.0.0.1/",
    ] {
        assert!(
            matches!(validate(url), Err(FetchImageError::ReservedIp { .. })),
            "{url}"
        );
    }
}

#[test]
fn rejects_mdns_local() {
    assert!(matches!(
        validate("https://device.local/"),
        Err(FetchImageError::Mdns)
    ));
}

#[test]
fn rejects_ipv4_mapped_ipv6() {
    assert!(matches!(
        validate("https://[::ffff:127.0.0.1]/"),
        Err(FetchImageError::Ipv4Mapped)
    ));
}

#[test]
fn rejects_ipv6_that_embeds_an_ipv4_address() {
    assert!(matches!(
        validate("https://[64:ff9b::c0a8:101]/"),
        Err(FetchImageError::ReservedIp { .. })
    ));
}

#[test]
fn rejects_ipv6_unique_local() {
    assert!(matches!(
        validate("https://[fc00::1]/"),
        Err(FetchImageError::Private)
    ));
}

#[test]
fn rejects_ipv6_link_local() {
    assert!(matches!(
        validate("https://[fe80::1]/"),
        Err(FetchImageError::LinkLocal)
    ));
}

#[test]
fn keeps_the_addresses_of_a_public_name() {
    let resolved = vec![socket("93.184.216.34"), socket("2606:2800:220:1::1")];

    assert_eq!(
        public_addresses(resolved.clone(), validate_public_address).unwrap(),
        resolved
    );
}

#[test]
fn refuses_a_name_when_one_of_its_addresses_is_local() {
    let resolved = vec![socket("93.184.216.34"), socket("192.168.1.10")];

    assert!(matches!(
        public_addresses(resolved, validate_public_address),
        Err(FetchImageError::Private)
    ));
    assert!(matches!(
        public_addresses(vec![socket("127.0.0.1")], validate_public_address),
        Err(FetchImageError::Loopback)
    ));
}

#[test]
fn refuses_a_name_without_address() {
    assert!(matches!(
        public_addresses(Vec::new(), validate_public_address),
        Err(FetchImageError::HttpRequest { .. })
    ));
}

#[test]
fn downloads_an_image() {
    let url = serve(vec![ok(b"GIF89a")]);

    assert_eq!(fetch(&url, MAX_BYTES).unwrap(), b"GIF89a");
}

#[test]
fn follows_a_redirect_to_the_image() {
    let target = serve(vec![ok(b"GIF89a")]);
    let url = serve(vec![redirect(&target)]);

    assert_eq!(fetch(&url, MAX_BYTES).unwrap(), b"GIF89a");
}

#[test]
fn refuses_a_redirect_to_the_local_network() {
    let url = serve(vec![redirect("http://192.168.1.1/admin")]);

    assert!(matches!(
        fetch(&url, MAX_BYTES),
        Err(FetchImageError::Private)
    ));
}

#[test]
fn refuses_a_redirect_to_another_scheme() {
    let url = serve(vec![redirect("file:///etc/passwd")]);

    assert!(matches!(
        fetch(&url, MAX_BYTES),
        Err(FetchImageError::UnsupportedScheme)
    ));
}

#[test]
fn gives_up_on_a_redirect_loop() {
    let target = "http://127.0.0.1:9/a.gif";
    let hops = (0..=MAX_REDIRECTS).fold(target.to_string(), |next, _| serve(vec![redirect(&next)]));

    assert!(matches!(
        fetch(&hops, MAX_BYTES),
        Err(FetchImageError::TooManyRedirects)
    ));
}

#[test]
fn refuses_an_image_announced_as_too_large() {
    let url = serve(vec![ok(&[0; 64])]);

    assert!(matches!(
        fetch(&url, 16),
        Err(FetchImageError::TooLarge {
            actual_bytes: 64,
            max_bytes: 16
        })
    ));
}

#[test]
fn stops_reading_an_image_that_grows_past_the_limit() {
    let url = serve(vec![ok_without_length(&[0; 64])]);

    assert!(matches!(
        fetch(&url, 16),
        Err(FetchImageError::TooLarge { max_bytes: 16, .. })
    ));
}

fn request(url: &str, policy: FetchPolicy) -> Result<reqwest::Response, FetchImageError> {
    tauri::async_runtime::block_on(call(&Url::parse(url).unwrap(), policy))
}

#[test]
fn refuses_a_name_that_resolves_to_the_local_machine() {
    let url = serve(Vec::new()).replace("127.0.0.1", "localhost");

    assert!(matches!(
        request(&url, FetchPolicy::HTTP_OR_HTTPS),
        Err(FetchImageError::Loopback)
    ));
}

#[test]
fn calls_a_name_on_the_addresses_it_was_validated_with() {
    let url = serve(vec![ok(b"GIF89a")]).replace("127.0.0.1", "localhost");

    assert!(request(&url, LOCAL_SERVER).unwrap().status().is_success());
}
