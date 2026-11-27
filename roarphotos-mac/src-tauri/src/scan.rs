// Walk a folder, add what is new or changed, drop what is gone. Ratings, labels and albums stay.
use crate::meta;
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashSet;
use std::path::Path;
use walkdir::WalkDir;

pub const PHOTO: &[&str] = &[
    "jpg", "jpeg", "png", "heic", "heif", "tif", "tiff", "gif", "webp", "bmp", "avif", "dng", "cr2", "cr3", "nef",
    "nrw", "arw", "srf", "sr2", "raf", "orf", "rw2", "pef", "srw", "3fr", "iiq", "x3f",
];
pub const VIDEO: &[&str] = &["mp4", "mov", "m4v", "avi", "mkv", "mts", "m2ts", "3gp", "webm", "mxf"];

// folders that are packages of another app: their insides are not photos to show
const SKIP_DIRS: &[&str] = &[".photoslibrary", ".lrdata", ".lrcat-data", ".fcpbundle", ".app", ".tvlibrary", ".imovielibrary", ".cosessiondb"];

pub fn kind_of(ext: &str) -> Option<&'static str> {
    if PHOTO.contains(&ext) {
        Some("photo")
    } else if VIDEO.contains(&ext) {
        Some("video")
    } else {
        None
    }
}

fn skip(e: &walkdir::DirEntry) -> bool {
    let n = e.file_name().to_string_lossy();
    if e.depth() > 0 && n.starts_with('.') {
        return true;
    }
    if e.file_type().is_dir() {
        let low = n.to_lowercase();
        return SKIP_DIRS.iter().any(|s| low.ends_with(s)) || low == "$recycle.bin";
    }
    false
}

pub struct Stats {
    pub added: usize,
    pub updated: usize,
    pub removed: usize,
}

pub fn scan_source(
    c: &mut Connection,
    source_id: i64,
    root: &Path,
    progress: &dyn Fn(usize, usize),
) -> rusqlite::Result<Stats> {
    let mut st = Stats { added: 0, updated: 0, removed: 0 };
    if !root.is_dir() {
        return Ok(st); // a drive that is not plugged in: keep everything as it was
    }
    let files: Vec<_> = WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| !skip(e))
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| {
            let ext = e.path().extension()?.to_string_lossy().to_lowercase();
            kind_of(&ext).map(|k| (e.into_path(), ext, k))
        })
        .collect();
    let total = files.len();
    progress(0, total);
    let mut seen: HashSet<String> = HashSet::with_capacity(total);
    let mut tx = c.transaction()?;
    for (i, (path, ext, kind)) in files.iter().enumerate() {
        let p = path.to_string_lossy().to_string();
        seen.insert(p.clone());
        let Ok(md) = std::fs::metadata(path) else { continue };
        let size = md.len() as i64;
        let mtime = md
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);
        let old: Option<(i64, i64, i64)> = tx
            .query_row("SELECT id, size, mtime FROM media WHERE path = ?", params![p], |r| {
                Ok((r.get(0)?, r.get(1)?, r.get(2)?))
            })
            .optional()?;
        if let Some((_, s, m)) = old {
            if s == size && m == mtime {
                if i % 200 == 0 {
                    progress(i, total);
                }
                continue;
            }
        }
        let mm = if *kind == "video" { meta::video(path) } else { meta::photo(path) };
        let taken = mm.taken.clone().unwrap_or_else(|| {
            chrono::DateTime::from_timestamp(mtime, 0)
                .map(|d| d.with_timezone(&chrono::Local).format("%Y-%m-%dT%H:%M:%S").to_string())
                .unwrap_or_else(|| "1970-01-01T00:00:00".into())
        });
        let name = path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
        let folder = path
            .parent()
            .and_then(|f| f.strip_prefix(root.parent().unwrap_or(root)).ok())
            .map(|f| f.to_string_lossy().to_string())
            .unwrap_or_default();
        match old {
            Some((id, _, _)) => {
                tx.execute(
                    "UPDATE media SET size=?, mtime=?, taken=?, width=?, height=?, camera=?, lens=?, iso=?, fnum=?,
                       exposure=?, focal=?, lat=?, lon=?, duration=?, thumb=0 WHERE id=?",
                    params![size, mtime, taken, mm.width, mm.height, mm.camera, mm.lens, mm.iso, mm.fnum,
                        mm.exposure, mm.focal, mm.lat, mm.lon, mm.duration, id],
                )?;
                st.updated += 1;
            }
            None => {
                tx.execute(
                    "INSERT INTO media (source_id, path, name, folder, kind, ext, size, mtime, taken, width, height,
                       camera, lens, iso, fnum, exposure, focal, lat, lon, duration)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    params![source_id, p, name, folder, kind, ext, size, mtime, taken, mm.width, mm.height,
                        mm.camera, mm.lens, mm.iso, mm.fnum, mm.exposure, mm.focal, mm.lat, mm.lon, mm.duration],
                )?;
                st.added += 1;
            }
        }
        if i % 200 == 0 {
            tx.commit()?;
            tx = c.transaction()?;
            progress(i, total);
        }
    }
    tx.commit()?;
    // what was in this folder and is no longer there
    let gone: Vec<(i64, String)> = {
        let mut q = c.prepare("SELECT id, path FROM media WHERE source_id = ?")?;
        let rows = q.query_map(params![source_id], |r| Ok((r.get(0)?, r.get(1)?)))?;
        rows.filter_map(|r| r.ok()).filter(|(_, p)| !seen.contains(p)).collect()
    };
    if !gone.is_empty() {
        let tx = c.transaction()?;
        for (id, _) in &gone {
            tx.execute("DELETE FROM media WHERE id = ?", params![id])?;
        }
        tx.commit()?;
        st.removed = gone.len();
    }
    progress(total, total);
    Ok(st)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scan_keeps_ratings_and_drops_gone_files() {
        let dir = std::env::temp_dir().join(format!("rp-scan-{}", std::process::id()));
        let lib = dir.join("Shoot");
        std::fs::create_dir_all(lib.join("day2")).unwrap();
        std::fs::create_dir_all(lib.join("Old.photoslibrary/originals")).unwrap();
        std::fs::write(lib.join("a.jpg"), b"not really a jpeg").unwrap();
        std::fs::write(lib.join("day2/b.MOV"), b"nope").unwrap();
        std::fs::write(lib.join("notes.txt"), b"skip me").unwrap();
        std::fs::write(lib.join(".hidden.jpg"), b"skip me").unwrap();
        std::fs::write(lib.join("Old.photoslibrary/originals/x.jpg"), b"skip me").unwrap();
        let mut c = crate::db::open(&dir.join("lib.db")).unwrap();
        c.execute("INSERT INTO sources (path, added) VALUES (?, 0)", params![lib.to_string_lossy()]).unwrap();
        let sid = c.last_insert_rowid();
        let s = scan_source(&mut c, sid, &lib, &|_, _| {}).unwrap();
        assert_eq!(s.added, 2);
        let n: i64 = c.query_row("SELECT COUNT(*) FROM media", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 2);
        let folder: String = c.query_row("SELECT folder FROM media WHERE kind='video'", [], |r| r.get(0)).unwrap();
        assert_eq!(folder, "Shoot/day2");
        c.execute("UPDATE media SET rating = 5 WHERE name = 'a.jpg'", []).unwrap();
        // again, nothing changed: nothing added, the rating stays
        let s = scan_source(&mut c, sid, &lib, &|_, _| {}).unwrap();
        assert_eq!((s.added, s.updated, s.removed), (0, 0, 0));
        let r: i64 = c.query_row("SELECT rating FROM media WHERE name='a.jpg'", [], |r| r.get(0)).unwrap();
        assert_eq!(r, 5);
        std::fs::remove_file(lib.join("day2/b.MOV")).unwrap();
        let s = scan_source(&mut c, sid, &lib, &|_, _| {}).unwrap();
        assert_eq!(s.removed, 1);
        // a drive that is gone: nothing is removed
        let s = scan_source(&mut c, sid, &dir.join("unplugged"), &|_, _| {}).unwrap();
        assert_eq!(s.removed, 0);
        std::fs::remove_dir_all(dir).ok();
    }
}
