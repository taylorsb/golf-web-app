## Golf Web App: Architecture and Codebase Overview

This document outlines the current state of the golf web application, covering its technology stack, architectural design, and key code structures.

### 1. Technology Stack:

*   **Frontend:** React.js (scaffolded with Create React App)
*   **Backend:** Python Flask
*   **Database:** SQLite (managed by Flask-SQLAlchemy)
*   **API Communication:** RESTful API over HTTP
*   **Cross-Origin Requests:** Flask-CORS
*   **Version Control:** Git

### 2. Architecture:

The application follows a client-server architecture:

*   **Frontend (React.js):** Runs in the user's web browser, providing the user interface and experience. It communicates with the backend API to fetch, add, update, and delete data.
*   **Backend (Flask):** A Python-based web server that exposes a RESTful API. It handles business logic, interacts with the SQLite database, and serves data to the frontend.
*   **Database (SQLite):** A file-based relational database used for persistent storage of application data. It's managed by Flask-SQLAlchemy, an ORM (Object-Relational Mapper) that simplifies database interactions from Flask.

Communication between the React frontend (running on `localhost:3000`) and the Flask backend (running on `localhost:5000`) is enabled via **CORS (Cross-Origin Resource Sharing)**, configured on the Flask server.

### 3. Key Code Structures:

*   **`golfapp-client/` (Frontend):**
    *   **`src/App.js`:** The main React component. It contains the core logic for fetching, displaying, adding, editing, and deleting player data. It uses `fetch` API calls to interact with the Flask backend.
    *   Standard Create React App structure for other files (e.g., `index.js`, `App.css`).

*   **`golfapp-server/` (Backend):
    *   **`venv/`:** Python virtual environment containing project dependencies (Flask, Flask-SQLAlchemy, Flask-CORS).
    *   **`app.py`:**
        *   Initializes the Flask application.
        *   Configures the SQLite database connection (`sqlite:///golf.db`).
        *   Defines the `Player` SQLAlchemy model, mapping Python objects to the `players` table in the database. The `handicap` field is defined as `db.Float` to support decimal and negative values.
        *   Contains RESTful API endpoints (`/players`, `/players/<int:player_id>`) for `GET`, `POST`, `PUT`, and `DELETE` operations on player data.
        *   Enables CORS using `Flask-CORS`.
    *   **`golf.db`:** The SQLite database file, automatically created and managed by Flask-SQLAlchemy.

