import { useCallback, useEffect, useRef, useState } from "react";
import type { FileItem } from "@/components/atom/Sidebar";

const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

const STORAGE_KEY = "notecoder-backup-folder";

export type SyncStatus = "idle" | "saving" | "saved" | "error";

export function useBackupFolder(onExternalChange?: () => void) {
  const [folder, setFolderState] = useState<string | null>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onExternalChangeRef = useRef(onExternalChange);
  onExternalChangeRef.current = onExternalChange;

  // Start/stop Rust watcher when folder changes, and listen for folder-changed events
  useEffect(() => {
    if (!folder || !isTauri()) return;

    let unlisten: (() => void) | null = null;

    (async () => {
      // Start the Rust polling watcher
      await invoke("start_folder_watch", { folder }).catch(console.error);

      // Listen for events emitted by Rust
      const { listen } = await import("@tauri-apps/api/event");
      const unlistenChanged = await listen("folder-changed", () => {
        onExternalChangeRef.current?.();
      });
      const unlistenDeleted = await listen("folder-deleted", () => {
        localStorage.removeItem(STORAGE_KEY);
        setFolderState(null);
        setSyncStatus("idle");
      });
      unlisten = () => { unlistenChanged(); unlistenDeleted(); };
    })();

    return () => {
      unlisten?.();
      invoke("stop_folder_watch").catch(console.error);
    };
  }, [folder]);

  const pickFolder = useCallback(async () => {
    if (!isTauri()) return;
    try {
      const picked = await invoke<string | null>("pick_folder");
      if (picked) {
        localStorage.setItem(STORAGE_KEY, picked);
        setFolderState(picked);
      }
    } catch (e) {
      console.error("Erro ao escolher pasta:", e);
    }
  }, []);

  const clearFolder = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setFolderState(null);
    setSyncStatus("idle");
    invoke("stop_folder_watch").catch(console.error);
  }, []);

  const loadFiles = useCallback(async (): Promise<Array<{ name: string; content: string }> | null> => {
    if (!isTauri() || !folder) return [];
    try {
      return await invoke<Array<{ name: string; content: string }>>("load_files", { folder });
    } catch (e) {
      console.error("Pasta não encontrada:", e);
      return null;
    }
  }, [folder]);

  const saveFiles = useCallback(
    async (files: FileItem[]) => {
      if (!isTauri() || !folder) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setSyncStatus("saving");
        try {
          await Promise.all(
            files.map((f) =>
              invoke("save_file", { folder, name: f.name, content: f.content })
            )
          );
          setSyncStatus("saved");
          setTimeout(() => setSyncStatus("idle"), 2000);
        } catch (e) {
          console.error("Erro ao salvar arquivos:", e);
          setSyncStatus("error");
        }
      }, 800);
    },
    [folder]
  );

  const deleteFile = useCallback(
    async (name: string) => {
      if (!isTauri() || !folder) return;
      try {
        await invoke("delete_file", { folder, name });
      } catch (e) {
        console.error("Erro ao deletar arquivo:", e);
      }
    },
    [folder]
  );

  const openFolder = useCallback(async () => {
    if (!isTauri() || !folder) return;
    try {
      await invoke("open_folder", { path: folder });
    } catch (e) {
      console.error("Erro ao abrir pasta:", e);
    }
  }, [folder]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    folder,
    syncStatus,
    pickFolder,
    clearFolder,
    loadFiles,
    saveFiles,
    deleteFile,
    openFolder,
    isTauriEnv: isTauri(),
  };
}
