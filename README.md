# 🚀 PostgreSQL Logical Replication Dashboard & Control Plane

A modern, type-safe full-stack admin dashboard and CRUD panel designed to configure, monitor, and manage PostgreSQL logical replication streams between primary and replica clusters.

---

## 🏗️ Architecture & How It Works

This project automates the orchestration of publications on primary databases and subscriptions on secondary databases. 

```text
  [ PRIMARY DATABASE ] (Port 5432)
           │
           ├── Writes to WAL (Write-Ahead Log)
           ▼
  [ PUBLICATION ] (e.g. pg_logical_replication)
           │
           ├── Decodes WAL changes into a logical stream
           ▼
  [ REPLICATION SLOT ] (Maintains WAL state for subscriber)
           │
           └── Stream connection (Decrypted credentials)
           ▼
  [ SUBSCRIPTION ] (Runs on Replica)
           │
           └── Pulls and applies DML changes
           ▼
  [ REPLICA DATABASE ] (Port 5433)
```

---

## ✨ Features

### 🔒 User Authentication & Authorization
* **JWT Session Tokens**: Secure session cookies/token auth protect all replication endpoints.
* **Role-Based Profiles**:
  * **Standard User**: Can configure, view, update, and manage their own replication setups.
  * **Admin User**: Accesses a global dashboard to inspect and check replication status metrics of *all* users' configurations.

### 🛡️ Credential Privacy & Encryption
* **At-Rest Password Encryption**: Primary and replica credentials passwords are encrypted using `AES-256-GCM` before database persistence.
* **Zero-Leak Admin Views**: While admins can monitor setups, the backend **masks** all database passwords (`"********"`), preventing admins from leaking passwords.

### ⚡ Replication CRUD Operations
* **Setup Replication**: Auto-provisions publications on the primary host and subscriptions on replica hosts.
* **Live Status Reports**: Real-time status checks showing streaming states (`pg_stat_replication`), active slots (`pg_replication_slots`), and worker replication logs (`pg_stat_subscription`).
* **Manage Subscription State**: Enable or disable target replica subscriptions with a single toggle.
* **Clean Teardown**: Automatically drops subscriptions on replica nodes, removes publications on primary, and clears database configurations safely.

---

## 🔮 Coming Soon Features

* **Bi-directional Replication Setup**: Support writing on both primary and replica tables, syncing data in both directions.
* **Multi-replica scale monitor**: Dynamic UI dashboard visualizing cluster health topology charts for setups with more than 2 target replicas.
* **UI Replication Log stream**: A real-time terminal widget showing the live decoding log streams from the database engine.

---

## 🛠️ Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (or Bun runtime)
* [Docker & Docker Compose](https://www.docker.com/)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/logical-replication.git
cd logical-replication
```

---

### Step 2: Configure Environment Variables

#### 1. Backend Config
Copy the environment template in the root directory:
```bash
cp .env.example .env
```
Open `.env` and configure:
```ini
DATABASE_URL=postgresql://sujith:Sujith@123@localhost:5432/mds
JWT_SECRET=your_jwt_secret_key_minimum_length_8
ENCRYPTION_KEY=your_at_rest_encryption_key_minimum_length_8
PORT=3000
```

#### 2. Frontend Config
Copy the environment template in the `ui` directory:
```bash
cd ui
cp .env.example .env
cd ..
```
Configure `ui/.env`:
```ini
VITE_BASE_URL=http://localhost:3000/api/replica
```

---

### Step 3: Run the Database Infrastructure
Spin up the primary and replica databases defined in the Docker Compose file:
```bash
docker compose -f docker/docker-compose.yml up -d
```
* **Primary DB**: `localhost:5432` (DB: `primary_db`, User: `sujith`)
* **Replica DB**: `localhost:5433` (DB: `replica_db`, User: `sujith`)

---

### Step 4: Run the Backend Server
From the root directory:
```bash
bun install
bun dev
```
The server will boot and initialize the tables using Drizzle on port `3000`.

---

### Step 5: Run the Frontend App
From the `ui` directory:
```bash
cd ui
bun install
bun dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 How to Test Replication

1. **Register & Log In**: Go to the UI and create an account, then sign in.
2. **Create Target Tables**: Connect to both the Primary database (port 5432) and the Replica database (port 5433), then run:
   ```sql
   CREATE TABLE IF NOT EXISTS users (
       id SERIAL PRIMARY KEY,
       name VARCHAR(100),
       balance INT
   );
   ```
3. **Configure via UI**: 
   * Select **Configure New Setup** on the UI.
   * Input the connection credentials for Primary and Replica databases.
   * Click **Initiate Setup**.
4. **Insert Data**: Insert a row on the **Primary** database:
   ```sql
   INSERT INTO users (name, balance) VALUES ('Sujith', 100);
   ```
5. **Verify**: Check the **Replica** database. You will see the row has automatically replicated!
   ```sql
   SELECT * FROM users;
   ```