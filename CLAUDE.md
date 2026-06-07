# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

个人博客站点，使用 Next.js 16 App Router + 静态导出（SSG），内容以 `.mdx` 文件存储在 `content/` 目录，部署到 Cloudflare Pages。

## 常用命令

```bash
npm run dev       # 本地开发服务器
npm run build     # 生产构建（静态导出到 out/）
npm run preview   # 本地预览 Cloudflare Pages 静态产物
npm run deploy    # 构建并部署到 Cloudflare Pages
```

无测试框架，无 lint 命令（ESLint 集成在 Next.js build 中）。

## 架构概述

### 内容层（`content/`）

所有博客内容为 `.mdx` 文件，按 6 个分类组织：`dev`、`note`、`diary`、`essays`、`opinions`、`travel`。

Frontmatter 格式：
```yaml
---
title: "标题"
date: 2025-11-25
tags: ["tag1", "tag2"]
summary: "摘要"
category: dev
---
```

### 数据层（`src/lib/posts.ts`）

所有内容读取逻辑集中在此单文件。核心函数：`getAllPosts()`、`getPostBySlug(slug)`、`getPostsByCategory()`、`getPostsByTag()`、`searchPosts()`。slug 为相对于 `content/` 的路径（不含 `.mdx` 扩展名）。

### 路由结构（`src/app/`）

| 路由 | 说明 |
|------|------|
| `/` | 首页（英雄区 + 分类卡片 + 最近 6 篇） |
| `/blog` | 全部文章列表，支持分类/标签过滤 |
| `/blog/[...slug]` | 文章详情页，动态路由 |
| `/category/[name]` | 按分类过滤 |
| `/tag/[tag]` | 按标签过滤 |
| `/diary` | 日记专区 |
| `/search` | 客户端全文搜索 |

### 关键设计决策

- **静态导出**：`next.config.ts` 中 `output: 'export'`，全部页面构建时预渲染，无服务端 API。`images.unoptimized: true`（静态模式不支持 Next.js Image Optimization）。
- **MDX 渲染**：使用 `next-mdx-remote/rsc`（Server Components），插件包括 `remark-gfm`、`rehype-slug`、`rehype-autolink-headings`。
- **客户端搜索**：`search-client.tsx` 在浏览器端过滤，无后端依赖。
- **评论系统**：Giscus（基于 GitHub Discussions），组件在 `src/components/giscus.tsx`。

### 主题与样式

Tailwind CSS v4（新版 `@tailwindcss/postcss` 配置方式）。自定义颜色系统定义在 `src/app/globals.css`：
- `cream-*`：暖米色系，主背景为 `cream-25`
- `terra-*`：赤土色系，主强调色为 `terra-600`

字体：Geist Sans（正文）、Geist Mono（代码）、Playfair Display（标题/展示）。文章排版类为 `.prose-article`。

### 路径别名

`@/*` → `./src/*`

## 新增内容

新建文章：在 `content/<category>/` 下创建 `.mdx` 文件，填写 frontmatter，无需修改任何路由代码（`generateStaticParams` 自动扫描）。

## 部署

构建产物在 `out/`（静态文件），通过 Wrangler 部署到 Cloudflare Pages（配置见 `_wrangler_.toml`）。部署目标路径：`.vercel/output/static`。
