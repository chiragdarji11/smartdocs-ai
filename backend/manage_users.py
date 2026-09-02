"""
Helper script to view and delete users from SmartDocs AI SQLite Database.
Usage:
  python manage_users.py --list
  python manage_users.py --delete-email user@example.com
  python manage_users.py --clear-all
"""

import argparse
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User

def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        if not users:
            print("No registered users found in database.")
            return
        print(f"\n--- Registered Users ({len(users)}) ---")
        for u in users:
            print(f"ID: {u.id} | Name: {u.username} | Email: {u.email} | Created: {u.created_at}")
        print("-----------------------------------\n")
    finally:
        db.close()

def delete_user_by_email(email: str):
    db = SessionLocal()
    try:
        email_clean = email.strip().lower()
        user = db.query(User).filter(User.email == email_clean).first()
        if not user:
            print(f"No user found with email: {email}")
            return
        db.delete(user)
        db.commit()
        print(f"✔ Successfully deleted user: {email}")
    finally:
        db.close()

def clear_all_users():
    db = SessionLocal()
    try:
        count = db.query(User).delete()
        db.commit()
        print(f"✔ Successfully deleted ALL ({count}) users from database.")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manage SmartDocs AI Users")
    parser.add_argument("--list", action="store_true", help="List all registered users")
    parser.add_argument("--delete-email", type=str, help="Delete user by email address")
    parser.add_argument("--clear-all", action="store_true", help="Delete all registered users")

    args = parser.parse_args()

    if args.list:
        list_users()
    elif args.delete_email:
        delete_user_by_email(args.delete_email)
    elif args.clear_all:
        clear_all_users()
    else:
        parser.print_help()
