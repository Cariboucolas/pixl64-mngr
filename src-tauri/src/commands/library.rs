use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::Serialize;
use tauri::State;

use crate::library::{Library, LibraryError, LibraryItem, Migration};

/// The library on disk and the old favourites file it may still have to bring in.
pub struct LibraryState {
    /// Locked for each command: two writes must not rebuild the index at once.
    library: Mutex<Library>,
    favorites: PathBuf,
}

impl LibraryState {
    /// `data_dir` is the application's data directory, where the Store plugin kept `favorites.json`.
    pub fn new(data_dir: PathBuf) -> Self {
        Self {
            library: Mutex::new(Library::new(data_dir.join("library"))),
            favorites: data_dir.join("favorites.json"),
        }
    }

    fn with<T>(
        &self,
        work: impl FnOnce(&Library) -> Result<T, LibraryError>,
    ) -> Result<T, LibraryError> {
        let library = self.library.lock().map_err(|_| LibraryError::Corrupt)?;
        work(&library)
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Listing {
    items: Vec<LibraryItem>,
    /// Present on the launch that brought the old favourites in.
    migration: Option<Migration>,
}

#[tauri::command(async)]
pub fn library_list(state: State<'_, LibraryState>) -> Result<Listing, LibraryError> {
    state.with(|library| {
        let migration = library.migrate_favorites(&state.favorites)?;
        Ok(Listing {
            items: library.list()?,
            migration,
        })
    })
}

/// `frames` are 64 × 64 RGB, Base64, as sent to the device.
#[tauri::command(async)]
pub fn library_add(
    label: Option<String>,
    frame_duration_ms: u32,
    frames: Vec<String>,
    state: State<'_, LibraryState>,
) -> Result<LibraryItem, LibraryError> {
    let frames = frames
        .iter()
        .map(|frame| BASE64.decode(frame))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| LibraryError::InvalidFrames)?;
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |since| since.as_millis() as u64);
    state.with(|library| library.add(label, frame_duration_ms, &frames, now_ms))
}

#[tauri::command(async)]
pub fn library_first_frame(
    id: String,
    state: State<'_, LibraryState>,
) -> Result<String, LibraryError> {
    state.with(|library| Ok(BASE64.encode(library.first_frame(&id)?)))
}

#[tauri::command(async)]
pub fn library_frames(
    id: String,
    state: State<'_, LibraryState>,
) -> Result<Vec<String>, LibraryError> {
    state.with(|library| {
        let frames = library.frames(&id)?;
        Ok(frames.iter().map(|frame| BASE64.encode(frame)).collect())
    })
}

#[tauri::command(async)]
pub fn library_remove(id: String, state: State<'_, LibraryState>) -> Result<(), LibraryError> {
    state.with(|library| library.remove(&id))
}
