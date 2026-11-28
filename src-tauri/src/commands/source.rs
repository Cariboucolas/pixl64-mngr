use std::sync::{Arc, Mutex};

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::Serialize;
use tauri::ipc::{InvokeBody, Request};
use tauri::State;

use super::image::{download, FetchImageError, MAX_BYTES};
use crate::source::{self, Crop, SourceError};

/// The source being cropped. Its bytes are kept, not its decoded frames (ADR-0007).
#[derive(Default)]
pub struct OpenSource(Mutex<Option<Arc<[u8]>>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedSource {
    width: u32,
    height: u32,
    frame_count: usize,
    /// PNG, Base64.
    first_frame: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderedAnimation {
    /// 64 × 64 RGB, Base64: the `PicData` of `Draw/SendHttpGif`.
    frames: Vec<String>,
    frame_duration_ms: u32,
    source_frame_count: usize,
}

/// Why a URL could not be opened as a source: the download failed, or what it brought is not usable.
#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum OpenUrlError {
    Fetch(FetchImageError),
    Source(SourceError),
}

/// Opens a file picked by the user; its bytes are the raw body of the request.
#[tauri::command]
pub async fn source_open_file(
    request: Request<'_>,
    opened: State<'_, OpenSource>,
) -> Result<OpenedSource, SourceError> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(SourceError::Unsupported);
    };
    if bytes.len() > MAX_BYTES {
        return Err(SourceError::FileTooLarge);
    }
    open(bytes.as_slice().into(), &opened).await
}

#[tauri::command]
pub async fn source_open_url(
    url: String,
    opened: State<'_, OpenSource>,
) -> Result<OpenedSource, OpenUrlError> {
    let bytes = download(&url).await.map_err(OpenUrlError::Fetch)?;
    open(bytes.into(), &opened)
        .await
        .map_err(OpenUrlError::Source)
}

/// Renders the open source as the frames the device will play, under one crop.
#[tauri::command]
pub async fn source_render(
    crop: Crop,
    opened: State<'_, OpenSource>,
) -> Result<RenderedAnimation, SourceError> {
    let bytes = opened
        .0
        .lock()
        .map_err(|_| SourceError::NoSource)?
        .clone()
        .ok_or(SourceError::NoSource)?;

    let animation = blocking(move || source::render(&bytes, crop)).await?;
    Ok(RenderedAnimation {
        frames: animation
            .frames
            .iter()
            .map(|frame| BASE64.encode(frame))
            .collect(),
        frame_duration_ms: animation.frame_duration_ms,
        source_frame_count: animation.source_frame_count,
    })
}

async fn open(bytes: Arc<[u8]>, opened: &OpenSource) -> Result<OpenedSource, SourceError> {
    let decoded = bytes.clone();
    let info = blocking(move || source::open(&decoded)).await?;
    *opened.0.lock().map_err(|_| SourceError::Invalid)? = Some(bytes);
    Ok(OpenedSource {
        width: info.width,
        height: info.height,
        frame_count: info.frame_count,
        first_frame: BASE64.encode(info.first_frame_png),
    })
}

/// Decoding can take seconds: it must not hold up the other commands.
async fn blocking<T: Send + 'static>(
    work: impl FnOnce() -> Result<T, SourceError> + Send + 'static,
) -> Result<T, SourceError> {
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|_| SourceError::Invalid)?
}
