//! Opens a source (still or animated) and turns it into the 64 × 64 frames the
//! device plays (ADR-0005, ADR-0007).

use std::io::Cursor;

use image::codecs::gif::GifDecoder;
use image::codecs::jpeg::JpegDecoder;
use image::codecs::png::PngDecoder;
use image::codecs::webp::WebPDecoder;
use image::{
    AnimationDecoder, DynamicImage, Frame, ImageDecoder, ImageFormat, ImageResult, RgbaImage,
};
use serde::{Deserialize, Serialize};

/// Side of the device screen, in pixels.
pub const FRAME_SIDE: u32 = 64;
/// `Draw/SendHttpGif` takes fewer than 60 frames per animation.
pub const MAX_FRAMES: usize = 59;
/// Beyond this, a source is refused rather than decoded for minutes.
const MAX_SOURCE_FRAMES: usize = 2_000;
const MAX_DIMENSION: u32 = 10_000;
/// What browsers play when a frame declares no delay.
const DEFAULT_DELAY_MS: u32 = 100;
/// Shortest frame duration sent to the device; the documentation gives no lower bound.
const MIN_FRAME_DURATION_MS: u32 = 10;

#[derive(Debug, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum SourceError {
    /// Not a GIF, PNG, JPEG or WebP file.
    Unsupported,
    /// The file is damaged or cut short.
    Invalid,
    DimensionTooLarge,
    /// A file picked by the user is heavier than the 20 MB a source may weigh.
    FileTooLarge,
    TooManyFrames,
    /// A render was asked for before any source was opened.
    NoSource,
}

#[derive(Debug)]
pub struct SourceInfo {
    pub width: u32,
    pub height: u32,
    pub frame_count: usize,
    pub first_frame_png: Vec<u8>,
}

/// Where the source sits on the 64 × 64 screen: its top-left corner and its
/// scale, in screen pixels. Same convention as `extractCrop` on the front.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Crop {
    pub offset_x: f64,
    pub offset_y: f64,
    pub scale: f64,
}

#[derive(Debug)]
pub struct Animation {
    /// 64 × 64 RGB, 3 bytes per pixel, left to right then top to bottom.
    pub frames: Vec<Vec<u8>>,
    pub frame_duration_ms: u32,
    /// How many frames the source had before reduction.
    pub source_frame_count: usize,
}

/// Reads what the interface needs to show a source and let the user crop it.
pub fn open(bytes: &[u8]) -> Result<SourceInfo, SourceError> {
    let ((width, height), frames) = frames(bytes)?;
    let mut first = None;
    let mut frame_count = 0;
    for frame in frames {
        let frame = frame.map_err(|_| SourceError::Invalid)?;
        frame_count += 1;
        if frame_count > MAX_SOURCE_FRAMES {
            return Err(SourceError::TooManyFrames);
        }
        if first.is_none() {
            first = Some(frame.into_buffer());
        }
    }
    let first = first.ok_or(SourceError::Invalid)?;

    let mut png = Cursor::new(Vec::new());
    first
        .write_to(&mut png, ImageFormat::Png)
        .map_err(|_| SourceError::Invalid)?;
    Ok(SourceInfo {
        width,
        height,
        frame_count,
        first_frame_png: png.into_inner(),
    })
}

/// Applies one crop to every frame of the source, then keeps at most 59 of them.
pub fn render(bytes: &[u8], crop: Crop) -> Result<Animation, SourceError> {
    let (_, frames) = frames(bytes)?;
    let mut cropped = Vec::new();
    let mut delays_ms = Vec::new();
    for frame in frames {
        let frame = frame.map_err(|_| SourceError::Invalid)?;
        if cropped.len() == MAX_SOURCE_FRAMES {
            return Err(SourceError::TooManyFrames);
        }
        let (numerator, denominator) = frame.delay().numer_denom_ms();
        delays_ms.push(numerator / denominator.max(1));
        // Only the 64 × 64 result is kept: full-size frames would not fit in memory.
        cropped.push(crop_frame(frame.buffer(), crop));
    }
    if cropped.is_empty() {
        return Err(SourceError::Invalid);
    }

    let source_frame_count = cropped.len();
    let (kept, frame_duration_ms) = reduce(&delays_ms);
    let mut cropped: Vec<Option<Vec<u8>>> = cropped.into_iter().map(Some).collect();
    let frames = kept
        .into_iter()
        .filter_map(|index| cropped[index].take())
        .collect();
    Ok(Animation {
        frames,
        frame_duration_ms,
        source_frame_count,
    })
}

/// One source frame as the device shows it under this crop.
///
/// Nearest-neighbour, like the still path on the front (`extractCrop` draws
/// without smoothing); what the source does not cover, or leaves fully
/// transparent, is black.
pub fn crop_frame(frame: &RgbaImage, crop: Crop) -> Vec<u8> {
    let side = FRAME_SIDE as usize;
    let mut rgb = vec![0; side * side * 3];
    if crop.scale <= 0.0 {
        return rgb;
    }
    let (width, height) = (f64::from(frame.width()), f64::from(frame.height()));

    for y in 0..side {
        let source_y = (y as f64 + 0.5 - crop.offset_y) / crop.scale;
        if source_y < 0.0 || source_y >= height {
            continue;
        }
        for x in 0..side {
            let source_x = (x as f64 + 0.5 - crop.offset_x) / crop.scale;
            if source_x < 0.0 || source_x >= width {
                continue;
            }
            let [r, g, b, alpha] = frame.get_pixel(source_x as u32, source_y as u32).0;
            if alpha == 0 {
                continue;
            }
            let i = (y * side + x) * 3;
            rgb[i..i + 3].copy_from_slice(&[r, g, b]);
        }
    }
    rgb
}

/// Which frames to keep and how long each one lasts, so that at most 59 frames
/// play for the same total time as the source.
pub fn reduce(delays_ms: &[u32]) -> (Vec<usize>, u32) {
    let count = delays_ms.len();
    let kept_count = count.min(MAX_FRAMES);
    if kept_count == 0 {
        return (Vec::new(), DEFAULT_DELAY_MS);
    }
    let total_ms: u64 = delays_ms
        .iter()
        .map(|&delay| u64::from(if delay == 0 { DEFAULT_DELAY_MS } else { delay }))
        .sum();

    // Frames are dropped at regular intervals; the first one is always kept.
    let kept = (0..kept_count).map(|i| i * count / kept_count).collect();
    let duration = (total_ms as f64 / kept_count as f64).round() as u32;
    (kept, duration.max(MIN_FRAME_DURATION_MS))
}

type FrameIter<'a> = Box<dyn Iterator<Item = ImageResult<Frame>> + 'a>;

/// The frames of a source, decoded one at a time, with its dimensions.
fn frames(bytes: &[u8]) -> Result<((u32, u32), FrameIter<'_>), SourceError> {
    let format = image::guess_format(bytes).map_err(|_| SourceError::Unsupported)?;
    let invalid = |_| SourceError::Invalid;
    let reader = || Cursor::new(bytes);

    let (dimensions, frames): ((u32, u32), FrameIter<'_>) = match format {
        ImageFormat::Gif => {
            let decoder = GifDecoder::new(reader()).map_err(invalid)?;
            (decoder.dimensions(), Box::new(decoder.into_frames()))
        }
        ImageFormat::Png => {
            let decoder = PngDecoder::new(reader()).map_err(invalid)?;
            let dimensions = decoder.dimensions();
            if decoder.is_apng().map_err(invalid)? {
                let frames = decoder.apng().map_err(invalid)?.into_frames();
                (dimensions, Box::new(frames))
            } else {
                (dimensions, still(decoder))
            }
        }
        ImageFormat::WebP => {
            let decoder = WebPDecoder::new(reader()).map_err(invalid)?;
            let dimensions = decoder.dimensions();
            if decoder.has_animation() {
                (dimensions, Box::new(decoder.into_frames()))
            } else {
                (dimensions, still(decoder))
            }
        }
        ImageFormat::Jpeg => {
            let decoder = JpegDecoder::new(reader()).map_err(invalid)?;
            (decoder.dimensions(), still(decoder))
        }
        _ => return Err(SourceError::Unsupported),
    };

    if dimensions.0 > MAX_DIMENSION || dimensions.1 > MAX_DIMENSION {
        return Err(SourceError::DimensionTooLarge);
    }
    Ok((dimensions, frames))
}

/// A still image, seen as an animation of one frame.
fn still<'a>(decoder: impl ImageDecoder + 'a) -> FrameIter<'a> {
    Box::new(std::iter::once_with(move || {
        DynamicImage::from_decoder(decoder).map(|image| Frame::new(image.into_rgba8()))
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::codecs::gif::{GifEncoder, Repeat};
    use image::{Delay, Rgba};

    const RED: [u8; 4] = [255, 0, 0, 255];
    const GREEN: [u8; 4] = [0, 255, 0, 255];
    const BLUE: [u8; 4] = [0, 0, 255, 255];

    fn solid(side: u32, colour: [u8; 4]) -> RgbaImage {
        RgbaImage::from_pixel(side, side, Rgba(colour))
    }

    fn gif(colours: &[[u8; 4]], delay_ms: u32) -> Vec<u8> {
        let mut bytes = Vec::new();
        {
            let mut encoder = GifEncoder::new(&mut bytes);
            encoder.set_repeat(Repeat::Infinite).unwrap();
            let frames = colours.iter().map(|colour| {
                Frame::from_parts(
                    solid(4, *colour),
                    0,
                    0,
                    Delay::from_numer_denom_ms(delay_ms, 1),
                )
            });
            encoder.encode_frames(frames).unwrap();
        }
        bytes
    }

    fn png(image: &RgbaImage) -> Vec<u8> {
        let mut bytes = Cursor::new(Vec::new());
        image.write_to(&mut bytes, ImageFormat::Png).unwrap();
        bytes.into_inner()
    }

    fn pixel(frame: &[u8], x: usize, y: usize) -> [u8; 3] {
        let i = (y * FRAME_SIDE as usize + x) * 3;
        [frame[i], frame[i + 1], frame[i + 2]]
    }

    const FULL_SCREEN_4: Crop = Crop {
        offset_x: 0.0,
        offset_y: 0.0,
        scale: 16.0,
    };

    #[test]
    fn crops_a_frame_to_the_screen_size() {
        let mut source = solid(2, RED);
        source.put_pixel(1, 0, Rgba(GREEN));
        source.put_pixel(0, 1, Rgba(BLUE));

        let frame = crop_frame(
            &source,
            Crop {
                offset_x: 0.0,
                offset_y: 0.0,
                scale: 32.0,
            },
        );

        assert_eq!(frame.len(), 64 * 64 * 3);
        assert_eq!(pixel(&frame, 0, 0), [255, 0, 0]);
        assert_eq!(pixel(&frame, 31, 31), [255, 0, 0]);
        assert_eq!(pixel(&frame, 32, 0), [0, 255, 0]);
        assert_eq!(pixel(&frame, 0, 32), [0, 0, 255]);
        assert_eq!(pixel(&frame, 63, 63), [255, 0, 0]);
    }

    #[test]
    fn leaves_black_what_the_source_does_not_cover() {
        let frame = crop_frame(
            &solid(2, RED),
            Crop {
                offset_x: 16.0,
                offset_y: 0.0,
                scale: 16.0,
            },
        );

        assert_eq!(pixel(&frame, 15, 0), [0, 0, 0]);
        assert_eq!(pixel(&frame, 16, 0), [255, 0, 0]);
        assert_eq!(pixel(&frame, 47, 31), [255, 0, 0]);
        assert_eq!(pixel(&frame, 48, 0), [0, 0, 0]);
        assert_eq!(pixel(&frame, 16, 32), [0, 0, 0]);
    }

    #[test]
    fn shows_a_transparent_pixel_as_black() {
        let frame = crop_frame(&solid(1, [255, 255, 255, 0]), FULL_SCREEN_4);

        assert_eq!(pixel(&frame, 0, 0), [0, 0, 0]);
    }

    #[test]
    fn keeps_every_frame_of_a_short_animation() {
        let (kept, duration) = reduce(&[100, 200, 300]);

        assert_eq!(kept, vec![0, 1, 2]);
        assert_eq!(duration, 200);
    }

    #[test]
    fn reduces_a_long_animation_to_59_frames_of_the_same_total_time() {
        let delays = vec![50; 118];

        let (kept, duration) = reduce(&delays);

        assert_eq!(kept.len(), MAX_FRAMES);
        assert_eq!(kept[0], 0);
        assert_eq!(kept[1], 2);
        assert_eq!(kept[58], 116);
        assert_eq!(duration, 100);
    }

    #[test]
    fn keeps_the_total_time_within_one_frame_after_reduction() {
        let delays = vec![33; 100];
        let total: u32 = delays.iter().sum();

        let (kept, duration) = reduce(&delays);

        let played = kept.len() as u32 * duration;
        assert!(played.abs_diff(total) <= duration);
    }

    #[test]
    fn plays_a_frame_without_delay_at_the_usual_pace() {
        assert_eq!(reduce(&[0, 0]), (vec![0, 1], 100));
    }

    #[test]
    fn never_asks_the_device_for_a_frame_shorter_than_the_minimum() {
        assert_eq!(reduce(&[1, 1]).1, MIN_FRAME_DURATION_MS);
    }

    #[test]
    fn opens_an_animated_gif() {
        let info = open(&gif(&[RED, GREEN, BLUE], 100)).unwrap();

        assert_eq!((info.width, info.height), (4, 4));
        assert_eq!(info.frame_count, 3);
        let first = image::load_from_memory(&info.first_frame_png).unwrap();
        assert_eq!(first.to_rgba8().get_pixel(0, 0).0[0], 255);
    }

    #[test]
    fn opens_a_still_image_as_a_single_frame() {
        let info = open(&png(&solid(8, BLUE))).unwrap();

        assert_eq!((info.width, info.height), (8, 8));
        assert_eq!(info.frame_count, 1);
    }

    #[test]
    fn refuses_a_file_that_is_not_an_image() {
        assert_eq!(open(b"not an image").unwrap_err(), SourceError::Unsupported);
    }

    #[test]
    fn refuses_a_damaged_image() {
        let mut bytes = png(&solid(8, BLUE));
        bytes.truncate(40);

        assert_eq!(open(&bytes).unwrap_err(), SourceError::Invalid);
    }

    #[test]
    fn renders_every_frame_with_the_same_crop() {
        let animation = render(&gif(&[RED, GREEN, BLUE], 120), FULL_SCREEN_4).unwrap();

        assert_eq!(animation.frames.len(), 3);
        assert_eq!(animation.source_frame_count, 3);
        assert_eq!(animation.frame_duration_ms, 120);
        assert_eq!(pixel(&animation.frames[0], 63, 63), [255, 0, 0]);
        assert_eq!(pixel(&animation.frames[1], 0, 0), [0, 255, 0]);
        assert_eq!(pixel(&animation.frames[2], 32, 32), [0, 0, 255]);
    }

    #[test]
    fn reduces_a_long_source_while_rendering() {
        let colours: Vec<[u8; 4]> = (0..70).map(|i| [i as u8 * 3, 0, 0, 255]).collect();

        let animation = render(&gif(&colours, 60), FULL_SCREEN_4).unwrap();

        assert_eq!(animation.frames.len(), MAX_FRAMES);
        assert_eq!(animation.source_frame_count, 70);
        assert_eq!(animation.frame_duration_ms, 71);
    }
}
