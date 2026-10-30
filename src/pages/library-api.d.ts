// API exposée par internal-preload.ts aux pages internes (accueil, bibliothèque)

interface LibraryEntry {
  url: string;
  title: string;
  favicon: string | null;
  time: number;
}

declare const jamaLibrary: {
  get(): Promise<{ bookmarks: LibraryEntry[]; history: LibraryEntry[] }>;
  removeBookmark(url: string): void;
  removeVisit(time: number): void;
  clearHistory(): void;
  onChange(callback: () => void): void;
};

interface DownloadEntry {
  id: number;
  url: string;
  filename: string;
  path: string;
  state: 'progressing' | 'paused' | 'completed' | 'cancelled' | 'interrupted';
  received: number;
  total: number;
  time: number;
}

declare const jamaDownloads: {
  get(): Promise<DownloadEntry[]>;
  open(id: number): void;
  showInFolder(id: number): void;
  cancel(id: number): void;
  togglePause(id: number): void;
  remove(id: number): void;
  clear(): void;
  onChange(callback: () => void): void;
};
