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
