# 学习任务 & 番茄钟记录网站

一个简单的学习任务管理和番茄钟记录工具，使用 Python Flask + SQLite + 纯 HTML/JS 构建。

## 功能特性

- 📝 **学习任务管理**: 添加、删除、标记完成，支持标题、科目分类、计划日期、预计用时、备注
- 📅 **任务查看**: 按日期查看当天任务，或查看全部任务
- 🍅 **番茄钟记录**: 为每个任务添加学习记录，记录开始时间、学习分钟数和总结
- 📊 **统计功能**: 按月统计总任务数、完成数、未完成数、累计学习时长，按科目分类统计

## 项目结构

```
.
├── README.md
├── backend/
│   ├── app.py          # Flask 后端主程序
│   ├── db.py           # 数据库模块
│   └── requirements.txt # Python 依赖
└── frontend/
    ├── index.html      # 前端页面
    ├── style.css       # 样式文件
    └── script.js       # 前端脚本
```

## 安装依赖

1. 进入后端目录：

```bash
cd backend
```

2. 安装 Python 依赖：

```bash
pip install -r requirements.txt
```

## 启动项目

1. 确保已安装依赖
2. 在 `backend` 目录下运行：

```bash
python app.py
```

3. 打开浏览器访问 http://localhost:5000

启动时会自动创建数据库文件 `study.db`。

## 数据库表结构

### tasks 表（学习任务表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | 任务 ID |
| title | TEXT NOT NULL | 任务标题 |
| subject | TEXT | 科目分类 |
| plan_date | TEXT | 计划日期 (YYYY-MM-DD) |
| estimated_minutes | INTEGER | 预计用时(分钟) |
| notes | TEXT | 备注 |
| is_done | INTEGER DEFAULT 0 | 是否完成 (0=未完成, 1=已完成) |
| created_at | TEXT DEFAULT CURRENT_TIMESTAMP | 创建时间 |

### records 表（学习记录表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | 记录 ID |
| task_id | INTEGER NOT NULL | 关联的任务 ID (外键) |
| start_time | TEXT | 开始时间 |
| duration_minutes | INTEGER | 学习分钟数 |
| summary | TEXT | 学习总结 |
| created_at | TEXT DEFAULT CURRENT_TIMESTAMP | 创建时间 |

## API 接口说明

### 1. 获取所有任务

```
GET /api/tasks
```

返回所有任务列表，按创建时间倒序排列。

**响应示例：**
```json
[
  {
    "id": 1,
    "title": "学习 Flask",
    "subject": "编程",
    "plan_date": "2026-06-21",
    "estimated_minutes": 60,
    "notes": "学习路由和模板",
    "is_done": 0,
    "created_at": "2026-06-21 10:00:00"
  }
]
```

### 2. 按日期获取任务

```
GET /api/tasks/day?date=YYYY-MM-DD
```

**参数：**
- `date`: 日期，格式 YYYY-MM-DD

**响应示例：** 同上

### 3. 创建任务

```
POST /api/tasks
Content-Type: application/json
```

**请求体：**
```json
{
  "title": "任务标题",
  "subject": "科目",
  "plan_date": "2026-06-21",
  "estimated_minutes": 30,
  "notes": "备注信息"
}
```

**响应示例：** 返回创建的任务对象，状态码 201

### 4. 切换任务完成状态

```
PATCH /api/tasks/:id/done
```

**参数：**
- `id`: 任务 ID

**响应示例：** 返回更新后的任务对象

### 5. 删除任务

```
DELETE /api/tasks/:id
```

**参数：**
- `id`: 任务 ID

**响应示例：**
```json
{
  "message": "Task deleted successfully"
}
```

### 6. 添加学习记录

```
POST /api/tasks/:id/records
Content-Type: application/json
```

**参数：**
- `id`: 任务 ID

**请求体：**
```json
{
  "start_time": "2026-06-21 14:00:00",
  "duration_minutes": 25,
  "summary": "学习了 Flask 路由"
}
```

**响应示例：** 返回创建的记录对象，状态码 201

### 7. 获取学习记录

```
GET /api/records?taskId=1
```

**参数：**
- `taskId` (可选): 任务 ID，不传则返回所有记录

**响应示例：**
```json
[
  {
    "id": 1,
    "task_id": 1,
    "start_time": "2026-06-21 14:00:00",
    "duration_minutes": 25,
    "summary": "学习了 Flask 路由",
    "created_at": "2026-06-21 14:25:00"
  }
]
```

### 8. 获取月度统计

```
GET /api/stats?month=YYYY-MM
```

**参数：**
- `month`: 月份，格式 YYYY-MM

**响应示例：**
```json
{
  "month": "2026-06",
  "total_tasks": 10,
  "completed_tasks": 6,
  "uncompleted_tasks": 4,
  "total_study_minutes": 240,
  "by_subject": [
    {
      "subject": "编程",
      "task_count": 5,
      "total_minutes": 150
    },
    {
      "subject": "英语",
      "task_count": 3,
      "total_minutes": 90
    }
  ]
}
```

## 接口测试命令

以下所有命令均可在终端中直接运行测试（需先启动服务）：

```bash
# 1. 获取所有任务
curl http://localhost:5000/api/tasks

# 2. 获取指定日期的任务
curl "http://localhost:5000/api/tasks/day?date=2026-06-21"

# 3. 创建新任务
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"学习Python","subject":"编程","plan_date":"2026-06-21","estimated_minutes":60,"notes":"基础语法复习"}'

# 4. 标记任务完成 (将 :id 替换为实际任务ID)
curl -X PATCH http://localhost:5000/api/tasks/1/done

# 5. 删除任务 (将 :id 替换为实际任务ID)
curl -X DELETE http://localhost:5000/api/tasks/1

# 6. 添加学习记录 (将 :id 替换为实际任务ID)
curl -X POST http://localhost:5000/api/tasks/1/records \
  -H "Content-Type: application/json" \
  -d '{"start_time":"2026-06-21 14:00","duration_minutes":25,"summary":"完成了第一章学习"}'

# 7. 获取所有学习记录
curl http://localhost:5000/api/records

# 8. 获取指定任务的学习记录
curl "http://localhost:5000/api/records?taskId=1"

# 9. 获取月度统计
curl "http://localhost:5000/api/stats?month=2026-06"
```

## 使用说明

1. **添加任务**: 点击右上角「+ 添加任务」按钮，填写任务信息后保存
2. **查看任务**: 使用「全部任务」和「今日任务」切换视图，可选择日期查看
3. **标记完成**: 点击任务卡片上的「✅ 标记完成」按钮，可切换完成状态
4. **删除任务**: 点击「🗑️ 删除」按钮删除任务（相关记录也会删除）
5. **添加学习记录**: 点击「🍅 添加记录」为任务添加番茄钟学习记录
6. **查看统计**: 点击顶部「统计」标签，选择月份查看学习数据统计
