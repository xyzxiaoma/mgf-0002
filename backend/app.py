from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from db import get_db, init_db
import os

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)


@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')


@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks ORDER BY created_at DESC')
    tasks = cursor.fetchall()
    conn.close()
    return jsonify([dict(task) for task in tasks])


@app.route('/api/tasks/day', methods=['GET'])
def get_tasks_by_day():
    date = request.args.get('date')
    if not date:
        return jsonify({'error': 'date parameter is required'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE plan_date = ? ORDER BY created_at DESC', (date,))
    tasks = cursor.fetchall()
    conn.close()
    return jsonify([dict(task) for task in tasks])


@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'error': 'title is required'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO tasks (title, subject, plan_date, estimated_minutes, notes) VALUES (?, ?, ?, ?, ?)',
        (
            data['title'],
            data.get('subject', ''),
            data.get('plan_date', ''),
            data.get('estimated_minutes', 0),
            data.get('notes', '')
        )
    )
    conn.commit()
    task_id = cursor.lastrowid
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    task = cursor.fetchone()
    conn.close()
    return jsonify(dict(task)), 201


@app.route('/api/tasks/<int:task_id>/done', methods=['PATCH'])
def toggle_task_done(task_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    task = cursor.fetchone()

    if not task:
        conn.close()
        return jsonify({'error': 'Task not found'}), 404

    new_status = 0 if task['is_done'] else 1
    cursor.execute('UPDATE tasks SET is_done = ? WHERE id = ?', (new_status, task_id))
    conn.commit()
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    updated_task = cursor.fetchone()
    conn.close()
    return jsonify(dict(updated_task))


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    task = cursor.fetchone()

    if not task:
        conn.close()
        return jsonify({'error': 'Task not found'}), 404

    cursor.execute('DELETE FROM records WHERE task_id = ?', (task_id,))
    cursor.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Task deleted successfully'})


@app.route('/api/tasks/<int:task_id>/records', methods=['POST'])
def add_record(task_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    task = cursor.fetchone()

    if not task:
        conn.close()
        return jsonify({'error': 'Task not found'}), 404

    data = request.get_json()
    if not data:
        conn.close()
        return jsonify({'error': 'Request body is required'}), 400

    cursor.execute(
        'INSERT INTO records (task_id, start_time, duration_minutes, summary) VALUES (?, ?, ?, ?)',
        (
            task_id,
            data.get('start_time', ''),
            data.get('duration_minutes', 0),
            data.get('summary', '')
        )
    )
    conn.commit()
    record_id = cursor.lastrowid
    cursor.execute('SELECT * FROM records WHERE id = ?', (record_id,))
    record = cursor.fetchone()
    conn.close()
    return jsonify(dict(record)), 201


@app.route('/api/records', methods=['GET'])
def get_records():
    task_id = request.args.get('taskId')
    conn = get_db()
    cursor = conn.cursor()

    if task_id:
        cursor.execute('SELECT * FROM records WHERE task_id = ? ORDER BY created_at DESC', (task_id,))
    else:
        cursor.execute('SELECT * FROM records ORDER BY created_at DESC')

    records = cursor.fetchall()
    conn.close()
    return jsonify([dict(record) for record in records])


@app.route('/api/stats', methods=['GET'])
def get_stats():
    month = request.args.get('month')
    if not month:
        return jsonify({'error': 'month parameter is required (format: YYYY-MM)'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        'SELECT COUNT(*) as total FROM tasks WHERE substr(plan_date, 1, 7) = ?',
        (month,)
    )
    total_tasks = cursor.fetchone()['total']

    cursor.execute(
        'SELECT COUNT(*) as completed FROM tasks WHERE substr(plan_date, 1, 7) = ? AND is_done = 1',
        (month,)
    )
    completed_tasks = cursor.fetchone()['completed']

    cursor.execute(
        'SELECT COUNT(*) as uncompleted FROM tasks WHERE substr(plan_date, 1, 7) = ? AND is_done = 0',
        (month,)
    )
    uncompleted_tasks = cursor.fetchone()['uncompleted']

    cursor.execute('''
        SELECT COALESCE(SUM(r.duration_minutes), 0) as total_minutes
        FROM records r
        JOIN tasks t ON r.task_id = t.id
        WHERE substr(t.plan_date, 1, 7) = ?
    ''', (month,))
    total_minutes = cursor.fetchone()['total_minutes']

    cursor.execute('''
        SELECT t.subject,
               COUNT(DISTINCT t.id) as task_count,
               COALESCE(SUM(r.duration_minutes), 0) as total_minutes
        FROM tasks t
        LEFT JOIN records r ON t.id = r.task_id
        WHERE substr(t.plan_date, 1, 7) = ?
        GROUP BY t.subject
        ORDER BY task_count DESC
    ''', (month,))
    subject_stats = cursor.fetchall()
    conn.close()

    return jsonify({
        'month': month,
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'uncompleted_tasks': uncompleted_tasks,
        'total_study_minutes': total_minutes,
        'by_subject': [dict(stat) for stat in subject_stats]
    })


if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
