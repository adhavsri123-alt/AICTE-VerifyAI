import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal
from backend.seed_data import seed_database_if_empty

def main():
    db = SessionLocal()
    try:
        seed_database_if_empty(db, force=True)
        print("[VerifyAI] Reseed completed successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
