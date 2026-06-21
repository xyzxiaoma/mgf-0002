const API_BASE = '/api';

let currentView = 'all';
let currentTaskId = null;

function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function getDateTimeLocalNow() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function fetchTasks(date = null) {
    const url = date
        ? `${API_BASE}/tasks/day?date=${date}`
        : `${API_BASE}/tasks`;

    try {
        const res = await fetch(url);
        const tasks = await res.json();
        renderTasks(tasks);
    } catch (err) {
        console.error('Failed to fetch tasks:', err);
    }
}

async function fetchRecords(taskId) {
    try {
        const res = await fetch(`${API_BASE}/records?taskId=${taskId}`);
        return await res.json();
    } catch (err) {
        console.error('Failed to fetch records:', err);
        return [];
    }
}

async function createTask(taskData) {
    try {
        const res = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        return await res.json();
    } catch (err) {
        console.error('Failed to create task:', err);
        return null;
    }
}

async function toggleTaskDone(taskId) {
    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}/done`, {
            method: 'PATCH'
        });
        return await res.json();
    } catch (err) {
        console.error('Failed to toggle task:', err);
        return null;
    }
}

async function deleteTask(taskId) {
    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        return await res.json();
    } catch (err) {
        console.error('Failed to delete task:', err);
        return null;
    }
}

async function addRecord(taskId, recordData) {
    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recordData)
        });
        return await res.json();
    } catch (err) {
        console.error('Failed to add record:', err);
        return null;
    }
}

async function fetchStats(month) {
    try {
        const res = await fetch(`${API_BASE}/stats?month=${month}`);
        return await res.json();
    } catch (err) {
        console.error('Failed to fetch stats:', err);
        return null;
    }
}

function renderTasks(tasks) {
    const taskList = document.getElementById('task-list');

    if (tasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>暂无任务，点击"添加任务"开始吧！</p>
            </div>
        `;
        return;
    }

    taskList.innerHTML = tasks.map(task => `
        <div class="task-card ${task.is_done ? 'done' : ''}" data-id="${task.id}">
            <div class="task-header">
                <div class="task-title">${escapeHtml(task.title)}</div>
            </div>
            <div class="task-tags">
                ${task.subject ? `<span class="task-tag subject">📚 ${escapeHtml(task.subject)}</span>` : ''}
                ${task.plan_date ? `<span class="task-tag date">📅 ${escapeHtml(task.plan_date)}</span>` : ''}
                ${task.estimated_minutes ? `<span class="task-tag time">⏱️ ${task.estimated_minutes}分钟</span>` : ''}
            </div>
            ${task.notes ? `<div class="task-notes">${escapeHtml(task.notes)}</div>` : ''}
            <div class="task-records" id="records-${task.id}"></div>
            <div class="task-actions">
                <button class="btn-info" onclick="openRecordModal(${task.id}, '${escapeHtml(task.title)}')">
                    🍅 添加记录
                </button>
                <button class="btn-success" onclick="handleToggleDone(${task.id})">
                    ${task.is_done ? '↩️ 取消完成' : '✅ 标记完成'}
                </button>
                <button class="btn-danger" onclick="handleDeleteTask(${task.id})">
                    🗑️ 删除
                </button>
            </div>
        </div>
    `).join('');

    tasks.forEach(task => {
        loadTaskRecords(task.id);
    });
}

async function loadTaskRecords(taskId) {
    const records = await fetchRecords(taskId);
    const container = document.getElementById(`records-${taskId}`);

    if (records.length === 0) {
        return;
    }

    container.innerHTML = `
        <h4>📖 学习记录 (${records.length})</h4>
        ${records.map(record => `
            <div class="record-item">
                <div>
                    <span class="record-time">${escapeHtml(record.start_time || record.created_at)}</span>
                    <span class="record-duration"> · ${record.duration_minutes}分钟</span>
                </div>
                ${record.summary ? `<div class="record-summary">${escapeHtml(record.summary)}</div>` : ''}
            </div>
        `).join('')}
    `;
}

function renderStats(stats) {
    const content = document.getElementById('stats-content');

    if (!stats) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p>暂无统计数据</p>
            </div>
        `;
        return;
    }

    const subjectHtml = stats.by_subject && stats.by_subject.length > 0
        ? stats.by_subject.map(stat => `
            <div class="subject-stat-item">
                <span class="subject-name">${escapeHtml(stat.subject || '未分类')}</span>
                <div class="subject-info">
                    <span class="count">${stat.task_count} 个任务</span>
                    <span class="minutes">${stat.total_minutes} 分钟</span>
                </div>
            </div>
        `).join('')
        : '<p style="color: #999; text-align: center; padding: 20px;">暂无科目数据</p>';

    content.innerHTML = `
        <div class="stats-cards">
            <div class="stats-card total">
                <div class="stats-number">${stats.total_tasks}</div>
                <div class="stats-label">总任务数</div>
            </div>
            <div class="stats-card completed">
                <div class="stats-number">${stats.completed_tasks}</div>
                <div class="stats-label">已完成</div>
            </div>
            <div class="stats-card uncompleted">
                <div class="stats-number">${stats.uncompleted_tasks}</div>
                <div class="stats-label">未完成</div>
            </div>
            <div class="stats-card minutes">
                <div class="stats-number">${stats.total_study_minutes}</div>
                <div class="stats-label">学习分钟</div>
            </div>
        </div>
        <div class="subject-stats">
            <h3>📚 按科目分类统计</h3>
            ${subjectHtml}
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openTaskModal() {
    document.getElementById('task-form').reset();
    document.getElementById('task-date').value = getToday();
    document.getElementById('task-estimated').value = 30;
    document.getElementById('task-modal').classList.add('active');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.remove('active');
}

function openRecordModal(taskId, taskTitle) {
    currentTaskId = taskId;
    document.getElementById('record-task-title').textContent = `任务: ${taskTitle}`;
    document.getElementById('record-form').reset();
    document.getElementById('record-start').value = getDateTimeLocalNow();
    document.getElementById('record-duration').value = 25;
    document.getElementById('record-modal').classList.add('active');
}

function closeRecordModal() {
    document.getElementById('record-modal').classList.remove('active');
    currentTaskId = null;
}

async function handleToggleDone(taskId) {
    await toggleTaskDone(taskId);
    loadCurrentView();
}

async function handleDeleteTask(taskId) {
    if (confirm('确定要删除这个任务吗？相关的学习记录也会被删除。')) {
        await deleteTask(taskId);
        loadCurrentView();
    }
}

function loadCurrentView() {
    const dateInput = document.getElementById('date-input').value;
    if (currentView === 'day' && dateInput) {
        fetchTasks(dateInput);
    } else {
        fetchTasks();
    }
}

async function loadCurrentStats() {
    const month = document.getElementById('stats-month').value;
    if (month) {
        const stats = await fetchStats(month);
        renderStats(stats);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('date-input').value = getToday();
    document.getElementById('stats-month').value = getCurrentMonth();

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(`${tab}-tab`).classList.add('active');

            if (tab === 'stats') {
                loadCurrentStats();
            }
        });
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            loadCurrentView();
        });
    });

    document.getElementById('date-input').addEventListener('change', () => {
        if (currentView === 'day') {
            loadCurrentView();
        }
    });

    document.getElementById('stats-month').addEventListener('change', loadCurrentStats);

    document.getElementById('add-task-btn').addEventListener('click', openTaskModal);
    document.getElementById('cancel-task').addEventListener('click', closeTaskModal);
    document.getElementById('cancel-record').addEventListener('click', closeRecordModal);

    document.getElementById('task-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const taskData = {
            title: document.getElementById('task-title').value,
            subject: document.getElementById('task-subject').value,
            plan_date: document.getElementById('task-date').value,
            estimated_minutes: parseInt(document.getElementById('task-estimated').value) || 0,
            notes: document.getElementById('task-notes').value
        };

        const result = await createTask(taskData);
        if (result) {
            closeTaskModal();
            loadCurrentView();
        }
    });

    document.getElementById('record-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentTaskId) return;

        const startVal = document.getElementById('record-start').value;
        const startTime = startVal ? startVal.replace('T', ' ') : '';

        const recordData = {
            start_time: startTime,
            duration_minutes: parseInt(document.getElementById('record-duration').value) || 0,
            summary: document.getElementById('record-summary').value
        };

        const result = await addRecord(currentTaskId, recordData);
        if (result) {
            closeRecordModal();
            loadCurrentView();
        }
    });

    document.getElementById('task-modal').addEventListener('click', (e) => {
        if (e.target.id === 'task-modal') closeTaskModal();
    });

    document.getElementById('record-modal').addEventListener('click', (e) => {
        if (e.target.id === 'record-modal') closeRecordModal();
    });

    fetchTasks();
});
