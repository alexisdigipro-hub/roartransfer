// What a file says about itself: EXIF for photos, the moov box for MP4/MOV videos.
use exif::{In, Reader, Tag, Value};
use std::fs::File;
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::path::Path;

#[derive(Default, Debug, Clone)]
pub struct Meta {
    pub taken: Option<String>,
    pub width: Option<i64>,
    pub height: Option<i64>,
    pub camera: Option<String>,
    pub lens: Option<String>,
    pub iso: Option<i64>,
    pub fnum: Option<f64>,
    pub exposure: Option<String>,
    pub focal: Option<f64>,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
    pub duration: Option<f64>,
}

fn ascii(e: &exif::Exif, tag: Tag) -> Option<String> {
    let f = e.get_field(tag, In::PRIMARY)?;
    match &f.value {
        Value::Ascii(v) => {
            let s: String = v
                .iter()
                .map(|b| String::from_utf8_lossy(b).to_string())
                .collect::<Vec<_>>()
                .join(" ");
            let s = s.trim_matches(|c: char| c == '\0' || c.is_whitespace()).to_string();
            if s.is_empty() { None } else { Some(s) }
        }
        _ => None,
    }
}

fn rational(e: &exif::Exif, tag: Tag) -> Option<f64> {
    let f = e.get_field(tag, In::PRIMARY)?;
    match &f.value {
        Value::Rational(v) if !v.is_empty() && v[0].denom != 0 => Some(v[0].to_f64()),
        _ => None,
    }
}

fn uint(e: &exif::Exif, tag: Tag) -> Option<i64> {
    e.get_field(tag, In::PRIMARY)?.value.get_uint(0).map(|v| v as i64)
}

fn gps(e: &exif::Exif, tag: Tag, rtag: Tag) -> Option<f64> {
    let f = e.get_field(tag, In::PRIMARY)?;
    let v = match &f.value {
        Value::Rational(v) if v.len() >= 3 => v,
        _ => return None,
    };
    if v.iter().any(|r| r.denom == 0) {
        return None;
    }
    let deg = v[0].to_f64() + v[1].to_f64() / 60.0 + v[2].to_f64() / 3600.0;
    let r = ascii(e, rtag).unwrap_or_default();
    Some(if r.starts_with('S') || r.starts_with('W') { -deg } else { deg })
}

// "2024:05:01 12:03:44" -> "2024-05-01T12:03:44"
pub fn exif_date(s: &str) -> Option<String> {
    let s = s.trim();
    if s.len() < 19 {
        return None;
    }
    let b = s.as_bytes();
    let digits = [0, 1, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18];
    if !digits.iter().all(|&i| b[i].is_ascii_digit()) {
        return None;
    }
    if &s[0..4] == "0000" {
        return None;
    }
    Some(format!("{}-{}-{}T{}:{}:{}", &s[0..4], &s[5..7], &s[8..10], &s[11..13], &s[14..16], &s[17..19]))
}

pub fn photo(path: &Path) -> Meta {
    let mut m = Meta::default();
    let Ok(file) = File::open(path) else { return m };
    let mut r = BufReader::new(file);
    let Ok(e) = Reader::new().read_from_container(&mut r) else { return m };
    m.taken = ascii(&e, Tag::DateTimeOriginal)
        .or_else(|| ascii(&e, Tag::DateTimeDigitized))
        .or_else(|| ascii(&e, Tag::DateTime))
        .and_then(|s| exif_date(&s));
    let make = ascii(&e, Tag::Make);
    let model = ascii(&e, Tag::Model);
    m.camera = match (make, model) {
        (Some(mk), Some(md)) => {
            let first = mk.split_whitespace().next().unwrap_or("").to_lowercase();
            if md.to_lowercase().starts_with(&first) { Some(md) } else { Some(format!("{mk} {md}")) }
        }
        (None, Some(md)) => Some(md),
        (Some(mk), None) => Some(mk),
        _ => None,
    };
    m.lens = ascii(&e, Tag::LensModel);
    m.iso = uint(&e, Tag::PhotographicSensitivity);
    m.fnum = rational(&e, Tag::FNumber);
    m.focal = rational(&e, Tag::FocalLength);
    if let Some(f) = e.get_field(Tag::ExposureTime, In::PRIMARY) {
        if let Value::Rational(v) = &f.value {
            if let Some(x) = v.first().filter(|x| x.denom != 0 && x.num != 0) {
                let s = x.to_f64();
                m.exposure = Some(if s >= 1.0 {
                    format!("{}s", (s * 10.0).round() / 10.0)
                } else {
                    format!("1/{}", (1.0 / s).round() as i64)
                });
            }
        }
    }
    m.width = uint(&e, Tag::PixelXDimension).or_else(|| uint(&e, Tag::ImageWidth));
    m.height = uint(&e, Tag::PixelYDimension).or_else(|| uint(&e, Tag::ImageLength));
    if matches!(uint(&e, Tag::Orientation), Some(5..=8)) {
        std::mem::swap(&mut m.width, &mut m.height);
    }
    m.lat = gps(&e, Tag::GPSLatitude, Tag::GPSLatitudeRef);
    m.lon = gps(&e, Tag::GPSLongitude, Tag::GPSLongitudeRef);
    if m.lat == Some(0.0) && m.lon == Some(0.0) {
        m.lat = None;
        m.lon = None;
    }
    m
}

// ---- MP4 / MOV: walk the boxes to moov > mvhd (date, length) and the first video trak > tkhd (size)

fn read_u32(b: &[u8], at: usize) -> Option<u32> {
    b.get(at..at + 4).map(|s| u32::from_be_bytes([s[0], s[1], s[2], s[3]]))
}
fn read_u64(b: &[u8], at: usize) -> Option<u64> {
    b.get(at..at + 8).map(|s| u64::from_be_bytes(s.try_into().unwrap()))
}

// child boxes inside a buffer: (type, body)
fn boxes(b: &[u8]) -> Vec<([u8; 4], &[u8])> {
    let mut out = vec![];
    let mut i = 0usize;
    while i + 8 <= b.len() {
        let size = read_u32(b, i).unwrap() as u64;
        let kind: [u8; 4] = b[i + 4..i + 8].try_into().unwrap();
        let (head, size) = match size {
            1 => match read_u64(b, i + 8) {
                Some(s) => (16u64, s),
                None => break,
            },
            0 => (8, (b.len() - i) as u64),
            s => (8, s),
        };
        if size < head || i as u64 + size > b.len() as u64 {
            break;
        }
        out.push((kind, &b[i + head as usize..i + size as usize]));
        i += size as usize;
    }
    out
}

const MP4_EPOCH_TO_UNIX: i64 = 2_082_844_800; // seconds from 1904-01-01 to 1970-01-01

pub fn video(path: &Path) -> Meta {
    let mut m = Meta::default();
    let Ok(mut f) = File::open(path) else { return m };
    let Ok(len) = f.metadata().map(|x| x.len()) else { return m };
    // find the top-level moov box, which may be at the end after a big mdat
    let mut pos = 0u64;
    let mut moov: Option<Vec<u8>> = None;
    let mut head = [0u8; 16];
    while pos + 8 <= len {
        if f.seek(SeekFrom::Start(pos)).is_err() || f.read_exact(&mut head[..8]).is_err() {
            break;
        }
        let mut size = u32::from_be_bytes(head[0..4].try_into().unwrap()) as u64;
        let kind: [u8; 4] = head[4..8].try_into().unwrap();
        let mut hlen = 8u64;
        if size == 1 {
            if f.read_exact(&mut head[8..16]).is_err() {
                break;
            }
            size = u64::from_be_bytes(head[8..16].try_into().unwrap());
            hlen = 16;
        } else if size == 0 {
            size = len - pos;
        }
        if size < hlen {
            break;
        }
        if &kind == b"moov" {
            let body = size - hlen;
            if body > 64 * 1024 * 1024 {
                break;
            }
            let mut buf = vec![0u8; body as usize];
            if f.read_exact(&mut buf).is_ok() {
                moov = Some(buf);
            }
            break;
        }
        pos += size;
    }
    let Some(moov) = moov else { return m };
    for (kind, body) in boxes(&moov) {
        if &kind == b"mvhd" {
            let v = body.first().copied().unwrap_or(0);
            let (created, scale, dur) = if v == 1 {
                (read_u64(body, 4), read_u32(body, 20), read_u64(body, 24))
            } else {
                (read_u32(body, 4).map(|x| x as u64), read_u32(body, 12), read_u32(body, 16).map(|x| x as u64))
            };
            if let Some(c) = created.filter(|c| *c > MP4_EPOCH_TO_UNIX as u64) {
                let unix = c as i64 - MP4_EPOCH_TO_UNIX;
                if let Some(dt) = chrono::DateTime::from_timestamp(unix, 0) {
                    let local = dt.with_timezone(&chrono::Local);
                    m.taken = Some(local.format("%Y-%m-%dT%H:%M:%S").to_string());
                }
            }
            if let (Some(s), Some(d)) = (scale, dur) {
                if s > 0 && d > 0 && d != u32::MAX as u64 {
                    m.duration = Some(d as f64 / s as f64);
                }
            }
        }
        if &kind == b"trak" && m.width.is_none() {
            for (k2, b2) in boxes(body) {
                if &k2 == b"tkhd" {
                    let v = b2.first().copied().unwrap_or(0);
                    let at = if v == 1 { 88 } else { 76 };
                    let w = read_u32(b2, at).map(|x| (x >> 16) as i64).unwrap_or(0);
                    let h = read_u32(b2, at + 4).map(|x| (x >> 16) as i64).unwrap_or(0);
                    if w > 0 && h > 0 {
                        m.width = Some(w);
                        m.height = Some(h);
                    }
                }
            }
        }
        // Apple's own camera tags: moov > meta (QuickTime keys), make/model/creation date
        if &kind == b"meta" {
            quicktime_keys(body, &mut m);
        }
    }
    m
}

// moov > meta > keys + ilst, as an iPhone writes them (com.apple.quicktime.creationdate, .model, .make, .location.ISO6709)
fn quicktime_keys(meta: &[u8], m: &mut Meta) {
    let mut keys: Vec<String> = vec![];
    let mut ilst: Option<&[u8]> = None;
    for (k, b) in boxes(meta) {
        if &k == b"keys" {
            let n = read_u32(b, 4).unwrap_or(0) as usize;
            let mut i = 8;
            for _ in 0..n {
                let Some(sz) = read_u32(b, i).map(|x| x as usize) else { break };
                if sz < 8 || i + sz > b.len() {
                    break;
                }
                keys.push(String::from_utf8_lossy(&b[i + 8..i + sz]).to_string());
                i += sz;
            }
        }
        if &k == b"ilst" {
            ilst = Some(b);
        }
    }
    let Some(ilst) = ilst else { return };
    let (mut make, mut model) = (None, None);
    for (k, b) in boxes(ilst) {
        let idx = u32::from_be_bytes(k) as usize;
        let Some(key) = idx.checked_sub(1).and_then(|i| keys.get(i)) else { continue };
        let Some((_, data)) = boxes(b).into_iter().find(|(t, _)| t == b"data") else { continue };
        if data.len() < 8 {
            continue;
        }
        let val = String::from_utf8_lossy(&data[8..]).trim().to_string();
        match key.as_str() {
            "com.apple.quicktime.creationdate" => {
                // 2024-05-01T12:03:44+0300: keep the local time as the camera wrote it
                if val.len() >= 19 {
                    m.taken = Some(val[0..19].to_string());
                }
            }
            "com.apple.quicktime.make" => make = Some(val),
            "com.apple.quicktime.model" => model = Some(val),
            "com.apple.quicktime.location.ISO6709" => {
                if let Some((la, lo)) = iso6709(&val) {
                    m.lat = Some(la);
                    m.lon = Some(lo);
                }
            }
            _ => {}
        }
    }
    m.camera = match (make, model) {
        (Some(mk), Some(md)) if !md.to_lowercase().starts_with(&mk.to_lowercase()) => Some(format!("{mk} {md}")),
        (_, Some(md)) => Some(md),
        (Some(mk), None) => Some(mk),
        _ => m.camera.take(),
    };
}

// "+37.9838+023.7275+070.000/" -> (37.9838, 23.7275)
fn iso6709(s: &str) -> Option<(f64, f64)> {
    let s = s.trim_end_matches('/');
    let mut parts = vec![];
    let mut cur = String::new();
    for ch in s.chars() {
        if (ch == '+' || ch == '-') && !cur.is_empty() {
            parts.push(cur.clone());
            cur.clear();
        }
        cur.push(ch);
    }
    if !cur.is_empty() {
        parts.push(cur);
    }
    let la = parts.first()?.parse().ok()?;
    let lo = parts.get(1)?.parse().ok()?;
    Some((la, lo))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dates() {
        assert_eq!(exif_date("2024:05:01 12:03:44").as_deref(), Some("2024-05-01T12:03:44"));
        assert_eq!(exif_date("0000:00:00 00:00:00"), None);
        assert_eq!(exif_date("garbage"), None);
    }

    #[test]
    fn location() {
        assert_eq!(iso6709("+37.9838+023.7275+070.000/"), Some((37.9838, 23.7275)));
        assert_eq!(iso6709("-33.8688+151.2093/"), Some((-33.8688, 151.2093)));
    }

    // a tiny hand-made MOV: ftyp, then moov with mvhd (v0) and a trak with tkhd
    #[test]
    fn mov() {
        fn bx(kind: &[u8; 4], body: &[u8]) -> Vec<u8> {
            let mut v = ((body.len() + 8) as u32).to_be_bytes().to_vec();
            v.extend_from_slice(kind);
            v.extend_from_slice(body);
            v
        }
        let created: u32 = (1_700_000_000i64 + MP4_EPOCH_TO_UNIX) as u32;
        let mut mvhd = vec![0u8; 100];
        mvhd[4..8].copy_from_slice(&created.to_be_bytes());
        mvhd[12..16].copy_from_slice(&600u32.to_be_bytes());
        mvhd[16..20].copy_from_slice(&(600u32 * 12).to_be_bytes());
        let mut tkhd = vec![0u8; 84];
        tkhd[76..80].copy_from_slice(&((1920u32) << 16).to_be_bytes());
        tkhd[80..84].copy_from_slice(&((1080u32) << 16).to_be_bytes());
        let trak = bx(b"trak", &bx(b"tkhd", &tkhd));
        let mut moov_body = bx(b"mvhd", &mvhd);
        moov_body.extend(trak);
        let mut file = bx(b"ftyp", b"qt  \0\0\0\0");
        file.extend(bx(b"mdat", &[0u8; 1000]));
        file.extend(bx(b"moov", &moov_body));
        let dir = std::env::temp_dir().join(format!("rp-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let p = dir.join("a.mov");
        std::fs::write(&p, file).unwrap();
        let m = video(&p);
        assert_eq!(m.width, Some(1920));
        assert_eq!(m.height, Some(1080));
        assert_eq!(m.duration, Some(12.0));
        assert!(m.taken.is_some());
        std::fs::remove_dir_all(dir).ok();
    }
}

#[cfg(test)]
mod photo_tests {
    #[test]
    fn sony_jpeg() {
        let p = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/sony.jpg");
        let m = super::photo(&p);
        assert_eq!(m.taken.as_deref(), Some("2024-05-01T12:03:44"));
        assert_eq!(m.camera.as_deref(), Some("SONY ILCE-7SM3"));
        assert_eq!(m.lens.as_deref(), Some("FE 35mm F1.4 GM"));
        assert_eq!(m.iso, Some(800));
        assert_eq!(m.exposure.as_deref(), Some("1/250"));
        assert_eq!(m.fnum, Some(1.4));
        // orientation 6: the picture stands, so width and height swap
        assert_eq!((m.width, m.height), (Some(4000), Some(6000)));
        assert!((m.lat.unwrap() - 40.6401).abs() < 1e-3);
        assert!((m.lon.unwrap() - 22.9444).abs() < 1e-3);
    }
}
