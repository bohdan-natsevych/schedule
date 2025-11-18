"""
COPILOT: Migration script to add is_hidden column to task_day_overrides table.
Run this script to add the is_hidden column to existing database.
"""
import sqlite3
import os
from pathlib import Path

# Determine database path
db_path = os.environ.get('DATABASE_PATH')
if not db_path:
    # Default to backend/schedule.db
    script_dir = Path(__file__).parent
    db_path = script_dir / "backend" / "schedule.db"

print(f"Connecting to database: {db_path}")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if column already exists
    cursor.execute("PRAGMA table_info(task_day_overrides)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'is_hidden' in columns:
        print("Column 'is_hidden' already exists in task_day_overrides table.")
    else:
        # Add the column
        print("Adding 'is_hidden' column to task_day_overrides table...")
        cursor.execute("""
            ALTER TABLE task_day_overrides
            ADD COLUMN is_hidden BOOLEAN DEFAULT 0
        """)
        conn.commit()
        print("Column 'is_hidden' added successfully!")
    
except Exception as e:
    print(f"Error during migration: {e}")
    conn.rollback()
finally:
    conn.close()
    print("Migration complete!")
