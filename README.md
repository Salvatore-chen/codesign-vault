# CoDesign 原型库

[English](README.en.md) · [开发文档](docs/DEVELOPMENT.md)

专为国内产品与设计团队打造的 Chrome 扩展：保存腾讯 [CoDesign](https://codesign.qq.com) 原型分享链接与访问密码，打开分享页时自动完成验证，支持粘贴分享文本一键导入。

**当前最新版本：v1.6.0**

## 功能

- 保存原型名称、分享链接、访问密码
- 打开 CoDesign 分享页时自动应用访问密码，无需重复输入
- 粘贴完整分享文本，自动解析名称、链接、密码
- 兼容 `/s/` 与 `/app/s/` 两种链接格式
- 支持 JSON 导入 / 导出，方便团队共享配置
- 界面支持简体中文与 English（跟随 Chrome 语言）

## 安装

### 方式一：下载 Release 包（推荐）

适合普通用户，无需克隆源码。

1. 打开 [GitHub Releases](https://github.com/Salvatore-chen/codesign-vault/releases)，下载最新版 `codesign-vault-v1.6.0.zip`
2. 将 zip **解压到一个固定目录**，例如 `D:\Tools\codesign-vault\`
3. 打开 Chrome，访问 `chrome://extensions/`
4. 开启右上角 **开发者模式**
5. 点击 **加载已解压的扩展程序**
6. 选择上一步解压后的文件夹（例如 `D:\Tools\codesign-vault\`）

安装完成后，浏览器工具栏会出现扩展图标。

### 方式二：克隆源码安装

适合开发者或需要自行修改的用户。

1. 克隆仓库并进入目录：

   ```bash
   git clone git@github.com:Salvatore-chen/codesign-vault.git
   cd codesign-vault
   ```

2. 打开 `chrome://extensions/`，开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**，选择仓库**根目录**（含 `manifest.json` 的目录）

### 更新扩展

1. 在 Releases 下载新版本的 zip 并解压（可覆盖原目录，或解压到新目录后重新加载）
2. 打开 `chrome://extensions/`，找到 CoDesign 原型库，点击 **重新加载**（若更换了目录，需先移除旧扩展再重新加载）

## 使用说明

### 添加原型

1. 点击扩展图标 → **管理全部**，或右键扩展 → **选项**
2. 点击 **添加原型**
3. 粘贴 CoDesign 分享文本，例如：

   ```
   【CoDesign 原型分享】产品首页原型 v1
   https://codesign.qq.com/s/123456789012345
   密码: XXXX
   ```

4. 确认解析结果后点击 **保存**

也支持在弹窗中手动填写名称、链接和密码。

### 打开原型

- **弹窗**：点击列表项，或点击 **打开**
- **配置页**：在已保存列表中点击 **打开**

### 团队协作（导入 / 导出）

在配置页「已保存的原型」右上角：

| 操作 | 说明 |
|------|------|
| **导出** | 下载 JSON 文件，分享给团队成员 |
| **导入** | 选择 JSON 文件导入配置 |

导入时若本地已有数据，可选择 **合并**（相同链接覆盖）或 **替换**（清空后导入）。

> 导出文件包含访问密码，请通过安全渠道分享。

## 权限与隐私

| 权限 | 用途 |
|------|------|
| `storage` | 本地保存原型数据（Chrome 同步存储） |
| `scripting` | 向 codesign.qq.com 写入访问凭证 |
| `tabs` | 在新标签页打开原型链接 |
| `webNavigation` | 检测页面导航并尽早注入凭证 |
| `codesign.qq.com` | 唯一访问的站点 |

- 所有数据保存在本机 `chrome.storage.sync`
- 不收集、不上传、不出售用户数据
- 仅用于访问 `codesign.qq.com`

## 参与贡献

欢迎提交 Issue 与 Pull Request。开发、打包说明见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

## License

本项目采用 [MIT License](LICENSE) 开源。

```
Copyright (c) 2026 Salvatore.chen
```
