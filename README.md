# CoDesign 原型库

专为国内产品与设计团队打造的 Chrome 扩展：保存腾讯 [CoDesign](https://codesign.qq.com) 原型分享链接与访问密码，打开分享页时自动完成验证，支持粘贴分享文本一键导入。

> English name: **CoDesign Vault** · Default locale: `zh_CN` · Also supports English UI

## 功能

- 保存原型名称、分享链接、访问密码
- 打开 CoDesign 分享页时，自动写入 `localStorage`（`secret_{id}`），免去重复输入密码
- 粘贴完整分享文本，自动解析名称、链接、密码
- 兼容 `/s/` 与 `/app/s/` 两种链接格式
- 弹窗快速打开，配置页统一管理（编辑 / 删除）
- 界面支持简体中文与 English（跟随 Chrome 语言）

## 项目结构

```
├── manifest.json          # 扩展清单
├── background/            # Service Worker（密码注入、打开链接）
├── content/               # Content Script（SPA 路由监听）
├── popup/                 # 浏览器工具栏弹窗
├── options/               # 配置管理页
├── shared/                # 公共模块（i18n、解析、存储）
├── _locales/              # 国际化文案（zh_CN / en）
├── icons/                 # 扩展图标
├── scripts/build.ps1      # 打包脚本
└── store/manifest.meta.json  # Chrome 商店文案参考（不含在发布包内）
```

## 本地开发

### 环境要求

- Google Chrome 109+
- Windows（打包脚本为 PowerShell；扩展本身跨平台可用）

### 加载未打包扩展

1. 打开 `chrome://extensions/`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择本项目根目录（不是 `dist`）

修改代码后在扩展管理页点击 **重新加载** 即可。

## 使用说明

### 添加原型

1. 右键扩展图标 → **选项**，或从弹窗进入配置页
2. 点击 **添加原型**
3. 在弹窗中粘贴 CoDesign 分享文本，例如：

   ```
   【CoDesign 原型分享】产品首页原型 v1
   https://codesign.qq.com/s/123456789012345
   密码: XXXX
   ```

4. 确认解析结果后点击 **保存**

### 打开原型

- **弹窗**：点击列表项或 **打开** 按钮
- **配置页**：在已保存列表中点击 **打开**

## 打包发布

```powershell
npm run build
```

输出：

| 产物 | 路径 |
|------|------|
| 可测试目录 | `dist/` |
| 商店上传包 | `dist/codesign-vault-v{version}.zip` |

`dist` 与 zip 已在 `.gitignore` 中忽略，无需提交。

### 上传 Chrome Web Store

1. 打开 [Chrome 开发者控制台](https://chrome.google.com/webstore/devconsole)
2. 上传 `dist/codesign-vault-v*.zip`
3. 商店描述、权限说明可参考 `store/manifest.meta.json`
4. 需提供隐私政策 URL（扩展会存储访问密码）

## 权限说明

| 权限 | 用途 |
|------|------|
| `storage` | 本地保存原型数据（Chrome 同步存储） |
| `scripting` | 向 codesign.qq.com 页面写入访问凭证 |
| `tabs` | 在新标签页打开原型链接 |
| `webNavigation` | 尽早检测页面导航并注入凭证 |
| `codesign.qq.com` | 唯一访问的站点 |

## 隐私

- 所有数据保存在用户本机 `chrome.storage.sync`
- 不收集、不上传、不出售用户数据
- 仅用于访问 `codesign.qq.com`

## 团队协作

- 提交前请在本地加载扩展验证功能
- 版本号在 `manifest.json` 中维护，发版前执行 `npm run build`
- 文案修改：编辑 `_locales/zh_CN/messages.json` 与 `_locales/en/messages.json`
- 商店上架文案：编辑 `store/manifest.meta.json`（不打包进扩展）

## 技术说明

CoDesign 分享页通过 `localStorage` 的 `secret_{prototypeId}` 读取访问密码。扩展在页面加载早期（`webNavigation` + content script）将已保存密码写入该键，避免页面发起验证请求时尚未就绪。

## License

本项目采用 [MIT License](LICENSE) 开源，可自由使用、修改、分发与商用；使用时需保留版权说明与许可原文。

```
Copyright (c) 2026 Salvatore.chen
```

欢迎提交 Issue 与 Pull Request。如需改用 [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html) 或 [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)，请在开源前替换 `LICENSE` 文件。
