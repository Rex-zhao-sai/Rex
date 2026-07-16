# AGENTS.md

## 项目概览

设备月度保养记录系统，帮助技术员在移动端/桌面端完成设备每月保养工作。支持设备清单浏览、保养照片上传（before/after 对比）、时间戳记录、数据本地存储。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Icons**: lucide-react
- **存储**: localStorage（浏览器端）

## 目录结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 首页 - 设备清单列表
│   ├── globals.css             # 全局样式
│   └── equipment/[id]/page.tsx # 设备保养详情页
├── components/
│   ├── PhotoUploader.tsx       # 照片上传组件（before/after）
│   └── ui/                     # shadcn/ui 组件库
└── lib/
    ├── equipment-data.ts       # 设备清单数据 + 类型定义
    ├── storage.ts              # localStorage 存储工具
    └── utils.ts                # 通用工具函数
```

## 核心功能

### 首页 (`/`)
- 展示全部 84 台设备清单
- 支持搜索过滤
- 显示每月保养完成进度
- 已保养设备显示照片组数和更新时间

### 保养详情页 (`/equipment/[id]`)
- 显示设备名称和当月保养记录
- 技术员姓名和备注输入
- before/after 照片对上传（支持相机直接拍摄）
- 可添加多组照片对（+ 按钮）
- 每组照片记录上传实时时间
- 保存至 localStorage

## 关键文件定位

| 需求 | 文件 |
|------|------|
| 添加/修改设备 | `src/lib/equipment-data.ts` |
| 修改存储逻辑 | `src/lib/storage.ts` |
| 修改首页样式/布局 | `src/app/page.tsx` |
| 修改保养详情页 | `src/app/equipment/[id]/page.tsx` |
| 修改照片上传组件 | `src/components/PhotoUploader.tsx` |

## 构建与测试

```bash
pnpm install        # 安装依赖
pnpm dev            # 开发环境
pnpm build          # 生产构建
pnpm ts-check       # 类型检查
pnpm lint --quiet   # 代码检查
```

## 开发规范

- 仅使用 pnpm 管理依赖
- TypeScript strict 模式，禁止隐式 any
- 客户端组件使用 "use client" 指令
- 移动端优先设计，最大宽度 2xl 居中
- 照片使用 base64 存储在 localStorage
