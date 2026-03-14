# Divoom Pixoo-64 API Research

## 1. Official Divoom HTTP API

### Connection Model
- **Protocol:** HTTP POST over Wi-Fi (local network)
- **Base URL:** `http://<DEVICE_IP>:80/post`
- **All commands** are sent as JSON POST bodies to the single `/post` endpoint
- **Every request** includes a `"Command"` field that identifies the action
- **Responses** return JSON with a `"ReturnCode"` field (0 = success)

### Cloud Device Discovery
- **Endpoint:** `GET https://app.divoom-gz.com/Device/ReturnSameLANDevice`
- **Response:** JSON with device list containing `DeviceName`, `DeviceId`, `DevicePrivateIP`, `DeviceMac`, `Hardware`
- Example response: `{"ReturnCode":0,"DeviceList":[{"DeviceName":"Pixoo64","DeviceId":300095947,"DevicePrivateIP":"192.168.1.121","DeviceMac":"c8f09e35e898","Hardware":92}]}`

---

## 2. Complete API Command Reference

All commands are POST to `http://<IP>/post` with JSON body `{"Command": "<CommandName>", ...params}`.

### Channel Commands
| Command | Parameters | Description |
|---------|-----------|-------------|
| `Channel/GetIndex` | none | Get current channel index |
| `Channel/SetIndex` | `SelectIndex: int` | Set channel (0=Faces, 1=Cloud, 2=Visualizer, 3=Custom, 4=Black) |
| `Channel/GetClockInfo` | none | Get clock face info |
| `Channel/SetClockSelect` | `ClkId: int` | Select a clock face by ID |
| `Channel/SetCloudChannel` | `Index: int` | Select cloud channel content |
| `Channel/SetVisualizer` | `EqPosition: int` | Select visualizer style |
| `Channel/SetCustomPage` | `CustomPageIndex: int` | Select custom page |

### Device/System Commands
| Command | Parameters | Description |
|---------|-----------|-------------|
| `Channel/SetBrightness` | `Brightness: int (0-100)` | Set display brightness |
| `Channel/GetAllConf` | none | Get all device settings |
| `Device/SetScreenPowerState` | `OnOff: int (0 or 1)` | Turn screen on/off |
| `Device/SetBrightness` | `Brightness: int (0-100)` | Alt brightness control |
| `Device/GetSettings` | none | Get device configuration |
| `Device/GetTime` | none | Get device time |
| `Device/SetTime` | `Utc: int` | Set device time (UTC timestamp) |
| `Device/SetHighLightMode` | `Mode: int (0 or 1)` | Toggle highlight mode |
| `Device/SetHourMode` | `Mode: int (0=12h, 1=24h)` | Set 12/24 hour mode |
| `Device/SetMirrorMode` | `Mode: int (0 or 1)` | Enable display mirroring |
| `Device/SetRotationAngle` | `Mode: int (0=0, 1=90, 2=180, 3=270)` | Rotate display |
| `Device/SetTemperatureUnit` | `Mode: int (0=C, 1=F)` | Celsius or Fahrenheit |
| `Device/SetTimeZone` | `TimeZoneValue: string` | Set timezone |
| `Device/SetWeatherArea` | `Longitude: str, Latitude: str` | Set weather location |
| `Device/SetWhiteBalance` | `RValue: int, GValue: int, BValue: int` | Set white balance RGB |

### Image & Animation Commands (CORE)
| Command | Parameters | Description |
|---------|-----------|-------------|
| `Draw/SendHttpGif` | `PicNum: int, PicWidth: 64, PicOffset: int, PicID: int, PicSpeed: int, PicData: string` | Send image/animation frame(s) |
| `Draw/ResetHttpGifId` | none | Reset the animation ID counter |
| `Draw/GetHttpGifId` | none | Get next available GIF ID |
| `Draw/SendHttpText` | `TextId: int, x: int, y: int, dir: int, font: int, TextWidth: int, TextString: str, speed: int, color: str, align: int` | Display scrolling text |
| `Draw/ClearHttpText` | none | Clear all text overlays |
| `Draw/SendHttpItemList` | (complex) | Send display list with multiple items (text, time, temp) |

### Tool Commands
| Command | Parameters | Description |
|---------|-----------|-------------|
| `Tools/SetTimer` | `Minute: int, Second: int, Status: int` | Set countdown timer |
| `Tools/SetStopWatch` | `Status: int (0=stop, 1=start, 2=reset)` | Control stopwatch |
| `Tools/SetScoreBoard` | `BlueScore: int, RedScore: int` | Display scoreboard |
| `Tools/SetNoiseStatus` | `NoiseStatus: int (0 or 1)` | Toggle noise/sound meter |

### Buzzer Command
| Command | Parameters | Description |
|---------|-----------|-------------|
| `Device/PlayTFGif` | `FileType: int, FileName: str` | Play GIF from device storage |
| `Device/PlayBuzzer` | `ActiveTimeInCycle: int, OffTimeInCycle: int, PlayTotalTime: int` | Sound the buzzer |

---

## 3. Image/Animation Data Format (Critical Detail)

### Sending a Single Image
```json
{
  "Command": "Draw/SendHttpGif",
  "PicNum": 1,
  "PicWidth": 64,
  "PicOffset": 0,
  "PicID": 1,
  "PicSpeed": 100,
  "PicData": "<base64-encoded RGB data>"
}
```

### RGB Data Encoding
- **Resolution:** 64x64 pixels
- **Color format:** RGB24 (3 bytes per pixel, 8 bits per channel)
- **Total raw bytes per frame:** 64 x 64 x 3 = **12,288 bytes**
- **Encoding:** Raw RGB bytes -> **Base64 encoded string**
- Pixel order: left-to-right, top-to-bottom (row-major)

### Sending Multi-Frame Animation
- Each frame is sent as a separate `Draw/SendHttpGif` call
- `PicNum`: total number of frames in the animation
- `PicOffset`: frame index (0-based)
- `PicID`: unique animation ID (get via `Draw/GetHttpGifId`)
- `PicSpeed`: milliseconds per frame (e.g., 100 = 10fps)
- **Max frames:** ~40 per animation (device limitation)
- **Frame rate formula:** `PicSpeed = max(1, int(1000 / desired_fps))`

### Recommended Initialization Sequence
1. `Draw/ResetHttpGifId` - Reset the GIF ID counter
2. `Draw/ClearHttpText` - Clear any existing text
3. `Channel/SetIndex` with `SelectIndex: 4` - Switch to custom/API channel
4. `Draw/SendHttpGif` - Send your image data

### Text Display Parameters
```json
{
  "Command": "Draw/SendHttpText",
  "TextId": 1,
  "x": 0,
  "y": 0,
  "dir": 0,
  "font": 0,
  "TextWidth": 64,
  "TextString": "Hello",
  "speed": 100,
  "color": "#FFFFFF",
  "align": 1
}
```
- `dir`: scroll direction (0=left, 1=right)
- `font`: font index (multiple built-in fonts)
- `speed`: scroll speed in ms
- `color`: hex color string
- `align`: text alignment (1=left, 2=center, 3=right)

---

## 4. Technical Constraints

### Connection
- **Wi-Fi only** for HTTP API (no Bluetooth for Pixoo-64 REST control)
- Device runs HTTP server on **port 80**
- Local network access only (no cloud relay for commands)
- Firmware can become unresponsive after ~300 rapid consecutive updates (reconnection helps)

### Display
- **Resolution:** 64x64 pixels (4,096 total pixels)
- **Color depth:** 24-bit RGB (16.7 million colors)
- **Max animation frames:** ~40 per animation
- **Recommended FPS:** 15-25 for smooth playback, max 30
- **Rate limit:** Do not exceed ~30 messages per second

### Channels
- 0: Clock Faces
- 1: Cloud Channel (curated content from Divoom)
- 2: Visualizer (audio reactive)
- 3: Custom (user-uploaded content via app)
- 4: Black/API mode (used for programmatic control)

---

## 5. Community Projects

### Python Libraries
| Project | Stars | URL | Notes |
|---------|-------|-----|-------|
| **SomethingWithComputers/pixoo** | Major | https://github.com/SomethingWithComputers/pixoo | Most popular Python lib. Drawing primitives, GIF playback, simulator mode. Python 3.12+ |
| **4ch1m/pixoo-rest** | ~320 | https://github.com/4ch1m/pixoo-rest | RESTful wrapper around the Python pixoo lib. Adds HTTP endpoints for remote control |
| **tidyhf/Pixoo64-Advanced-Tools** | ~37 | https://github.com/tidyhf/Pixoo64-Advanced-Tools | Advanced: video player, live audio visualizer, GIF support |
| **ismaelit/Divoom_Pixoo64_PythonAPI** | ~1 | https://github.com/ismaelit/Divoom_Pixoo64_PythonAPI | Snippet collection for common tasks |
| **Grayda/pixoo_api** | ~9 | https://github.com/Grayda/pixoo_api | Simple Python module |
| **pf-tiger/Pixoo64Controller** | ~1 | https://github.com/pf-tiger/Pixoo64Controller | Python/MicroPython controller |
| **redphx/apixoo** | ~45 | https://github.com/redphx/apixoo | Interfaces with Divoom cloud/app server |

### JavaScript/TypeScript
| Project | Stars | URL | Notes |
|---------|-------|-----|-------|
| **adamkdean/pixoo-api** | ~27 | https://github.com/adamkdean/pixoo-api | Node.js wrapper with drawing primitives |
| **cyanheads/pixoo-toolkit** | New | https://github.com/cyanheads/pixoo-toolkit | TypeScript toolkit for Pixoo 16/32/64, animations, device control |
| **cyanheads/pixoo-mcp-server** | New | https://github.com/cyanheads/pixoo-mcp-server | MCP server for AI-driven pixel art/animations |
| **ArtichautDev/SpotiPixel** | ~4 | https://github.com/ArtichautDev/SpotiPixel | Spotify album art -> pixel art GIFs on Pixoo |

### Rust
| Project | Stars | URL | Notes |
|---------|-------|-----|-------|
| **r12f/divoom** | ~60 | https://github.com/r12f/divoom | Comprehensive Rust library with full API coverage, CLI tool included |

### C++/Embedded
| Project | Stars | URL | Notes |
|---------|-------|-----|-------|
| **fflorey/pixoo64rgb** | ~34 | https://github.com/fflorey/pixoo64rgb | ESP32/Arduino library for Pixoo-64 REST API |

### Home Automation
| Project | URL | Notes |
|---------|-----|-------|
| **AutoLotion/HomeAssistant-Pixoo64** | https://github.com/AutoLotion/HomeAssistant-Pixoo64 | Home Assistant integration configs |

---

## 6. Official Documentation

- **Divoom API docs (ShowDoc):** `https://doc.divoom-gz.com/web/#/12` -- Hosted on ShowDoc platform, renders via JavaScript (hard to scrape). Referenced by multiple community projects.
- **Divoom help center:** `https://www.divoom.com/apps/help-center` -- Has a "Developer/Open Source/SDK/API" section
- Community consensus: The official docs are sparse and incomplete. Most detailed knowledge comes from reverse engineering by community contributors.

---

## 7. Key Takeaways for Building a Desktop Manager App

1. **Single endpoint architecture:** Everything goes through `POST http://<IP>/post` with JSON
2. **Device discovery** is trivial via the cloud API or mDNS/network scanning
3. **Image rendering** requires converting images to raw RGB24 bytes, then base64-encoding
4. **Animation** is frame-by-frame: send each frame with incrementing PicOffset
5. **The Python `pixoo` library** (SomethingWithComputers) is the most battle-tested reference implementation
6. **The Rust `divoom` library** (r12f) has the most comprehensive API command coverage and documentation
7. **Channel 4** (or custom channel) must be selected before sending programmatic content
8. **Rate limiting:** Keep under 30 requests/second; consider reconnection for long sessions
