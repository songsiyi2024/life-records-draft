# 日迹

一个只使用静态网页和 GitHub 仓库保存文字记录的生活日志。

不使用 Supabase、数据库或 GitHub Issues。所有记录都写在
[`records.js`](./records.js) 中。

## 新增记录

1. 在 GitHub 仓库中打开 `records.js`。
2. 点击右上角的编辑按钮。
3. 在数组最前面增加一条：

   ```js
   {
     date: "2026-07-30",
     description: "今天在上海散步。",
   },
   ```

4. 提交修改。

GitHub Pages 更新后，网页会自动显示新记录。网页支持按月份排列，并可搜索日期
或文字。

## 文件

- `index.html`：网页结构
- `styles.css`：网页样式
- `app.js`：排列和搜索记录
- `records.js`：唯一需要日常编辑的文字记录文件

## 隐私提醒

GitHub Pages 发布的网页通常可以被公开访问。不要在已公开发布的网页中写入不希望
他人看到的内容。
