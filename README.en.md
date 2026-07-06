# CoDesign Vault

[简体中文](README.md) · [Development](docs/DEVELOPMENT.md)

A Chrome extension for product and design teams: save Tencent [CoDesign](https://codesign.qq.com) prototype share links and access passwords, and auto-apply credentials when opening shared previews. Paste share text to import in one click.

**Latest version: v1.6.0**

## Features

- Save prototype name, share link, and access password
- Auto-apply credentials on CoDesign share pages—no repeated typing
- Paste full share text to parse name, link, and password
- Supports both `/s/` and `/app/s/` URL formats
- JSON import / export for team collaboration
- UI in Simplified Chinese and English (follows Chrome language)

## Installation

### Option 1: Download a Release (recommended)

For regular users—no need to clone the repository.

1. 在 Releases 下载最新版（**国内推荐 Gitee**）：
   - [Gitee Releases](https://gitee.com/zhang-yunrui/codesign-vault/releases) (China)
   - [GitHub Releases](https://github.com/Salvatore-chen/codesign-vault/releases) (Global)

   File: `codesign-vault-v1.6.0.zip`
2. **Extract** the zip to a permanent folder, e.g. `D:\Tools\codesign-vault\`
3. Open Chrome and go to `chrome://extensions/`
4. Enable **Developer mode** (top right)
5. Click **Load unpacked**
6. Select the extracted folder (e.g. `D:\Tools\codesign-vault\`)

The extension icon should appear in the toolbar.

### Option 2: Clone from source

For developers or anyone who wants to modify the code.

1. Clone the repository:

   ```bash
   git clone git@github.com:Salvatore-chen/codesign-vault.git
   cd codesign-vault
   ```

2. Open `chrome://extensions/`, enable **Developer mode**
3. Click **Load unpacked** and select the repository **root** (the folder containing `manifest.json`)

### Updating

1. Download the new release zip from [Gitee Releases](https://gitee.com/zhang-yunrui/codesign-vault/releases) or [GitHub Releases](https://github.com/Salvatore-chen/codesign-vault/releases) and extract it
2. Open `chrome://extensions/`, find CoDesign Vault, and click **Reload** (if you changed folders, remove the old extension first, then load the new one)

## Usage

### Add a prototype

1. Click the extension icon → **Manage All**, or right-click → **Options**
2. Click **Add Prototype**
3. Paste a CoDesign share message, for example:

   ```
   [CoDesign Share] Product Homepage v1
   https://codesign.qq.com/s/123456789012345
   Password: XXXX
   ```

4. Confirm the parsed fields and click **Save**

You can also fill in name, link, and password manually.

### Open a prototype

- **Popup**: Click a list item or **Open**
- **Options page**: Click **Open** in the saved list

### Team collaboration (import / export)

In the options page toolbar:

| Action | Description |
|--------|-------------|
| **Export** | Download a JSON file to share with teammates |
| **Import** | Select a JSON file to import |

If local data already exists, choose **Merge** (overwrite by link) or **Replace** (clear and import).

> Exported files contain access passwords—share through secure channels.

## Permissions & privacy

| Permission | Purpose |
|------------|---------|
| `storage` | Save prototype data locally (Chrome sync storage) |
| `scripting` | Write credentials to codesign.qq.com |
| `tabs` | Open prototype links in new tabs |
| `webNavigation` | Detect navigation and inject credentials early |
| `codesign.qq.com` | Only site accessed |

- All data stays in local `chrome.storage.sync`
- No collection, upload, or sale of user data
- Used only for `codesign.qq.com`

## Contributing

Issues and Pull Requests are welcome. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for development and build instructions.

## License

[MIT License](LICENSE)

```
Copyright (c) 2026 Salvatore.chen
```
