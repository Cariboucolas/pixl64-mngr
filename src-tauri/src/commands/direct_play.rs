//! Checks a URL before the device is told to download it (ADR-0009).

use std::time::Duration;

use serde::Serialize;
use url::Url;

use super::image::{validate_public_host, FetchImageError};

const CHECK_TIMEOUT: Duration = Duration::from_secs(10);
const MAX_REDIRECTS: usize = 5;
/// Signature, then width and height on two bytes each.
const GIF_HEADER_BYTES: usize = 10;
/// Sides `Device/PlayTFGif` accepts, in pixels.
const PLAYABLE_SIDES: [u16; 3] = [16, 32, 64];

#[derive(Debug, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum GifCheckError {
    /// Neither `http` nor `https`.
    UnsupportedScheme,
    TooManyRedirects,
    NotGif,
    WrongSize {
        width: u16,
        height: u16,
    },
}

/// Why a URL cannot be played directly: it is refused, unreachable, or not a GIF the device plays.
#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum DirectPlayError {
    Fetch(FetchImageError),
    Gif(GifCheckError),
}

/// Downloads the start of the file and checks it is a GIF of a size the device plays.
#[tauri::command]
pub async fn direct_play_check(url: String) -> Result<(), DirectPlayError> {
    check(&url, validate_direct_play_url).await
}

fn validate_direct_play_url(raw: &str) -> Result<Url, DirectPlayError> {
    let url = Url::parse(raw).map_err(|_| DirectPlayError::Fetch(FetchImageError::InvalidUrl))?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err(DirectPlayError::Gif(GifCheckError::UnsupportedScheme));
    }
    validate_public_host(&url).map_err(DirectPlayError::Fetch)?;
    Ok(url)
}

/// Width and height declared by a GIF file, read from its first bytes.
fn gif_size(header: &[u8]) -> Result<(u16, u16), GifCheckError> {
    let is_gif = header.starts_with(b"GIF87a") || header.starts_with(b"GIF89a");
    if !is_gif || header.len() < GIF_HEADER_BYTES {
        return Err(GifCheckError::NotGif);
    }
    let width = u16::from_le_bytes([header[6], header[7]]);
    let height = u16::from_le_bytes([header[8], header[9]]);
    Ok((width, height))
}

fn playable((width, height): (u16, u16)) -> Result<(), GifCheckError> {
    if width == height && PLAYABLE_SIDES.contains(&width) {
        Ok(())
    } else {
        Err(GifCheckError::WrongSize { width, height })
    }
}

/// Redirects are followed by hand so that each address is validated before it is called.
async fn check(
    url: &str,
    validate: fn(&str) -> Result<Url, DirectPlayError>,
) -> Result<(), DirectPlayError> {
    let request_failed = |error: reqwest::Error| {
        DirectPlayError::Fetch(FetchImageError::HttpRequest {
            message: error.to_string(),
        })
    };
    let client = reqwest::Client::builder()
        .timeout(CHECK_TIMEOUT)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(request_failed)?;

    let mut current = validate(url)?;
    for _ in 0..=MAX_REDIRECTS {
        let mut response = client
            .get(current.clone())
            .send()
            .await
            .map_err(request_failed)?;

        if response.status().is_redirection() {
            let location = response
                .headers()
                .get(reqwest::header::LOCATION)
                .and_then(|value| value.to_str().ok())
                .and_then(|location| current.join(location).ok())
                .ok_or(DirectPlayError::Gif(GifCheckError::NotGif))?;
            current = validate(location.as_str())?;
            continue;
        }
        if !response.status().is_success() {
            return Err(DirectPlayError::Fetch(FetchImageError::HttpStatus {
                status: response.status().as_u16(),
            }));
        }

        // Only the header is read: the device downloads the file itself.
        let mut header = Vec::new();
        while header.len() < GIF_HEADER_BYTES {
            match response.chunk().await.map_err(request_failed)? {
                Some(chunk) => header.extend_from_slice(&chunk),
                None => break,
            }
        }
        return gif_size(&header)
            .and_then(playable)
            .map_err(DirectPlayError::Gif);
    }
    Err(DirectPlayError::Gif(GifCheckError::TooManyRedirects))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;

    fn gif_header(width: u16, height: u16) -> Vec<u8> {
        let mut bytes = b"GIF89a".to_vec();
        bytes.extend_from_slice(&width.to_le_bytes());
        bytes.extend_from_slice(&height.to_le_bytes());
        bytes
    }

    /// Serves canned HTTP responses on a local port, one per connection, and returns its URL.
    fn serve(responses: Vec<Vec<u8>>) -> String {
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

    fn ok(body: &[u8]) -> Vec<u8> {
        let mut response = format!(
            "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
            body.len()
        )
        .into_bytes();
        response.extend_from_slice(body);
        response
    }

    fn redirect(location: &str) -> Vec<u8> {
        format!("HTTP/1.1 302 Found\r\nLocation: {location}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").into_bytes()
    }

    /// The test server is on the loopback address, which the real validation refuses.
    fn any_http(raw: &str) -> Result<Url, DirectPlayError> {
        Url::parse(raw).map_err(|_| DirectPlayError::Fetch(FetchImageError::InvalidUrl))
    }

    fn only_first_hop(raw: &str) -> Result<Url, DirectPlayError> {
        if raw.contains("/a.gif") {
            any_http(raw)
        } else {
            Err(DirectPlayError::Fetch(FetchImageError::Private))
        }
    }

    fn run(
        url: &str,
        validate: fn(&str) -> Result<Url, DirectPlayError>,
    ) -> Result<(), DirectPlayError> {
        tauri::async_runtime::block_on(check(url, validate))
    }

    #[test]
    fn accepts_http_and_https_urls_on_public_hosts() {
        assert!(validate_direct_play_url("http://f.divoom-gz.com/64_64.gif").is_ok());
        assert!(validate_direct_play_url("https://example.com/a.gif").is_ok());
    }

    #[test]
    fn refuses_other_schemes() {
        assert!(matches!(
            validate_direct_play_url("ftp://example.com/a.gif"),
            Err(DirectPlayError::Gif(GifCheckError::UnsupportedScheme))
        ));
    }

    #[test]
    fn refuses_hosts_of_the_local_network() {
        for url in [
            "http://192.168.1.10/a.gif",
            "http://localhost/a.gif",
            "http://127.0.0.1/a.gif",
            "http://printer.local/a.gif",
        ] {
            assert!(
                matches!(
                    validate_direct_play_url(url),
                    Err(DirectPlayError::Fetch(_))
                ),
                "{url}"
            );
        }
    }

    #[test]
    fn reads_the_size_a_gif_declares() {
        assert_eq!(gif_size(&gif_header(64, 64)), Ok((64, 64)));
        assert_eq!(gif_size(b"GIF87a\x10\x00\x20\x00rest"), Ok((16, 32)));
    }

    #[test]
    fn refuses_what_is_not_a_gif() {
        assert_eq!(
            gif_size(b"\x89PNG\r\n\x1a\n\0\0"),
            Err(GifCheckError::NotGif)
        );
        assert_eq!(gif_size(b"GIF89a"), Err(GifCheckError::NotGif));
    }

    #[test]
    fn plays_only_square_gifs_of_a_device_size() {
        for side in PLAYABLE_SIDES {
            assert_eq!(playable((side, side)), Ok(()));
        }
        assert_eq!(
            playable((64, 32)),
            Err(GifCheckError::WrongSize {
                width: 64,
                height: 32
            })
        );
        assert_eq!(
            playable((128, 128)),
            Err(GifCheckError::WrongSize {
                width: 128,
                height: 128
            })
        );
    }

    #[test]
    fn accepts_a_reachable_gif_of_the_right_size() {
        let url = serve(vec![ok(&gif_header(64, 64))]);

        assert!(run(&url, any_http).is_ok());
    }

    #[test]
    fn refuses_a_reachable_file_that_is_not_a_gif() {
        let url = serve(vec![ok(b"<html>not a gif</html>")]);

        assert!(matches!(
            run(&url, any_http),
            Err(DirectPlayError::Gif(GifCheckError::NotGif))
        ));
    }

    #[test]
    fn follows_a_redirect_to_the_gif() {
        let target = serve(vec![ok(&gif_header(32, 32))]);
        let url = serve(vec![redirect(&target)]);

        assert!(run(&url, any_http).is_ok());
    }

    #[test]
    fn validates_the_address_a_redirect_leads_to() {
        let url = serve(vec![redirect("http://192.168.1.1/admin")]);

        assert!(matches!(
            run(&url, only_first_hop),
            Err(DirectPlayError::Fetch(FetchImageError::Private))
        ));
    }

    #[test]
    fn gives_up_on_a_redirect_loop() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/a.gif", listener.local_addr().unwrap());
        let looping = redirect(&url);
        std::thread::spawn(move || {
            for _ in 0..=MAX_REDIRECTS + 1 {
                if let Ok((mut stream, _)) = listener.accept() {
                    let _ = stream.read(&mut [0; 2048]);
                    let _ = stream.write_all(&looping);
                }
            }
        });

        assert!(matches!(
            run(&url, any_http),
            Err(DirectPlayError::Gif(GifCheckError::TooManyRedirects))
        ));
    }
}
