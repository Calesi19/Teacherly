# Tizara

A desktop app for teachers to manage classes and student information. Runs fully offline — all data is stored locally using SQLite.

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri 2](https://tauri.app/) |
| Frontend | React 19 + TypeScript |
| Styling | [TailwindCSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/) |
| Database | SQLite (via [tauri-plugin-sql](https://github.com/tauri-apps/tauri-plugin-sql)) |
| Bundler | Vite |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- Tauri system dependencies for your OS — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)

## Getting Started

```bash
# Install JS dependencies
npm install

# Start the app in development mode (hot reload)
npm run tauri dev
```

## Building for Production

```bash
npm run tauri build
```

The compiled installer will be placed in `src-tauri/target/release/bundle/`.

## Project Structure

```
src/              # React frontend
src-tauri/        # Rust backend + Tauri config
  src/            # Rust source (commands, database logic)
  tauri.conf.json # App configuration
```

## Database

The SQLite database file is stored in the app's local data directory (managed by Tauri). No internet connection is required at any point.

## IDE Setup

[VS Code](https://code.visualstudio.com/) with the following extensions:
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
