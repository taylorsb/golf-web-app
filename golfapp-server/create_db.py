import os
from app import app, db

instance_path = os.path.join(app.root_path, 'instance')
if not os.path.exists(instance_path):
    os.makedirs(instance_path)
    print(f"Created instance directory: {instance_path}")

with app.app_context():
    db.create_all()
    print("Database tables created.")

    db_path = os.path.join(instance_path, 'golf.db')
    if os.path.exists(db_path):
        print(f"Database file found at: {db_path}")
    else:
        print(f"Database file NOT found at: {db_path}")