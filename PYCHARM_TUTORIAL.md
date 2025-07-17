# Setting Up and Running the Diploma Provisioning System in PyCharm

This tutorial provides a step-by-step guide to configuring and running the full-stack diploma provisioning application using PyCharm Professional.

## 1. Prerequisites

Before you begin, ensure you have the following software installed on your system:

- **PyCharm Professional Edition**: The professional version is recommended for its comprehensive support for Django, JavaScript, and Docker.
- **Python**: Version 3.11 or newer.
- **Node.js and npm**: For running the frontend application.
- **Docker Desktop**: To run essential services like Ganache, IPFS, and Redis.

## 2. Initial Project Setup

1.  **Clone the Repository**: If you haven't already, clone the project to your local machine.
2.  **Open in PyCharm**: Open the cloned project folder in PyCharm.

## 3. Running Essential Services with Docker

The project relies on several services defined in `docker-compose-local.yml`. These should be started before running the backend or frontend.

1.  **Open the Terminal in PyCharm** (`View > Tool Windows > Terminal`).
2.  **Start Docker Services**: Run the following command to start Ganache, IPFS, and Redis in detached mode:
    ```bash
    docker-compose -f docker-compose-local.yml up -d ganache ipfs redis
    ```
3.  **Verify Services**: You can check the status of the running containers using PyCharm's **Services** tool window (`View > Tool Windows > Services`) or by running `docker ps` in the terminal.

## 4. Configuring the Django Backend

### 4.1. Set up the Python Interpreter

1.  Navigate to **File > Settings > Project: SmartContracts > Python Interpreter**.
2.  Click the **Add Interpreter** link and select **Add Local Interpreter**.
3.  In the left pane, select **Virtualenv Environment**.
4.  Choose **New** and select a location for the virtual environment within the project directory (e.g., `venv/`).
5.  Select the base interpreter (Python 3.11+).
6.  Click **OK**. PyCharm will create the virtual environment.

### 4.2. Install Backend Dependencies

1.  With the new virtual environment activated, open the **Terminal** in PyCharm.
2.  Install the required Python packages:
    ```bash
    pip install -r requirements.txt
    ```

### 4.3. Create the Backend Run/Debug Configuration

1.  Go to **Run > Edit Configurations...**.
2.  Click the **+** button and select **Django server**.
3.  **Name**: Set the name to `Backend`.
4.  **Environment variables**: This is a crucial step. Click the browse icon next to the Environment variables field and add the following, which are necessary for the application to connect to the Docker services:
    - `GANACHE_RPC_URL=http://localhost:8545`
    - `IPFS_API_URL=/dns/localhost/tcp/5001/http`
    - `REDIS_URL=redis://localhost:6379/0`
    - `DJANGO_SETTINGS_MODULE=app.settings`
    - `PYTHONUNBUFFERED=1`
5.  Click **OK** to save the configuration.

### 4.4. Run Database Migrations

1.  Open the PyCharm **Terminal**.
2.  Run the Django migrations to set up the SQLite database schema:
    ```bash
    python manage.py migrate
    ```

## 5. Configuring the React Frontend

### 5.1. Install Frontend Dependencies

1.  Open the PyCharm **Terminal**.
2.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
3.  Install the required npm packages:
    ```bash
    npm install
    ```

### 5.2. Create the Frontend Run/Debug Configuration

1.  Go to **Run > Edit Configurations...**.
2.  Click the **+** button and select **npm**.
3.  **Name**: Set the name to `Frontend`.
4.  **package.json**: Ensure the path points to `frontend/package.json`.
5.  **Command**: Select `start` from the dropdown list.
6.  **Node interpreter**: Select your installed Node.js version.
7.  Click **OK** to save the configuration.

## 6. Running the Application

You are now ready to run the entire application.

1.  **Run the Backend**: Select the `Backend` configuration from the dropdown at the top-right of PyCharm and click the **Run** (▶) button. The Django server should start on its default port (usually 8000).
2.  **Run the Frontend**: Select the `Frontend` configuration and click the **Run** (▶) button. The React development server will start on its default port (usually 3000).

Your application should now be running. You can access the frontend at `http://localhost:3000` and the backend API will be available at `http://localhost:8000`.

