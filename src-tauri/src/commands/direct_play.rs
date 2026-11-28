//! Checks a URL before the device is told to download it (ADR-0009).

use serde::Serialize;

use super::image::{open, FetchImageError, FetchPolicy};

/// Signature, then width and height on two bytes each.
const GIF_HEADER_BYTES: usize = 10;
/// Sides `Device/PlayTFGif` accepts, in pixels.
const PLAYABLE_SIDES: [u16; 3] = [16, 32, 64];

#[derive(Debug, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum GifCheckError {
    NotGif,
    WrongSize { width: u16, height: u16 },
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
    check(&url, FetchPolicy::HTTP_OR_HTTPS).await
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

async fn check(url: &str, policy: FetchPolicy) -> Result<(), DirectPlayError> {
    let mut response = open(url, policy).await.map_err(DirectPlayError::Fetch)?;
    if !response.status().is_success() {
        return Err(DirectPlayError::Fetch(FetchImageError::HttpStatus {
            status: response.status().as_u16(),
        }));
    }

    // Only the header is read: the device downloads the file itself.
    let mut header = Vec::new();
    while header.len() < GIF_HEADER_BYTES {
        let chunk = response.chunk().await.map_err(|error| {
            DirectPlayError::Fetch(FetchImageError::HttpRead {
                message: error.to_string(),
            })
        })?;
        match chunk {
            Some(chunk) => header.extend_from_slice(&chunk),
            None => break,
        }
    }
    gif_size(&header)
        .and_then(playable)
        .map_err(DirectPlayError::Gif)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::image::tests::server::{ok, redirect, serve, LOCAL_SERVER};

    fn gif_header(width: u16, height: u16) -> Vec<u8> {
        let mut bytes = b"GIF89a".to_vec();
        bytes.extend_from_slice(&width.to_le_bytes());
        bytes.extend_from_slice(&height.to_le_bytes());
        bytes
    }

    fn run(url: &str) -> Result<(), DirectPlayError> {
        tauri::async_runtime::block_on(check(url, LOCAL_SERVER))
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

        assert!(run(&url).is_ok());
    }

    #[test]
    fn refuses_a_reachable_file_that_is_not_a_gif() {
        let url = serve(vec![ok(b"<html>not a gif</html>")]);

        assert!(matches!(
            run(&url),
            Err(DirectPlayError::Gif(GifCheckError::NotGif))
        ));
    }

    #[test]
    fn follows_a_redirect_to_the_gif() {
        let target = serve(vec![ok(&gif_header(32, 32))]);
        let url = serve(vec![redirect(&target)]);

        assert!(run(&url).is_ok());
    }

    #[test]
    fn validates_the_address_a_redirect_leads_to() {
        let url = serve(vec![redirect("http://192.168.1.1/admin")]);

        assert!(matches!(
            run(&url),
            Err(DirectPlayError::Fetch(FetchImageError::Private))
        ));
    }
}
