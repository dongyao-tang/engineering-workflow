## 在线预览

[![Deploy Status](https://github.com/dongyao-tang/engineering-workflow/actions/workflows/deploy.yml/badge.svg)](https://dongyao-tang.github.io/engineering-workflow/)
👉 https://dongyao-tang.github.io/engineering-workflow/

# ProjectFlow AI — Bilingual Engineering Analysis

AI-Assisted Bilingual Project Engineering Workflow

> 本地 Web Demo，面向产品开发流程的AI辅助工作流工具，非通用聊天机器人

## ✨ 项目简介

本项目是一套双语（中/英）工程项目工作流辅助工具，用于标准化项目开发流程、自动提取项目信息、生成方案摘要、汇总周报。
前端为 React + TypeScript，搭配本地 Node HTTP 服务，数据持久化在浏览器 localStorage，适合作为前端+AI应用方向作品集项目。
视频演示：【Video Project】 https://www.bilibili.com/video/BV12YyyzeE82/?share_source=copy_web&vd_source=13481160323f3127785aabaa54ffad9f

## 🛠 Tech Stack

- Frontend: React 19, Vite 6, TypeScript
- Backend: Node.js 22 + tsx（本地轻量HTTP服务）
- I18n: 内置双语切换
- Storage: localStorage（前端本地存储，无需独立数据库）

## 📌 功能清单

1. 项目信息结构化提取
2. 方案生成与评审辅助
3. 周报自动汇总
4. 中英文双语界面切换
5. 本地运行，无需云端部署

## 📦 本地启动

```bash
# 安装依赖
npm install

# 启动开发服务
npm run dev

# 前端打包
npm run build
```
