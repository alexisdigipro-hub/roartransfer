// Small pictures for the grid and large ones for RAW files, made by macOS itself:
// sips (ImageIO: JPEG, HEIC, every RAW the Mac knows) and qlmanage (Quick Look: videos).
use std::path::Path;
#[cfg(target_os = "macos")]
use std::process::{Command, Stdio};

pub const GRID: u32 = 480;
pub const PREVIEW: u32 = 3000;

// what the window can show as it is; the rest gets a JPEG preview
pub fn web_native(ext: &str) -> bool {
    matches!(ext, "jpg" | "jpeg" | "png" | "gif" | "webp" | "heic" | "heif" | "bmp" | "avif" | "tif" | "tiff")
}

#[cfg(target_os = "macos")]
fn sips(src: &Path, out: &Path, size: u32) -> bool {
    Command::new("/usr/bin/sips")
        .args(["-s", "format", "jpeg", "-s", "formatOptions", "80", "-Z", &size.to_string()])
        .arg(src)
        .arg("--out")
        .arg(out)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
        && out.exists()
}

#[cfg(target_os = "macos")]
fn quicklook(src: &Path, out: &Path, size: u32) -> bool {
    let tmp = out.with_extension("ql");
    let _ = std::fs::create_dir_all(&tmp);
    let ok = Command::new("/usr/bin/qlmanage")
        .args(["-t", "-s", &size.to_string(), "-o"])
        .arg(&tmp)
        .arg(src)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false);
    let made = std::fs::read_dir(&tmp)
        .ok()
        .and_then(|mut d| d.find_map(|e| e.ok()).map(|e| e.path()));
    let done = ok && made.map(|png| sips(&png, out, size)).unwrap_or(false);
    let _ = std::fs::remove_dir_all(&tmp);
    done
}

#[cfg(target_os = "macos")]
pub fn make(src: &Path, kind: &str, out: &Path, size: u32) -> bool {
    if kind == "video" {
        quicklook(src, out, size)
    } else {
        sips(src, out, size) || quicklook(src, out, size)
    }
}

#[cfg(not(target_os = "macos"))]
pub fn make(_src: &Path, _kind: &str, _out: &Path, _size: u32) -> bool {
    false
}
