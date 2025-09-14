## Golf Web App: Architecture and Codebase Overview

This document outlines the current state of the golf web application, covering its technology stack, architectural design, and key code structures.

### 1. Technology Stack:

*   **Frontend:** React.js (scaffolded with Create React App)
*   **Backend:** Python Flask
*   **Database:**
    *   **Local Development:** SQLite
    *   **Render Deployment:** PostgreSQL
    *   **Azure Deployment:** MySQL
*   **API Communication:** RESTful API over HTTP
*   **Cross-Origin Requests:** Flask-CORS
*   **Version Control:** Git

### 2. Architecture:

The application follows a client-server architecture:

*   **Frontend (React.js):** Runs in the user's web browser, providing the user interface and experience. It communicates with the backend API to fetch, add, update, and delete data.
*   **Backend (Flask):** A Python-based web server that exposes a RESTful API. It handles business logic, interacts with the database, and serves data to the frontend. The backend is designed to be stateless and can be scaled horizontally.
*   **Database:** The application is configured to work with multiple database backends depending on the environment:
    *   **Local:** A file-based SQLite database (`golf.db`) is used for local development.
    *   **Render:** A PostgreSQL database is used for the Render deployment.
    *   **Azure:** A MySQL database is used for the Azure deployment.

Communication between the React frontend and the Flask backend is enabled via **CORS (Cross-Origin Resource Sharing)**, configured on the Flask server to allow requests from the deployed frontend and `localhost:3000`.

### 3. Deployment:

The application is deployed to two cloud platforms: Render and Azure.

#### 3.1. Render Deployment:

The Render deployment is defined in the `render.yaml` file and consists of two services:

*   **`react-frontend`:** A static web service that builds and serves the React application.
*   **`flask-backend`:** A web service that runs the Flask application using `gunicorn`. It connects to a PostgreSQL database managed by Render.

The `DATABASE_URL` environment variable is used to connect to the PostgreSQL database.

#### 3.2. Azure Deployment:

The Azure deployment is more manual. The backend is deployed as a Web App, and it connects to an Azure Database for MySQL.

The connection to the MySQL database is configured via the `DATABASE_URL` environment variable in the Azure App Service configuration. The connection requires SSL, and the `combined-ca-certificates.pem` file is used to provide the necessary certificates.

### 4. Key Code Structures:

*   **`golfapp-client/` (Frontend):**
    *   **`src/App.js`:** The main React component. It contains the core logic for fetching, displaying, adding, editing, and deleting player data. It uses `fetch` API calls to interact with the Flask backend.
    *   Standard Create React App structure for other files (e.g., `index.js`, `App.css`).

*   **`golfapp-server/` (Backend):**
    *   **`app.py`:**
        *   Initializes the Flask application using the `create_app` function.
        *   Configures the database connection based on the `DATABASE_URL` environment variable. If the variable is not set, it defaults to a local SQLite database.
        *   Defines the SQLAlchemy models for `Player`, `Course`, `Tournament`, `Round`, `HoleScore`, and `HandicapAdjustment`.
        *   Contains RESTful API endpoints for all CRUD operations on the models.
        *   Enables CORS using `Flask-CORS`.
    *   **`golf.db`:** The SQLite database file, used for local development.
    *   **`requirements.txt`:** Contains the Python dependencies for the backend.
    *   **`migrations/`:** Contains the database migration scripts managed by Flask-Migrate.