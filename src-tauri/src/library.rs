//! The local library: an index and one file of raw frames per item (ADR-0008).

use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::{Deserialize, Serialize};

use crate::source::{self, Crop, FRAME_SIDE, MAX_FRAMES};

/// Bytes of one 64 × 64 RGB frame.
pub const FRAME_BYTES: usize = (FRAME_SIDE * FRAME_SIDE * 3) as usize;
const FORMAT_VERSION: u32 = 1;
const INDEX_FILE: &str = "index.json";
const MAX_ID_LENGTH: usize = 64;
/// A still has no pace; the device still wants one.
const STILL_DURATION_MS: u32 = 100;

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ItemKind {
    Still,
    Animation,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryItem {
    pub id: String,
    pub kind: ItemKind,
    pub label: Option<String>,
    /// Milliseconds since the Unix epoch.
    pub created_at: u64,
    pub frame_count: usize,
    pub frame_duration_ms: u32,
}

#[derive(Debug, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum LibraryError {
    /// The disk refused a read or a write.
    Io {
        message: String,
    },
    /// The index or an item file is not what this application wrote.
    Corrupt,
    NotFound,
    /// Not 1 to 59 frames of 64 × 64 RGB.
    InvalidFrames,
}

/// What became of the favourites kept before the library had its own format.
#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Migration {
    pub migrated: usize,
    /// Favourites that could not be read; they stay in the old file.
    pub failed: usize,
}

#[derive(Serialize, Deserialize)]
struct Index {
    version: u32,
    items: Vec<LibraryItem>,
}

pub struct Library {
    dir: PathBuf,
}

/// One entry of the old single-file format (`favorites.json`).
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Favorite {
    id: String,
    data_url: String,
    created_at: u64,
    label: Option<String>,
}

#[derive(Deserialize)]
struct Favorites {
    #[serde(default)]
    favorites: Vec<serde_json::Value>,
}

impl Library {
    pub fn new(dir: PathBuf) -> Self {
        Self { dir }
    }

    /// Items, most recent first.
    pub fn list(&self) -> Result<Vec<LibraryItem>, LibraryError> {
        Ok(self
            .read_index()?
            .map(|index| index.items)
            .unwrap_or_default())
    }

    pub fn add(
        &self,
        label: Option<String>,
        frame_duration_ms: u32,
        frames: &[Vec<u8>],
        now_ms: u64,
    ) -> Result<LibraryItem, LibraryError> {
        let mut items = self.list()?;
        let id = (0u32..)
            .map(|n| format!("{now_ms:x}-{n:x}"))
            .find(|id| items.iter().all(|item| &item.id != id))
            .ok_or(LibraryError::Corrupt)?;
        let item = self.write_item(id, label, now_ms, frame_duration_ms, frames)?;

        items.insert(0, item.clone());
        self.write_index(items)?;
        Ok(item)
    }

    pub fn frames(&self, id: &str) -> Result<Vec<Vec<u8>>, LibraryError> {
        let bytes = self.read_item(id)?;
        Ok(bytes.chunks(FRAME_BYTES).map(<[u8]>::to_vec).collect())
    }

    pub fn first_frame(&self, id: &str) -> Result<Vec<u8>, LibraryError> {
        let mut bytes = self.read_item(id)?;
        bytes.truncate(FRAME_BYTES);
        Ok(bytes)
    }

    pub fn remove(&self, id: &str) -> Result<(), LibraryError> {
        let path = self.item_path(id)?;
        let mut items = self.list()?;
        let before = items.len();
        items.retain(|item| item.id != id);
        if items.len() == before {
            return Err(LibraryError::NotFound);
        }
        // The index first: a file left behind is harmless, an entry without its file is not.
        self.write_index(items)?;
        match fs::remove_file(path) {
            Err(error) if error.kind() != ErrorKind::NotFound => Err(io(error)),
            _ => Ok(()),
        }
    }

    /// Brings in the favourites of the old single-file format, once: only when
    /// the library has no index yet. The old file is left as it is.
    pub fn migrate_favorites(&self, favorites: &Path) -> Result<Option<Migration>, LibraryError> {
        if self.index_path().exists() {
            return Ok(None);
        }
        let content = match fs::read_to_string(favorites) {
            Ok(content) => content,
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
            Err(error) => return Err(io(error)),
        };
        let old: Favorites = serde_json::from_str(&content).map_err(|_| LibraryError::Corrupt)?;

        let mut items = Vec::new();
        let mut failed = 0;
        for (position, entry) in old.favorites.into_iter().enumerate() {
            match self.migrate_favorite(entry, position, &items) {
                Some(item) => items.push(item),
                None => failed += 1,
            }
        }
        let migrated = items.len();
        self.write_index(items)?;
        Ok(Some(Migration { migrated, failed }))
    }

    fn migrate_favorite(
        &self,
        entry: serde_json::Value,
        position: usize,
        migrated: &[LibraryItem],
    ) -> Option<LibraryItem> {
        let favorite: Favorite = serde_json::from_value(entry).ok()?;
        let (_, encoded) = favorite.data_url.split_once("base64,")?;
        let image = image::load_from_memory(&BASE64.decode(encoded).ok()?)
            .ok()?
            .into_rgba8();
        // Favourites were saved at 64 × 64; anything else is fitted to the screen.
        let scale = f64::from(FRAME_SIDE) / f64::from(image.width().max(image.height()).max(1));
        let frame = source::crop_frame(
            &image,
            Crop {
                offset_x: 0.0,
                offset_y: 0.0,
                scale,
            },
        );
        let taken = |id: &str| migrated.iter().any(|item| item.id == id);
        let id = if is_valid_id(&favorite.id) && !taken(&favorite.id) {
            favorite.id
        } else {
            format!("{:x}-{position:x}", favorite.created_at)
        };
        self.write_item(
            id,
            favorite.label,
            favorite.created_at,
            STILL_DURATION_MS,
            &[frame],
        )
        .ok()
    }

    fn write_item(
        &self,
        id: String,
        label: Option<String>,
        created_at: u64,
        frame_duration_ms: u32,
        frames: &[Vec<u8>],
    ) -> Result<LibraryItem, LibraryError> {
        let playable = (1..=MAX_FRAMES).contains(&frames.len())
            && frames.iter().all(|frame| frame.len() == FRAME_BYTES);
        if !playable {
            return Err(LibraryError::InvalidFrames);
        }
        write_atomically(&self.item_path(&id)?, &frames.concat())?;
        Ok(LibraryItem {
            id,
            kind: if frames.len() == 1 {
                ItemKind::Still
            } else {
                ItemKind::Animation
            },
            label: label.filter(|label| !label.trim().is_empty()),
            created_at,
            frame_count: frames.len(),
            frame_duration_ms,
        })
    }

    fn read_item(&self, id: &str) -> Result<Vec<u8>, LibraryError> {
        let bytes = match fs::read(self.item_path(id)?) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == ErrorKind::NotFound => {
                return Err(LibraryError::NotFound)
            }
            Err(error) => return Err(io(error)),
        };
        if bytes.is_empty() || bytes.len() % FRAME_BYTES != 0 {
            return Err(LibraryError::Corrupt);
        }
        Ok(bytes)
    }

    fn read_index(&self) -> Result<Option<Index>, LibraryError> {
        let content = match fs::read_to_string(self.index_path()) {
            Ok(content) => content,
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
            Err(error) => return Err(io(error)),
        };
        serde_json::from_str(&content)
            .map(Some)
            .map_err(|_| LibraryError::Corrupt)
    }

    fn write_index(&self, mut items: Vec<LibraryItem>) -> Result<(), LibraryError> {
        // Stable: items of the same date keep the order they were added in.
        items.sort_by_key(|item| std::cmp::Reverse(item.created_at));
        let index = Index {
            version: FORMAT_VERSION,
            items,
        };
        let content = serde_json::to_vec_pretty(&index).map_err(|_| LibraryError::Corrupt)?;
        write_atomically(&self.index_path(), &content)
    }

    fn index_path(&self) -> PathBuf {
        self.dir.join(INDEX_FILE)
    }

    /// The identifier becomes a file name: only the library's own shape is accepted.
    fn item_path(&self, id: &str) -> Result<PathBuf, LibraryError> {
        if !is_valid_id(id) {
            return Err(LibraryError::NotFound);
        }
        Ok(self.dir.join(format!("{id}.bin")))
    }
}

fn is_valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_ID_LENGTH
        && id.chars().all(|c| c.is_ascii_hexdigit() || c == '-')
}

/// Writes beside the target, then renames: a crash never leaves half a file.
fn write_atomically(path: &Path, content: &[u8]) -> Result<(), LibraryError> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(io)?;
    }
    let temporary = path.with_extension("tmp");
    fs::write(&temporary, content).map_err(io)?;
    fs::rename(&temporary, path).map_err(io)
}

fn io(error: std::io::Error) -> LibraryError {
    LibraryError::Io {
        message: error.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageFormat, Rgba, RgbaImage};
    use std::io::Cursor;
    use std::sync::atomic::{AtomicU32, Ordering};

    static NEXT_DIR: AtomicU32 = AtomicU32::new(0);

    /// A fresh directory per test, removed when the test ends.
    struct TempDir(PathBuf);

    impl TempDir {
        fn new() -> Self {
            let dir = std::env::temp_dir().join(format!(
                "pixl64-library-test-{}-{}",
                std::process::id(),
                NEXT_DIR.fetch_add(1, Ordering::SeqCst)
            ));
            fs::create_dir_all(&dir).unwrap();
            Self(dir)
        }

        fn library(&self) -> Library {
            Library::new(self.0.join("library"))
        }
    }

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    fn frame(value: u8) -> Vec<u8> {
        vec![value; FRAME_BYTES]
    }

    fn png_data_url(side: u32, colour: [u8; 4]) -> String {
        let mut png = Cursor::new(Vec::new());
        RgbaImage::from_pixel(side, side, Rgba(colour))
            .write_to(&mut png, ImageFormat::Png)
            .unwrap();
        format!("data:image/png;base64,{}", BASE64.encode(png.into_inner()))
    }

    #[test]
    fn is_empty_before_anything_is_saved() {
        let temp = TempDir::new();

        assert_eq!(temp.library().list().unwrap(), vec![]);
    }

    #[test]
    fn saves_a_still_and_gives_it_back() {
        let temp = TempDir::new();
        let library = temp.library();

        let item = library
            .add(Some("Logo".into()), 100, &[frame(7)], 1_000)
            .unwrap();

        assert_eq!(item.kind, ItemKind::Still);
        assert_eq!(item.label.as_deref(), Some("Logo"));
        assert_eq!(item.created_at, 1_000);
        assert_eq!(item.frame_count, 1);
        assert_eq!(library.list().unwrap(), vec![item.clone()]);
        assert_eq!(library.frames(&item.id).unwrap(), vec![frame(7)]);
    }

    #[test]
    fn saves_an_animation_with_its_pace() {
        let temp = TempDir::new();
        let library = temp.library();
        let frames = vec![frame(1), frame(2), frame(3)];

        let item = library.add(None, 80, &frames, 1_000).unwrap();

        assert_eq!(item.kind, ItemKind::Animation);
        assert_eq!(item.frame_count, 3);
        assert_eq!(item.frame_duration_ms, 80);
        assert_eq!(library.frames(&item.id).unwrap(), frames);
        assert_eq!(library.first_frame(&item.id).unwrap(), frame(1));
    }

    #[test]
    fn lists_the_most_recent_item_first_and_keeps_ids_apart() {
        let temp = TempDir::new();
        let library = temp.library();

        let older = library.add(None, 100, &[frame(1)], 1_000).unwrap();
        let newer = library.add(None, 100, &[frame(2)], 1_000).unwrap();

        assert_ne!(older.id, newer.id);
        assert_eq!(library.list().unwrap(), vec![newer, older]);
    }

    #[test]
    fn removes_an_item_and_its_file() {
        let temp = TempDir::new();
        let library = temp.library();
        let kept = library.add(None, 100, &[frame(1)], 1_000).unwrap();
        let removed = library.add(None, 100, &[frame(2)], 2_000).unwrap();

        library.remove(&removed.id).unwrap();

        assert_eq!(library.list().unwrap(), vec![kept]);
        assert_eq!(
            library.frames(&removed.id).unwrap_err(),
            LibraryError::NotFound
        );
        let files = fs::read_dir(temp.0.join("library")).unwrap().count();
        assert_eq!(files, 2, "the index and the kept item");
    }

    #[test]
    fn refuses_frames_the_device_cannot_play() {
        let temp = TempDir::new();
        let library = temp.library();

        for frames in [vec![], vec![vec![0; 10]], vec![frame(0); MAX_FRAMES + 1]] {
            assert_eq!(
                library.add(None, 100, &frames, 1_000).unwrap_err(),
                LibraryError::InvalidFrames
            );
        }
        assert_eq!(library.list().unwrap(), vec![]);
    }

    #[test]
    fn refuses_an_identifier_that_is_not_one_of_its_own() {
        let temp = TempDir::new();
        let library = temp.library();
        library.add(None, 100, &[frame(1)], 1_000).unwrap();

        for id in ["../index", "", "a/b", "index.json", &"a".repeat(65)] {
            assert_eq!(library.frames(id).unwrap_err(), LibraryError::NotFound);
            assert_eq!(library.remove(id).unwrap_err(), LibraryError::NotFound);
        }
    }

    #[test]
    fn reports_a_damaged_index() {
        let temp = TempDir::new();
        fs::create_dir_all(temp.0.join("library")).unwrap();
        fs::write(temp.0.join("library").join(INDEX_FILE), "{ not json").unwrap();

        assert_eq!(temp.library().list().unwrap_err(), LibraryError::Corrupt);
    }

    #[test]
    fn migrates_every_favourite_and_leaves_the_old_file_alone() {
        let temp = TempDir::new();
        let favorites = temp.0.join("favorites.json");
        let content = serde_json::json!({ "favorites": [
            { "id": "0f8fad5b-d9cb-469f-a165-70867728950e", "dataUrl": png_data_url(64, [255, 0, 0, 255]), "createdAt": 2_000, "label": "Rouge" },
            { "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "dataUrl": png_data_url(32, [0, 0, 255, 255]), "createdAt": 1_000 },
        ]})
        .to_string();
        fs::write(&favorites, &content).unwrap();
        let library = temp.library();

        let migration = library.migrate_favorites(&favorites).unwrap();

        assert_eq!(
            migration,
            Some(Migration {
                migrated: 2,
                failed: 0
            })
        );
        let items = library.list().unwrap();
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].id, "0f8fad5b-d9cb-469f-a165-70867728950e");
        assert_eq!(items[0].label.as_deref(), Some("Rouge"));
        assert_eq!(items[0].created_at, 2_000);
        assert_eq!(items[0].kind, ItemKind::Still);
        assert_eq!(
            &library.first_frame(&items[0].id).unwrap()[..3],
            [255, 0, 0]
        );
        let scaled = library.first_frame(&items[1].id).unwrap();
        assert_eq!(scaled.len(), FRAME_BYTES);
        assert_eq!(&scaled[FRAME_BYTES - 3..], [0, 0, 255]);
        assert_eq!(fs::read_to_string(&favorites).unwrap(), content);
    }

    #[test]
    fn counts_the_favourites_it_could_not_read() {
        let temp = TempDir::new();
        let favorites = temp.0.join("favorites.json");
        let content = serde_json::json!({ "favorites": [
            { "id": "0f8fad5b-d9cb-469f-a165-70867728950e", "dataUrl": "data:image/png;base64,AAAA", "createdAt": 2_000 },
            { "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "dataUrl": png_data_url(64, [0, 255, 0, 255]), "createdAt": 1_000 },
        ]})
        .to_string();
        fs::write(&favorites, content).unwrap();
        let library = temp.library();

        let migration = library.migrate_favorites(&favorites).unwrap();

        assert_eq!(
            migration,
            Some(Migration {
                migrated: 1,
                failed: 1
            })
        );
        assert_eq!(library.list().unwrap().len(), 1);
    }

    #[test]
    fn migrates_only_once() {
        let temp = TempDir::new();
        let favorites = temp.0.join("favorites.json");
        let content = serde_json::json!({ "favorites": [
            { "id": "0f8fad5b-d9cb-469f-a165-70867728950e", "dataUrl": png_data_url(64, [255, 0, 0, 255]), "createdAt": 2_000 },
        ]})
        .to_string();
        fs::write(&favorites, content).unwrap();
        let library = temp.library();
        library.migrate_favorites(&favorites).unwrap();
        let id = library.list().unwrap()[0].id.clone();
        library.remove(&id).unwrap();

        assert_eq!(library.migrate_favorites(&favorites).unwrap(), None);
        assert_eq!(library.list().unwrap(), vec![]);
    }

    #[test]
    fn has_nothing_to_migrate_without_an_old_file() {
        let temp = TempDir::new();

        let migration = temp
            .library()
            .migrate_favorites(&temp.0.join("favorites.json"))
            .unwrap();

        assert_eq!(migration, None);
    }
}
