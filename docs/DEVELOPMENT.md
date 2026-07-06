# 开发文档 · Development Guide

[简体中文 README](../README.md) · [English README](../README.en.md)

本文档面向贡献者与维护者，涵盖项目结构、本地开发、打包构建与 Chrome 商店发布。

---

## 环境要求

| 项目 | 要求 |
|------|------|
| 浏览器 | Google Chrome 109+ |
| 操作系统 | 扩展本身跨平台；打包脚本为 PowerShell（Windows） |
| Node.js | 可选，仅用于 `npm run build` 快捷命令 |

## 项目结构

```
codesign-vault/
├── manifest.json              # 扩展清单（版本号在此维护）
├── background/
│   └── service-worker.js      # 密码注入、打开链接、缓存同步
├── content/
│   └── content.js             # SPA 路由变化时通知 background
├── popup/                     # 工具栏弹窗
├── options/                   # 配置管理页（含导入/导出）
├── shared/
│   ├── i18n.js                # 国际化工具
│   ├── parse.js               # 分享文本解析
│   ├── storage.js             # chrome.storage.sync 读写
│   └── import-export.js       # JSON 导入/导出
├── _locales/
│   ├── zh_CN/messages.json    # 简体中文
│   └── en/messages.json       # English
├── icons/                     # 16 / 48 / 128 图标
├── scripts/build.ps1          # 打包脚本
├── store/manifest.meta.json   # Chrome 商店文案参考（不打包进扩展）
├── docs/DEVELOPMENT.md        # 本文档
├── README.md                  # 用户文档（中文）
└── README.en.md               # 用户文档（英文）
```

## 本地开发

### 加载扩展

1. 克隆仓库：

   ```bash
   git clone git@github.com:Salvatore-chen/codesign-vault.git
   cd codesign-vault
   ```

2. 打开 `chrome://extensions/`，开启 **开发者模式**

3. 点击 **加载已解压的扩展程序**，选择项目**根目录**（含 `manifest.json` 的目录）

4. 修改代码后，在扩展管理页点击 **重新加载**

> 日常开发直接加载源码目录即可，无需先执行 build。

### 调试

| 模块 | 调试方式 |
|------|----------|
| Options / Popup | 右键页面 → 检查 |
| Background | 扩展管理页 → Service Worker → 检查 |
| Content Script | 在 codesign.qq.com 页面 DevTools → Sources |

### 修改文案（i18n）

编辑 `_locales/zh_CN/messages.json` 与 `_locales/en/messages.json`，然后在扩展管理页重新加载。

HTML 中使用 `data-i18n`、`data-i18n-placeholder` 等属性，由 `shared/i18n.js` 的 `applyI18n()` 填充。

### 版本号

在 `manifest.json` 的 `version` 字段维护，发版前同步更新 `package.json`。

## 打包构建

### 命令

```powershell
npm run build
```

或直接运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1
```

### 输出产物

| 产物 | 路径 | 用途 |
|------|------|------|
| 发布目录 | `dist/` | 本地验证打包结果、加载测试 |
| 商店 zip | `dist/codesign-vault-v{version}.zip` | 上传 Chrome Web Store |

`dist/` 与 `*.zip` 已在 `.gitignore` 中忽略，**不要提交到 Git**。

### 打包包含内容

```
dist/
├── manifest.json
├── _locales/
├── background/
├── content/
├── icons/
├── options/
├── popup/
└── shared/
```

**不包含**：`README.md`、`docs/`、`scripts/`、`store/`、`package.json`、`.gitignore`

### 验证打包结果

1. 在 `chrome://extensions/` 移除开发中的扩展
2. **加载已解压的扩展程序** → 选择 `dist/` 文件夹
3. 验证弹窗、配置页、打开原型、导入/导出功能

## GitHub / Gitee 双仓库同步

GitHub 为主仓库，Gitee 为国内镜像：

| 平台 | 仓库 | Release |
|------|------|---------|
| GitHub | https://github.com/Salvatore-chen/codesign-vault | 自动发版 |
| Gitee | https://gitee.com/zhang-yunrui/codesign-vault | 自动同步 |

### 自动化 Workflow

| 文件 | 触发 | 作用 |
|------|------|------|
| `.github/workflows/release.yml` | 推送 `v*` tag | GitHub Release + Gitee Release（上传 zip） |
| `.github/workflows/sync-gitee.yml` | 推送 `master` 或 `v*` tag | 同步代码与 tags 到 Gitee |

### 首次配置（GitHub Secrets）

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中添加：

#### `GITEE_TOKEN`（必填）

用于 `sync-gitee.yml` 推送代码/tags，以及 `release.yml` 在 Gitee 创建 Release 并上传 zip。

1. Gitee → **设置** → **私人令牌** → 生成令牌（勾选 `projects` 权限，需具备仓库读写能力）
2. 粘贴到 GitHub Secret `GITEE_TOKEN`

> **注意：** Gitee 的**部署公钥**默认只读，不能 push。若用 SSH 推送出现 `DeployKey does not support push code`，说明公钥加在了仓库部署公钥里；CI 已改用 HTTPS + `GITEE_TOKEN`，无需再配置 `GITEE_SSH_PRIVATE_KEY`。

### 发版后同步流程

```bash
git push origin master          # → 触发 sync-gitee，同步 master 到 Gitee
git tag v1.7.0 && git push origin v1.7.0
# → 触发 release.yml（GitHub + Gitee Release）
# → 触发 sync-gitee.yml（fetch master 后同步分支与 tags）
```

### 本地手动推送到 Gitee（可选）

```bash
git remote add gitee git@gitee.com:zhang-yunrui/codesign-vault.git
git push gitee master
git push gitee --tags
```

## GitHub Release（自动化）

仓库已配置 `.github/workflows/release.yml`：推送 `v*` 标签时自动打包并创建 Release，上传 `codesign-vault-v{version}.zip`。

### 发版步骤

1. 更新 `manifest.json`（及 `package.json`）中的版本号
2. 提交并推送到 `master`
3. 创建并推送 tag（版本号需与 manifest 一致）：

   ```bash
   git tag v1.6.0
   git push origin v1.6.0
   ```

4. 在 GitHub **Actions** 页查看构建进度
5. 完成后在 [GitHub Releases](https://github.com/Salvatore-chen/codesign-vault/releases) 或 [Gitee Releases](https://gitee.com/zhang-yunrui/codesign-vault/releases) 下载 zip

### 本地手动发版（可选）

若未使用 CI，也可本地 build 后手动创建 Release：

```powershell
npm run build
gh release create v1.6.0 dist/codesign-vault-v1.6.0.zip --title "v1.6.0" --generate-notes
```

## Chrome 网上应用店发布（可选）

1. 执行 `npm run build` 生成 zip
2. 打开 [Chrome 开发者控制台](https://chrome.google.com/webstore/devconsole)
3. 上传 `dist/codesign-vault-v*.zip`
4. 填写商店信息，文案参考 `store/manifest.meta.json`：
   - 中英文描述
   - 权限说明
   - 截图（1280×800 或 640×400）
5. 提供**隐私政策 URL**（扩展会存储访问密码）

### zip 与本地安装的区别

| 方式 | 说明 |
|------|------|
| 加载 `dist/` 文件夹 | 开发者模式，本地测试 |
| 上传 zip 到商店 | 公开发布，用户从商店安装 |
| 拖拽 zip 到浏览器 | ❌ Chrome 不支持 |

## 核心机制

CoDesign 分享页通过 `localStorage` 的 `secret_{prototypeId}` 读取访问密码。

扩展在页面加载早期（`webNavigation.onCommitted` + content script 监听 SPA 路由）将已保存密码写入该键，避免页面 API 请求时尚未就绪导致「密码错误」。

## 贡献流程

1. Fork 仓库并创建分支
2. 加载未打包扩展进行开发与测试
3. 若改动了 i18n，同步更新 `zh_CN` 与 `en`
4. 发版前更新 `manifest.json` 版本号并执行 `npm run build` 验证
5. 提交 Pull Request

## 相关链接

- GitHub：https://github.com/Salvatore-chen/codesign-vault
- Gitee：https://gitee.com/zhang-yunrui/codesign-vault
- License：[MIT](../LICENSE)
