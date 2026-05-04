# EasyMarkdown 版本管理指南

## 当前版本信息

- **当前版本**: v1.2.0
- **最新提交**: 8a67ba9 (2026-05-04 11:07)
- **版本标签**: v1.2.0

## 版本历史

| 版本     | 提交ID    | 时间               | 说明            |
| ------ | ------- | ---------------- | ------------- |
| v1.2.0 | 8a67ba9 | 2026-05-04 11:07 | 新增右键菜单和语音输入功能 |
| v1.1.0 | 7afa559 | 2026-05-04 11:06 | 初始版本          |

## 常用命令速查

### 查看信息

```bash
# 查看版本历史（简洁版）
git log --oneline

# 查看版本历史（详细版）
git log

# 查看版本历史（图形化）
git log --graph --oneline --all

# 查看最新提交详情
git show

# 查看指定提交详情
git show <提交ID>

# 查看某个文件的修改历史
git log -p <文件路径>

# 查看当前工作区状态
git status

# 查看具体修改内容
git diff

# 查看所有标签
git tag

# 查看标签详情
git show <标签名>
```

### 版本回退

```bash
# 回退到指定版本（保留修改，可恢复）
git checkout <提交ID>

# 回到最新版本
git checkout master

# 彻底回退到指定版本（丢弃修改）⚠️ 慎用
git reset --hard <提交ID>
```

### 创建版本标签

```bash
# 创建轻量标签
git tag v1.3.0

# 创建附注标签（推荐，包含说明信息）
git tag -a v1.3.0 -m "版本说明：新增了xxx功能"

# 删除标签
git tag -d v1.3.0
```

### 提交修改

```bash
# 添加指定文件到暂存区
git add <文件路径>

# 添加所有修改到暂存区
git add .

# 提交修改
git commit -m "提交说明"

# 添加并提交
git commit -am "提交说明"
```

## 版本控制最佳实践

### 1. 提交频率

- ✅ 每完成一个功能就提交
- ✅ 每修复一个 bug 就提交
- ❌ 不要积累大量修改后一次性提交

### 2. 提交说明规范

```
<类型>(<范围>): <简短说明>

<详细说明>

<关联信息>
```

**类型**：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**：

```
feat(editor): 新增右键菜单功能

- 添加剪切/复制/粘贴功能
- 添加语音输入功能
- 添加大小写转换功能

Closes #123
```

### 3. 版本号规范（语义化版本）

格式：`主版本号.次版本号.修订号`

- **主版本号** (Major): 不兼容的 API 修改
- **次版本号** (Minor): 向下兼容的功能性新增
- **修订号** (Patch): 向下兼容的问题修正

**示例**：

- v1.0.0 → v1.0.1: 修复 bug
- v1.0.0 → v1.1.0: 新增功能
- v1.0.0 → v2.0.0: 重大更新，可能不兼容

## 实用技巧

### 1. 查看简洁的版本历史

```bash
git log --oneline --graph --decorate --all
```

### 2. 比较两个版本的差异

```bash
# 比较两个提交
git diff <提交ID1> <提交ID2>

# 比较当前版本与指定版本
git diff <提交ID>
```

### 3. 查看某个文件在指定版本的内容

```bash
git show <提交ID>:<文件路径>
```

### 4. 撤销工作区的修改

```bash
# 撤销指定文件的修改
git checkout -- <文件路径>

# 撤销所有修改
git checkout -- .
```

### 5. 查看提交统计

```bash
# 查看每次提交的修改统计
git log --stat

# 查看指定提交的修改统计
git show --stat
```

## 故障排除

### 1. 误删文件

```bash
git checkout -- <文件路径>
```

### 2. 误提交了不想提交的文件

```bash
# 从暂存区移除（不删除文件）
git reset HEAD <文件路径>
```

### 3. 修改提交说明

```bash
# 修改最新提交的说明
git commit --amend -m "新的提交说明"
```

### 4. 查看操作历史

```bash
git reflog
```

## 备份建议

### 1. 本地备份

```bash
# 复制整个项目文件夹
cp -r EasyMarkdown EasyMarkdown_backup_20260504
```

### 2. 远程备份（推荐）

```bash
# 推送到 GitHub
git remote add origin https://github.com/Cloudzhang0/EasyMarkdown.git
git push -u origin master
```

### 3. 导出特定版本

```bash
# 导出指定版本的代码
git archive --format=zip --output=v1.2.0.zip v1.2.0
```

---

**当前版本**: v1.2.0
**最后更新**: 2026-05-04
