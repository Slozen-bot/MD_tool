use tauri_plugin_dialog::DialogExt;
use serde::Serialize;
use std::sync::Mutex;
use std::path::PathBuf;

struct ApprovedPaths(pub Mutex<Vec<PathBuf>>);

fn is_path_allowed(path: &str, approved_paths: &[PathBuf]) -> bool {
    let target = PathBuf::from(path);
    // 规范化路径，防止 .. 遍历
    let canonical = match std::fs::canonicalize(&target) {
        Ok(c) => c,
        Err(_) => target,
    };
    approved_paths.iter().any(|base| {
        let canonical_base = match std::fs::canonicalize(base) {
            Ok(c) => c,
            Err(_) => base.clone(),
        };
        canonical.starts_with(&canonical_base)
    })
}

fn sanitize_error(e: &std::io::Error) -> String {
    // 脱敏：不返回内部文件系统路径等敏感信息
    match e.kind() {
        std::io::ErrorKind::NotFound => "文件不存在".to_string(),
        std::io::ErrorKind::PermissionDenied => "权限不足".to_string(),
        std::io::ErrorKind::AlreadyExists => "文件已存在".to_string(),
        _ => "操作失败".to_string(),
    }
}

#[derive(Serialize)]
pub struct OpenFileResult {
    pub canceled: bool,
    #[serde(rename = "filePath")]
    pub file_path: Option<String>,
    pub content: Option<String>,
}

#[derive(Serialize)]
pub struct SaveResult {
    pub success: bool,
    #[serde(rename = "filePath")]
    pub file_path: Option<String>,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct FileTreeNode {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    pub children: Option<Vec<FileTreeNode>>,
}

#[tauri::command]
async fn open_file(app: tauri::AppHandle, state: tauri::State<'_, ApprovedPaths>) -> Result<OpenFileResult, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .blocking_pick_file();

    match file {
        Some(file_path) => {
            let path = file_path.to_string();
            match std::fs::read_to_string(&path) {
                Ok(content) => {
                    // 记录批准路径
                    if let Ok(canonical) = std::fs::canonicalize(&path) {
                        if let Some(parent) = canonical.parent() {
                            let mut approved = state.0.lock().unwrap();
                            if !approved.iter().any(|p| parent.starts_with(p)) {
                                approved.push(parent.to_path_buf());
                            }
                        }
                    }
                    Ok(OpenFileResult {
                        canceled: false,
                        file_path: Some(path),
                        content: Some(content),
                    })
                }
                Err(e) => Err(sanitize_error(&e)),
            }
        }
        None => Ok(OpenFileResult {
            canceled: true,
            file_path: None,
            content: None,
        }),
    }
}

#[tauri::command]
async fn save_file(file_path: String, content: String, state: tauri::State<'_, ApprovedPaths>) -> Result<SaveResult, String> {
    {
        let approved = state.0.lock().unwrap();
        if !is_path_allowed(&file_path, &approved) {
            return Ok(SaveResult {
                success: false,
                file_path: None,
                error: Some("保存路径不在允许的目录范围内".to_string()),
            });
        }
    }
    match std::fs::write(&file_path, content.as_bytes()) {
        Ok(_) => Ok(SaveResult {
            success: true,
            file_path: Some(file_path),
            error: None,
        }),
        Err(e) => Ok(SaveResult {
            success: false,
            file_path: None,
            error: Some(sanitize_error(&e)),
        }),
    }
}

#[tauri::command]
async fn save_file_dialog(app: tauri::AppHandle, content: String, state: tauri::State<'_, ApprovedPaths>) -> Result<SaveResult, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .blocking_save_file();

    match file {
        Some(file_path) => {
            let path = file_path.to_string();
            match std::fs::write(&path, content.as_bytes()) {
                Ok(_) => {
                    // 记录批准路径
                    if let Ok(canonical) = std::fs::canonicalize(&path) {
                        if let Some(parent) = canonical.parent() {
                            let mut approved = state.0.lock().unwrap();
                            if !approved.iter().any(|p| parent.starts_with(p)) {
                                approved.push(parent.to_path_buf());
                            }
                        }
                    }
                    Ok(SaveResult {
                        success: true,
                        file_path: Some(path),
                        error: None,
                    })
                }
                Err(e) => Ok(SaveResult {
                    success: false,
                    file_path: None,
                    error: Some(sanitize_error(&e)),
                }),
            }
        }
        None => Ok(SaveResult {
            success: false,
            file_path: None,
            error: None,
        }),
    }
}

#[tauri::command]
async fn export_html(app: tauri::AppHandle, content: String) -> SaveResult {
    let file = app
        .dialog()
        .file()
        .add_filter("HTML", &["html"])
        .blocking_save_file();

    match file {
        Some(file_path) => {
            let path = file_path.to_string();
            match std::fs::write(&path, content.as_bytes()) {
                Ok(_) => SaveResult {
                    success: true,
                    file_path: Some(path),
                    error: None,
                },
                Err(e) => SaveResult {
                    success: false,
                    file_path: None,
                    error: Some(sanitize_error(&e)),
                },
            }
        }
        None => SaveResult {
            success: false,
            file_path: None,
            error: None,
        },
    }
}

fn read_dir_children(path: &str) -> Result<Vec<FileTreeNode>, String> {
    let entries = std::fs::read_dir(path).map_err(|e| sanitize_error(&e))?;
    let mut children = entries
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let file_type = entry.file_type().ok()?;
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                return None;
            }
            Some(FileTreeNode {
                name,
                path: entry.path().to_string_lossy().to_string(),
                is_directory: file_type.is_dir(),
                children: None,
            })
        })
        .collect::<Vec<_>>();

    children.sort_by(|a, b| {
        b.is_directory
            .cmp(&a.is_directory)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(children)
}

#[tauri::command]
async fn open_folder(app: tauri::AppHandle, state: tauri::State<'_, ApprovedPaths>) -> Result<Option<String>, String> {
    let folder = app.dialog().file().blocking_pick_folder();
    match folder {
        Some(path) => {
            let path_str = path.to_string();
            if let Ok(canonical) = std::fs::canonicalize(&path_str) {
                let mut approved = state.0.lock().unwrap();
                if !approved.iter().any(|p| canonical.starts_with(p)) {
                    approved.push(canonical);
                }
            }
            Ok(Some(path_str))
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn get_folder_tree(path: String, state: tauri::State<'_, ApprovedPaths>) -> Result<Vec<FileTreeNode>, String> {
    {
        let approved = state.0.lock().unwrap();
        if !is_path_allowed(&path, &approved) {
            return Err("目录路径不在允许的范围内".to_string());
        }
    }
    read_dir_children(&path)
}

#[tauri::command]
async fn read_file_text(path: String, state: tauri::State<'_, ApprovedPaths>) -> Result<String, String> {
    {
        let approved = state.0.lock().unwrap();
        if !is_path_allowed(&path, &approved) {
            return Err("文件路径不在允许的目录范围内".to_string());
        }
    }
    std::fs::read_to_string(&path).map_err(|e| sanitize_error(&e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(ApprovedPaths(Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![
            open_file,
            save_file,
            save_file_dialog,
            export_html,
            open_folder,
            get_folder_tree,
            read_file_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
