// The library: one SQLite file in the app's own folder. The photos themselves never move.
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::Path;

const SCHEMA: &str = "
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  added INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  folder TEXT NOT NULL,
  kind TEXT NOT NULL,
  ext TEXT NOT NULL,
  size INTEGER NOT NULL,
  mtime INTEGER NOT NULL,
  taken TEXT NOT NULL,
  width INTEGER, height INTEGER,
  camera TEXT, lens TEXT, iso INTEGER, fnum REAL, exposure TEXT, focal REAL,
  lat REAL, lon REAL, duration REAL,
  rating INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL DEFAULT '',
  fav INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  thumb INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS media_taken ON media(taken);
CREATE INDEX IF NOT EXISTS media_source ON media(source_id);
CREATE TABLE IF NOT EXISTS albums (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS album_items (
  album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  added INTEGER NOT NULL,
  PRIMARY KEY (album_id, media_id)
);
";

pub fn open(path: &Path) -> rusqlite::Result<Connection> {
    let c = Connection::open(path)?;
    c.busy_timeout(std::time::Duration::from_secs(10))?;
    c.execute_batch(SCHEMA)?;
    Ok(c)
}

pub fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

// One tile in the grid: short keys, because a library can hold tens of thousands.
#[derive(Serialize)]
pub struct Item {
    pub id: i64,
    pub k: String,  // "p" photo, "v" video
    pub t: String,  // when it was taken, 2026-11-27T18:04:11
    pub r: i64,     // stars 0-5
    pub l: String,  // colour label
    pub f: bool,    // favourite
    pub d: Option<f64>, // video length in seconds
    pub th: i64,    // 0 not made yet, 1 made, 2 could not be made
    pub e: String,  // extension, shown on a tile that has no picture
}

#[derive(Serialize)]
pub struct Media {
    pub id: i64,
    pub path: String,
    pub name: String,
    pub folder: String,
    pub kind: String,
    pub ext: String,
    pub size: i64,
    pub taken: String,
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
    pub rating: i64,
    pub label: String,
    pub fav: bool,
    pub hidden: bool,
    pub thumb: i64,
    pub albums: Vec<i64>,
}

#[derive(Deserialize, Default)]
#[serde(default)]
pub struct Filter {
    pub view: String,          // all, photos, videos, favs, hidden, album, source
    pub album: Option<i64>,
    pub source: Option<i64>,
    pub text: Option<String>,
    pub min_rating: Option<i64>,
    pub label: Option<String>,
    pub camera: Option<String>,
    pub asc: bool,
}

pub fn query(c: &Connection, f: &Filter) -> rusqlite::Result<Vec<Item>> {
    let mut sql = String::from(
        "SELECT m.id, m.kind, m.taken, m.rating, m.label, m.fav, m.duration, m.thumb, m.ext FROM media m",
    );
    let mut wh: Vec<String> = Vec::new();
    let mut args: Vec<rusqlite::types::Value> = Vec::new();
    use rusqlite::types::Value as V;
    match f.view.as_str() {
        "album" => {
            sql.push_str(" JOIN album_items a ON a.media_id = m.id");
            wh.push("a.album_id = ?".into());
            args.push(V::Integer(f.album.unwrap_or(-1)));
        }
        "source" => {
            wh.push("m.source_id = ?".into());
            args.push(V::Integer(f.source.unwrap_or(-1)));
        }
        "photos" => wh.push("m.kind = 'photo'".into()),
        "videos" => wh.push("m.kind = 'video'".into()),
        "favs" => wh.push("m.fav = 1".into()),
        _ => {}
    }
    wh.push(if f.view == "hidden" { "m.hidden = 1" } else { "m.hidden = 0" }.into());
    if let Some(t) = f.text.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
        // every word must match somewhere: name, folder, camera, lens or the date
        for w in t.split_whitespace() {
            wh.push("(m.name LIKE ? OR m.folder LIKE ? OR IFNULL(m.camera,'') LIKE ? OR IFNULL(m.lens,'') LIKE ? OR m.taken LIKE ?)".into());
            let p = format!("%{}%", w.replace('%', "").replace('_', ""));
            for _ in 0..5 {
                args.push(V::Text(p.clone()));
            }
        }
    }
    if let Some(r) = f.min_rating.filter(|r| *r > 0) {
        wh.push("m.rating >= ?".into());
        args.push(V::Integer(r));
    }
    if let Some(l) = f.label.as_ref().filter(|l| !l.is_empty()) {
        wh.push("m.label = ?".into());
        args.push(V::Text(l.clone()));
    }
    if let Some(cam) = f.camera.as_ref().filter(|l| !l.is_empty()) {
        wh.push("m.camera = ?".into());
        args.push(V::Text(cam.clone()));
    }
    sql.push_str(" WHERE ");
    sql.push_str(&wh.join(" AND "));
    sql.push_str(if f.asc { " ORDER BY m.taken ASC, m.id ASC" } else { " ORDER BY m.taken DESC, m.id DESC" });
    let mut st = c.prepare(&sql)?;
    let rows = st.query_map(rusqlite::params_from_iter(args.iter()), |r| {
        Ok(Item {
            id: r.get(0)?,
            k: if r.get::<_, String>(1)? == "video" { "v".into() } else { "p".into() },
            t: r.get(2)?,
            r: r.get(3)?,
            l: r.get(4)?,
            f: r.get::<_, i64>(5)? != 0,
            d: r.get(6)?,
            th: r.get(7)?,
            e: r.get(8)?,
        })
    })?;
    rows.collect()
}

pub fn get(c: &Connection, id: i64) -> rusqlite::Result<Media> {
    let mut m = c.query_row(
        "SELECT id, path, name, folder, kind, ext, size, taken, width, height, camera, lens, iso, fnum,
                exposure, focal, lat, lon, duration, rating, label, fav, hidden, thumb FROM media WHERE id = ?",
        params![id],
        |r| {
            Ok(Media {
                id: r.get(0)?,
                path: r.get(1)?,
                name: r.get(2)?,
                folder: r.get(3)?,
                kind: r.get(4)?,
                ext: r.get(5)?,
                size: r.get(6)?,
                taken: r.get(7)?,
                width: r.get(8)?,
                height: r.get(9)?,
                camera: r.get(10)?,
                lens: r.get(11)?,
                iso: r.get(12)?,
                fnum: r.get(13)?,
                exposure: r.get(14)?,
                focal: r.get(15)?,
                lat: r.get(16)?,
                lon: r.get(17)?,
                duration: r.get(18)?,
                rating: r.get(19)?,
                label: r.get(20)?,
                fav: r.get::<_, i64>(21)? != 0,
                hidden: r.get::<_, i64>(22)? != 0,
                thumb: r.get(23)?,
                albums: vec![],
            })
        },
    )?;
    let mut st = c.prepare("SELECT album_id FROM album_items WHERE media_id = ?")?;
    m.albums = st.query_map(params![id], |r| r.get(0))?.collect::<Result<_, _>>()?;
    Ok(m)
}

pub fn path_of(c: &Connection, id: i64) -> rusqlite::Result<(String, String, String)> {
    c.query_row("SELECT path, kind, ext FROM media WHERE id = ?", params![id], |r| {
        Ok((r.get(0)?, r.get(1)?, r.get(2)?))
    })
}

#[derive(Serialize)]
pub struct Source {
    pub id: i64,
    pub path: String,
    pub count: i64,
    pub online: bool,
}

pub fn sources(c: &Connection) -> rusqlite::Result<Vec<Source>> {
    let mut st = c.prepare(
        "SELECT s.id, s.path, (SELECT COUNT(*) FROM media m WHERE m.source_id = s.id AND m.hidden = 0)
         FROM sources s ORDER BY s.path",
    )?;
    let rows = st.query_map([], |r| {
        let path: String = r.get(1)?;
        Ok(Source { id: r.get(0)?, online: Path::new(&path).is_dir(), path, count: r.get(2)? })
    })?;
    rows.collect()
}

#[derive(Serialize)]
pub struct Album {
    pub id: i64,
    pub name: String,
    pub count: i64,
    pub cover: Option<i64>,
}

pub fn albums(c: &Connection) -> rusqlite::Result<Vec<Album>> {
    let mut st = c.prepare(
        "SELECT a.id, a.name,
           (SELECT COUNT(*) FROM album_items i JOIN media m ON m.id = i.media_id WHERE i.album_id = a.id AND m.hidden = 0),
           (SELECT m.id FROM album_items i JOIN media m ON m.id = i.media_id
              WHERE i.album_id = a.id AND m.hidden = 0 AND m.thumb = 1 ORDER BY m.taken DESC LIMIT 1)
         FROM albums a ORDER BY a.name COLLATE NOCASE",
    )?;
    let rows = st.query_map([], |r| {
        Ok(Album { id: r.get(0)?, name: r.get(1)?, count: r.get(2)?, cover: r.get(3)? })
    })?;
    rows.collect()
}

#[derive(Serialize)]
pub struct Counts {
    pub all: i64,
    pub photos: i64,
    pub videos: i64,
    pub favs: i64,
    pub hidden: i64,
}

pub fn counts(c: &Connection) -> rusqlite::Result<Counts> {
    c.query_row(
        "SELECT
           IFNULL(SUM(hidden = 0), 0),
           IFNULL(SUM(hidden = 0 AND kind = 'photo'), 0),
           IFNULL(SUM(hidden = 0 AND kind = 'video'), 0),
           IFNULL(SUM(hidden = 0 AND fav = 1), 0),
           IFNULL(SUM(hidden = 1), 0)
         FROM media",
        [],
        |r| Ok(Counts { all: r.get(0)?, photos: r.get(1)?, videos: r.get(2)?, favs: r.get(3)?, hidden: r.get(4)? }),
    )
}

pub fn cameras(c: &Connection) -> rusqlite::Result<Vec<String>> {
    let mut st = c.prepare(
        "SELECT camera FROM media WHERE camera IS NOT NULL AND camera != '' AND hidden = 0
         GROUP BY camera ORDER BY COUNT(*) DESC",
    )?;
    let rows = st.query_map([], |r| r.get(0))?;
    rows.collect()
}

// A field the grid can change on many at once: rating, label, fav, hidden.
pub fn set_field(c: &mut Connection, ids: &[i64], field: &str, value: rusqlite::types::Value) -> rusqlite::Result<()> {
    let col = match field {
        "rating" => "rating",
        "label" => "label",
        "fav" => "fav",
        "hidden" => "hidden",
        _ => return Err(rusqlite::Error::InvalidColumnName(field.into())),
    };
    let tx = c.transaction()?;
    {
        let mut st = tx.prepare(&format!("UPDATE media SET {col} = ?1 WHERE id = ?2"))?;
        for id in ids {
            st.execute(params![value, id])?;
        }
    }
    tx.commit()
}
