import sys
from sqlalchemy import text
sys.path.append("c:\\Users\\mkausthuban\\OneDrive - Computer Enterprises Inc\\Documents\\Personal Works\\voice-assistant\\src\\voice-assistant-api")
from app.database import engine

def add_column():
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE calls ADD COLUMN IF NOT EXISTS ended_reason VARCHAR(100);"))
        print("Column added successfully!")

if __name__ == "__main__":
    add_column()
