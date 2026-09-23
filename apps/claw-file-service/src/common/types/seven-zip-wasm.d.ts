import '7z-wasm';

// The Emscripten filesystem 7z-wasm ships has `quit()` — it closes every open
// stream — but the package's own typings leave it out. The engine wrapper calls
// it after every run so a run that crashed mid-read cannot leak the host file
// descriptors NODEFS opened for it.
declare module '7z-wasm' {
  interface FileSystem {
    quit(): void;
  }
}
