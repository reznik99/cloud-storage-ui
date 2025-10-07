// src/types/filesystem.d.ts

export {};

declare global {
  interface Window {
    showSaveFilePicker: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }

  interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
    excludeAcceptAllOption?: boolean;
  }

  interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
  }

  interface FileSystemFileHandle {
    createWritable: () => Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: BufferSource | Blob | string): Promise<void>;
    close(): Promise<void>;
  }
}
