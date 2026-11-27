# RoarPhotos (Mac)

A photo and video library for the Mac that works without internet. Alex, 27 Nov 2026: "an app like Google Photos, for
offline, first for macOS".

- Tauri 2: Rust behind (`src-tauri/`), one plain page in front (`src/index.html`, `app.css`, `app.js`, no build step).
- The photos stay where they are. You give it folders or drives (the + by Folders, or drag a folder onto the window);
  it reads them and keeps its own SQLite library (`library.db`), thumbnails and RAW previews in
  `~/Library/Application Support/com.themadlions.roarphotos/`. Nothing is copied, moved or uploaded.
- A scan on every start and on + (`scan.rs`): new and changed files are read, files gone are dropped, a drive that is
  not plugged in is left as it was (its photos come back when it is). Stars, colours, favourites and albums stay.
- What a file says (`meta.rs`): EXIF for photos (date taken, camera, lens, ISO, f, shutter, focal length, GPS, size;
  HEIC and TIFF-based RAW), the moov box for MP4/MOV (date, length, size, and an iPhone's own make, model and place).
- Thumbnails by macOS itself (`thumb.rs`): `sips` for photos (every RAW the Mac can open), Quick Look (`qlmanage`) for
  videos; RAW files get a 3000 px JPEG for the big view, made once.
- The window: the grid by day and month with the years on the right, Photos / Videos / Favourites / Hidden, albums,
  folders, search (name, folder, camera, lens, date), filters (stars, colour, camera), newest or oldest first, tile size.
  Click opens, ⌘-click or the circle selects, Shift-click a range, "Επιλογή όλων" per day.
- Keys (Lightroom's): 0-5 stars, 6 red, 7 yellow, 8 green, 9 blue, F favourite, H hide, E export, C compare,
  ⌘⌫ to the Mac's Trash, arrows, Enter/Space opens, I info, Esc.
- Compare: 2 to 4 side by side, a click shows 100% at the same spot in all of them, the mouse moves them together.
- Export: copies of the originals into a folder you choose (for a client or an editor); names never overwrite.

## Build

- On a Mac: `npm install`, then `npm run dev` (the app with live reload) or `npm run build` (a .dmg in
  `src-tauri/target/release/bundle/dmg/`). Needs Rust (rustup.rs) and the Xcode command line tools.
- At GitHub: every push that touches `roarphotos-mac/` builds it on a Mac (`.github/workflows/roarphotos-mac.yml`, one
  universal app for Apple silicon and Intel); the .dmg is under Artifacts on the run's page.
- The app is not signed yet: the first time, right-click RoarPhotos > Open > Open (or System Settings > Privacy &
  Security > Open Anyway).
- Tests: `cd src-tauri && cargo test` (EXIF from a real JPEG, a hand-made MOV, a scan that keeps ratings).

## Next

Map of the places (offline tiles), search in words and faces on the Mac (a local model, nothing leaves it),
duplicates and near-duplicates, Apple Photos library import, signing and notarising for a normal double-click open.
