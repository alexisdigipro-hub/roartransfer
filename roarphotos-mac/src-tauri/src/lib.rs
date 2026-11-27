// RoarPhotos: a photo library for the Mac that never leaves the Mac.
mod db;
mod meta;
mod scan;
mod thumb;

use rusqlite::{params, types::Value, Connection};
use serde_json::json;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;

pub struct AppState {
    conn: Mutex<Connection>,
    db_path: PathBuf,
    thumbs: PathBuf,
    previews: PathBuf,
    busy: Arc<AtomicBool>,
    again: Arc<AtomicBool>,
}

type Res<T> = Result<T, String>;
fn e<E: std::fmt::Display>(x: E) -> String {
    x.to_string()
}

// ---- the background job: scan every folder, then make the missing thumbnails

fn start_job(app: &AppHandle) {
    let st = app.state::<AppState>();
    if st.busy.swap(true, Ordering::SeqCst) {
        st.again.store(true, Ordering::SeqCst); // one more round once this one ends
        return;
    }
    let app = app.clone();
    std::thread::spawn(move || loop {
        let st = app.state::<AppState>();
        if let Err(err) = job(&app, &st.db_path, &st.thumbs) {
            let _ = app.emit("job", json!({ "phase": "error", "error": err }));
        }
        if !st.again.swap(false, Ordering::SeqCst) {
            st.busy.store(false, Ordering::SeqCst);
            let _ = app.emit("job", json!({ "phase": "done" }));
            break;
        }
    });
}

fn job(app: &AppHandle, db_path: &Path, thumbs: &Path) -> Res<()> {
    let mut c = db::open(db_path).map_err(e)?;
    let sources: Vec<(i64, String)> = {
        let mut q = c.prepare("SELECT id, path FROM sources").map_err(e)?;
        let rows = q.query_map([], |r| Ok((r.get(0)?, r.get(1)?))).map_err(e)?;
        rows.filter_map(|r| r.ok()).collect()
    };
    for (id, path) in sources {
        let name = Path::new(&path).file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or(path.clone());
        let a = app.clone();
        let n2 = name.clone();
        let stats = scan::scan_source(&mut c, id, Path::new(&path), &move |done, total| {
            let _ = a.emit("job", json!({ "phase": "scan", "source": n2, "done": done, "total": total }));
        })
        .map_err(e)?;
        if stats.added + stats.updated + stats.removed > 0 {
            let _ = app.emit("changed", json!({ "added": stats.added, "removed": stats.removed }));
        }
    }
    // thumbnails, four at a time, newest first so the top of the grid fills in first
    let todo: Vec<(i64, String, String)> = {
        let mut q = c
            .prepare("SELECT id, path, kind FROM media WHERE thumb = 0 ORDER BY taken DESC")
            .map_err(e)?;
        let rows = q.query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).map_err(e)?;
        rows.filter_map(|r| r.ok()).collect()
    };
    if todo.is_empty() {
        return Ok(());
    }
    let total = todo.len();
    let queue = Arc::new(Mutex::new(todo.into_iter()));
    let done = Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let workers = std::thread::available_parallelism().map(|n| n.get().clamp(2, 6)).unwrap_or(4);
    let mut handles = vec![];
    for _ in 0..workers {
        let (queue, done, app) = (queue.clone(), done.clone(), app.clone());
        let (db_path, thumbs) = (db_path.to_path_buf(), thumbs.to_path_buf());
        handles.push(std::thread::spawn(move || {
            let Ok(c) = db::open(&db_path) else { return };
            let mut made: Vec<(i64, bool)> = vec![];
            loop {
                let next = queue.lock().unwrap().next();
                let Some((id, path, kind)) = next else { break };
                let out = thumbs.join(format!("{id}.jpg"));
                let ok = thumb::make(Path::new(&path), &kind, &out, thumb::GRID);
                let _ = c.execute("UPDATE media SET thumb = ? WHERE id = ?", params![if ok { 1 } else { 2 }, id]);
                made.push((id, ok));
                let n = done.fetch_add(1, Ordering::SeqCst) + 1;
                if made.len() >= 24 || n == total {
                    let _ = app.emit("thumbs", json!({ "ids": made, "done": n, "total": total }));
                    made = vec![];
                }
            }
            if !made.is_empty() {
                let n = done.load(Ordering::SeqCst);
                let _ = app.emit("thumbs", json!({ "ids": made, "done": n, "total": total }));
            }
        }));
    }
    for h in handles {
        let _ = h.join();
    }
    Ok(())
}

// ---- commands

#[tauri::command]
async fn info(st: State<'_, AppState>) -> Res<serde_json::Value> {
    Ok(json!({
        "thumbs": st.thumbs.to_string_lossy(),
        "busy": st.busy.load(Ordering::SeqCst),
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

#[tauri::command]
async fn sources(st: State<'_, AppState>) -> Res<Vec<db::Source>> {
    db::sources(&st.conn.lock().unwrap()).map_err(e)
}

#[tauri::command]
async fn pick_folder(app: AppHandle) -> Res<Option<String>> {
    Ok(app
        .dialog()
        .file()
        .blocking_pick_folder()
        .and_then(|p| p.into_path().ok())
        .map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
async fn add_source(app: AppHandle, st: State<'_, AppState>, path: String) -> Res<()> {
    let p = PathBuf::from(&path);
    if !p.is_dir() {
        return Err("Ο φάκελος δεν βρέθηκε".into());
    }
    {
        let c = st.conn.lock().unwrap();
        let all = db::sources(&c).map_err(e)?;
        // a folder inside one already in the library would show its photos twice
        if let Some(s) = all.iter().find(|s| p.starts_with(&s.path)) {
            return Err(format!("Είναι ήδη μέσα στη βιβλιοθήκη, στο {}", s.path));
        }
        c.execute("INSERT INTO sources (path, added) VALUES (?, ?)", params![path, db::now()]).map_err(e)?;
        let new_id = c.last_insert_rowid();
        // smaller folders it now holds: their photos move under it, ratings and albums kept
        for s in all.iter().filter(|s| Path::new(&s.path).starts_with(&p)) {
            c.execute("UPDATE media SET source_id = ? WHERE source_id = ?", params![new_id, s.id]).map_err(e)?;
            c.execute("DELETE FROM sources WHERE id = ?", params![s.id]).map_err(e)?;
        }
    }
    start_job(&app);
    Ok(())
}

#[tauri::command]
async fn remove_source(st: State<'_, AppState>, id: i64) -> Res<()> {
    let c = st.conn.lock().unwrap();
    let ids: Vec<i64> = {
        let mut q = c.prepare("SELECT id FROM media WHERE source_id = ?").map_err(e)?;
        let rows = q.query_map(params![id], |r| r.get(0)).map_err(e)?;
        rows.filter_map(|r| r.ok()).collect()
    };
    c.execute("DELETE FROM sources WHERE id = ?", params![id]).map_err(e)?;
    for i in ids {
        let _ = std::fs::remove_file(st.thumbs.join(format!("{i}.jpg")));
        let _ = std::fs::remove_file(st.previews.join(format!("{i}.jpg")));
    }
    Ok(())
}

#[tauri::command]
async fn rescan(app: AppHandle) -> Res<()> {
    start_job(&app);
    Ok(())
}

#[tauri::command]
async fn query(st: State<'_, AppState>, filter: db::Filter) -> Res<Vec<db::Item>> {
    db::query(&st.conn.lock().unwrap(), &filter).map_err(e)
}

#[tauri::command]
async fn item(st: State<'_, AppState>, id: i64) -> Res<db::Media> {
    db::get(&st.conn.lock().unwrap(), id).map_err(e)
}

#[tauri::command]
async fn counts(st: State<'_, AppState>) -> Res<db::Counts> {
    db::counts(&st.conn.lock().unwrap()).map_err(e)
}

#[tauri::command]
async fn cameras(st: State<'_, AppState>) -> Res<Vec<String>> {
    db::cameras(&st.conn.lock().unwrap()).map_err(e)
}

#[tauri::command]
async fn set_rating(st: State<'_, AppState>, ids: Vec<i64>, value: i64) -> Res<()> {
    db::set_field(&mut st.conn.lock().unwrap(), &ids, "rating", Value::Integer(value.clamp(0, 5))).map_err(e)
}

#[tauri::command]
async fn set_label(st: State<'_, AppState>, ids: Vec<i64>, value: String) -> Res<()> {
    let v = if ["red", "yellow", "green", "blue", "purple"].contains(&value.as_str()) { value } else { String::new() };
    db::set_field(&mut st.conn.lock().unwrap(), &ids, "label", Value::Text(v)).map_err(e)
}

#[tauri::command]
async fn set_fav(st: State<'_, AppState>, ids: Vec<i64>, value: bool) -> Res<()> {
    db::set_field(&mut st.conn.lock().unwrap(), &ids, "fav", Value::Integer(value as i64)).map_err(e)
}

#[tauri::command]
async fn set_hidden(st: State<'_, AppState>, ids: Vec<i64>, value: bool) -> Res<()> {
    db::set_field(&mut st.conn.lock().unwrap(), &ids, "hidden", Value::Integer(value as i64)).map_err(e)
}

// Into the Mac's own Trash (it can be put back from there), and out of the library.
#[tauri::command]
async fn move_to_trash(st: State<'_, AppState>, ids: Vec<i64>) -> Res<usize> {
    let c = st.conn.lock().unwrap();
    let mut n = 0;
    for id in ids {
        let Ok((path, _, _)) = db::path_of(&c, id) else { continue };
        if trash::delete(&path).is_ok() || !Path::new(&path).exists() {
            c.execute("DELETE FROM media WHERE id = ?", params![id]).map_err(e)?;
            let _ = std::fs::remove_file(st.thumbs.join(format!("{id}.jpg")));
            let _ = std::fs::remove_file(st.previews.join(format!("{id}.jpg")));
            n += 1;
        }
    }
    Ok(n)
}

#[tauri::command]
async fn albums(st: State<'_, AppState>) -> Res<Vec<db::Album>> {
    db::albums(&st.conn.lock().unwrap()).map_err(e)
}

#[tauri::command]
async fn album_create(st: State<'_, AppState>, name: String, ids: Vec<i64>) -> Res<i64> {
    let c = st.conn.lock().unwrap();
    let name = name.trim();
    let name = if name.is_empty() { "Νέο άλμπουμ" } else { name };
    c.execute("INSERT INTO albums (name, created) VALUES (?, ?)", params![name, db::now()]).map_err(e)?;
    let id = c.last_insert_rowid();
    for m in ids {
        c.execute("INSERT OR IGNORE INTO album_items VALUES (?, ?, ?)", params![id, m, db::now()]).map_err(e)?;
    }
    Ok(id)
}

#[tauri::command]
async fn album_rename(st: State<'_, AppState>, id: i64, name: String) -> Res<()> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Ok(());
    }
    st.conn.lock().unwrap().execute("UPDATE albums SET name = ? WHERE id = ?", params![name, id]).map_err(e)?;
    Ok(())
}

#[tauri::command]
async fn album_delete(st: State<'_, AppState>, id: i64) -> Res<()> {
    st.conn.lock().unwrap().execute("DELETE FROM albums WHERE id = ?", params![id]).map_err(e)?;
    Ok(())
}

#[tauri::command]
async fn album_add(st: State<'_, AppState>, id: i64, ids: Vec<i64>) -> Res<()> {
    let mut c = st.conn.lock().unwrap();
    let tx = c.transaction().map_err(e)?;
    for m in ids {
        tx.execute("INSERT OR IGNORE INTO album_items VALUES (?, ?, ?)", params![id, m, db::now()]).map_err(e)?;
    }
    tx.commit().map_err(e)
}

#[tauri::command]
async fn album_remove(st: State<'_, AppState>, id: i64, ids: Vec<i64>) -> Res<()> {
    let mut c = st.conn.lock().unwrap();
    let tx = c.transaction().map_err(e)?;
    for m in ids {
        tx.execute("DELETE FROM album_items WHERE album_id = ? AND media_id = ?", params![id, m]).map_err(e)?;
    }
    tx.commit().map_err(e)
}

// The file the big view shows: the original when the window can draw it, else a JPEG made once.
#[tauri::command]
async fn preview(st: State<'_, AppState>, id: i64) -> Res<String> {
    let (path, kind, ext) = db::path_of(&st.conn.lock().unwrap(), id).map_err(e)?;
    if kind == "video" || thumb::web_native(&ext) {
        return Ok(path);
    }
    let out = st.previews.join(format!("{id}.jpg"));
    if out.exists() || thumb::make(Path::new(&path), &kind, &out, thumb::PREVIEW) {
        return Ok(out.to_string_lossy().to_string());
    }
    Ok(st.thumbs.join(format!("{id}.jpg")).to_string_lossy().to_string())
}

#[tauri::command]
async fn reveal(st: State<'_, AppState>, id: i64) -> Res<()> {
    let (path, _, _) = db::path_of(&st.conn.lock().unwrap(), id).map_err(e)?;
    std::process::Command::new("/usr/bin/open").arg("-R").arg(path).spawn().map_err(e)?;
    Ok(())
}

#[tauri::command]
async fn open_file(st: State<'_, AppState>, id: i64) -> Res<()> {
    let (path, _, _) = db::path_of(&st.conn.lock().unwrap(), id).map_err(e)?;
    std::process::Command::new("/usr/bin/open").arg(path).spawn().map_err(e)?;
    Ok(())
}

#[tauri::command]
async fn open_folder(path: String) -> Res<()> {
    std::process::Command::new("/usr/bin/open").arg(path).spawn().map_err(e)?;
    Ok(())
}

// Copies of the originals into a folder (for a client, an editor, a drive). Names never overwrite.
#[tauri::command]
async fn export(app: AppHandle, st: State<'_, AppState>, ids: Vec<i64>) -> Res<Option<serde_json::Value>> {
    let Some(dest) = app.dialog().file().blocking_pick_folder().and_then(|p| p.into_path().ok()) else {
        return Ok(None);
    };
    let paths: Vec<String> = {
        let c = st.conn.lock().unwrap();
        ids.iter().filter_map(|id| db::path_of(&c, *id).ok().map(|x| x.0)).collect()
    };
    let total = paths.len();
    let mut n = 0;
    for (i, p) in paths.iter().enumerate() {
        let src = Path::new(p);
        let Some(name) = src.file_name() else { continue };
        let mut out = dest.join(name);
        let stem = src.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let ext = src.extension().map(|s| format!(".{}", s.to_string_lossy())).unwrap_or_default();
        let mut k = 2;
        while out.exists() {
            out = dest.join(format!("{stem} ({k}){ext}"));
            k += 1;
        }
        if std::fs::copy(src, &out).is_ok() {
            n += 1;
        }
        let _ = app.emit("export", json!({ "done": i + 1, "total": total }));
    }
    Ok(Some(json!({ "copied": n, "dest": dest.to_string_lossy() })))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            let thumbs = dir.join("thumbs");
            let previews = dir.join("previews");
            std::fs::create_dir_all(&thumbs)?;
            std::fs::create_dir_all(&previews)?;
            let db_path = dir.join("library.db");
            let conn = db::open(&db_path)?;
            // thumbnails that failed on an older run get another go
            conn.execute("UPDATE media SET thumb = 0 WHERE thumb = 2", [])?;
            app.manage(AppState {
                conn: Mutex::new(conn),
                db_path,
                thumbs,
                previews,
                busy: Arc::new(AtomicBool::new(false)),
                again: Arc::new(AtomicBool::new(false)),
            });
            start_job(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            info, sources, pick_folder, add_source, remove_source, rescan, query, item, counts, cameras,
            set_rating, set_label, set_fav, set_hidden, move_to_trash, albums, album_create, album_rename,
            album_delete, album_add, album_remove, preview, reveal, open_file, open_folder, export
        ])
        .run(tauri::generate_context!())
        .expect("RoarPhotos could not start");
}
