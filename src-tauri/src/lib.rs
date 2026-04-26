use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Emitter;
use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

#[derive(serde::Serialize, serde::Deserialize)]
pub struct SavedFile {
    pub name: String,
    pub content: String,
}

// Managed state: holds the stop flag for the current watcher thread
struct WatcherHandle(Mutex<Option<Arc<AtomicBool>>>);

#[tauri::command]
async fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let folder = app
        .dialog()
        .file()
        .set_title("Escolha a pasta de backup")
        .blocking_pick_folder();

    Ok(folder.map(|p| p.to_string()))
}

#[tauri::command]
async fn save_file(folder: String, name: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(&folder).join(&name);
    fs::write(&path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_file(folder: String, name: String) -> Result<(), String> {
    let path = PathBuf::from(&folder).join(&name);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer.exe")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn load_files(folder: String) -> Result<Vec<SavedFile>, String> {
    let dir = PathBuf::from(&folder);
    if !dir.exists() {
        return Ok(vec![]);
    }

    let extensions = ["html", "css", "js", "md", "ts", "tsx", "jsx", "txt", "json", "svg"];
    let mut files = vec![];

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            let ext = path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            if extensions.contains(&ext.as_str()) {
                let name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                let content = fs::read_to_string(&path).unwrap_or_default();
                files.push(SavedFile { name, content });
            }
        }
    }

    Ok(files)
}

fn snapshot_folder(folder: &str) -> Vec<(String, u64)> {
    let extensions = ["html", "css", "js", "md", "ts", "tsx", "jsx", "txt", "json", "svg"];
    let dir = PathBuf::from(folder);
    let mut entries = vec![];

    if let Ok(read) = fs::read_dir(&dir) {
        for entry in read.flatten() {
            let path = entry.path();
            if !path.is_file() { continue; }
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
            if !extensions.contains(&ext.as_str()) { continue; }
            let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
            let modified = entry.metadata().ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);
            entries.push((name, modified));
        }
    }

    entries.sort();
    entries
}

#[tauri::command]
async fn start_folder_watch(
    app: tauri::AppHandle,
    folder: String,
    watcher: tauri::State<'_, WatcherHandle>,
) -> Result<(), String> {
    // Stop any existing watcher
    let stop = Arc::new(AtomicBool::new(false));
    {
        let mut guard = watcher.0.lock().unwrap();
        if let Some(old) = guard.take() {
            old.store(true, Ordering::Relaxed);
        }
        *guard = Some(Arc::clone(&stop));
    }

    std::thread::spawn(move || {
        let mut prev = snapshot_folder(&folder);
        loop {
            std::thread::sleep(std::time::Duration::from_millis(1000));
            if stop.load(Ordering::Relaxed) { break; }

            // Folder itself was deleted
            if !PathBuf::from(&folder).exists() {
                let _ = app.emit("folder-deleted", ());
                break;
            }

            let current = snapshot_folder(&folder);
            if current != prev {
                prev = current;
                let _ = app.emit("folder-changed", ());
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn stop_folder_watch(watcher: tauri::State<'_, WatcherHandle>) -> Result<(), String> {
    let mut guard = watcher.0.lock().unwrap();
    if let Some(flag) = guard.take() {
        flag.store(true, Ordering::Relaxed);
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WatcherHandle(Mutex::new(None)))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let quit = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Mostrar", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Notecoder")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            pick_folder,
            save_file,
            delete_file,
            load_files,
            open_folder,
            start_folder_watch,
            stop_folder_watch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
