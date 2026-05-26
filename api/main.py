from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
import os
import time
import random

app = FastAPI(title="SRE-GPT Target API", version="2.0")

# PostgreSQL Connection
DATABASE_URL = os.getenv("DATABASE_URL", "")

def get_db():
    return psycopg2.connect(DATABASE_URL)

def init_db():
    """Create the todos table if it does not exist."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS todos (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        cur.close()
        conn.close()
        print("✅ Database initialized")
    except Exception as e:
        print(f"❌ DB Error: {e}")

# Initialize at startup
init_db()

# Models
class TodoCreate(BaseModel):
    title: str

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None

class Todo(BaseModel):
    id: int
    title: str
    completed: bool

# Incident simulation files
def get_delay():
    try:
        with open("delay.txt") as f:
            return float(f.read().strip())
    except:
        return 0.0

def get_error_rate():
    try:
        with open("error_rate.txt") as f:
            return float(f.read().strip())
    except:
        return 0.0

# Endpoints
@app.get("/health")
def health():
    """Check the health of the API and the DB."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB unavailable: {e}")

@app.get("/todos", response_model=List[Todo])
def get_todos():
    """List all todos."""
    delay = get_delay()
    if delay > 0:
        time.sleep(delay)

    if random.random() < get_error_rate():
        raise HTTPException(status_code=500, detail="Internal Server Error")

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id, title, completed FROM todos ORDER BY created_at DESC")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [{"id": r[0], "title": r[1], "completed": r[2]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/todos", response_model=Todo)
def create_todo(todo: TodoCreate):
    """Create a new todo."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO todos (title) VALUES (%s) RETURNING id, title, completed",
            (todo.title,)
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return {"id": row[0], "title": row[1], "completed": row[2]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/todos/{todo_id}")
def update_todo(todo_id: int, todo: TodoUpdate):
    """Update a todo."""
    try:
        conn = get_db()
        cur = conn.cursor()
        if todo.completed is not None:
            cur.execute(
                "UPDATE todos SET completed=%s WHERE id=%s",
                (todo.completed, todo_id)
            )
        if todo.title is not None:
            cur.execute(
                "UPDATE todos SET title=%s WHERE id=%s",
                (todo.title, todo_id)
            )
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int):
    """Delete a todo."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("DELETE FROM todos WHERE id=%s", (todo_id,))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulate/latency")
def simulate_latency(seconds: float = 3.0):
    """Simulate high latency (for testing)."""
    with open("delay.txt", "w") as f:
        f.write(str(seconds))
    return {"status": f"Latency set to {seconds}s"}

@app.post("/simulate/errors")
def simulate_errors(rate: float = 0.3):
    """Simulate a high error rate."""
    with open("error_rate.txt", "w") as f:
        f.write(str(rate))
    return {"status": f"Error rate set to {rate*100}%"}

@app.post("/simulate/reset")
def simulate_reset():
    """Reset everything to normal."""
    with open("delay.txt", "w") as f:
        f.write("0")
    with open("error_rate.txt", "w") as f:
        f.write("0.0")
    return {"status": "All systems normal"}