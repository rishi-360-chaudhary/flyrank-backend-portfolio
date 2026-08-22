# FlyRank Backend Internship Portfolio

Welcome to my backend development portfolio. This repository contains projects built during the FlyRank Internship Backend Track, demonstrating server-side application development, API design, and clean code practices.

**Developer:** Rishi Chaudhary | IIT Roorkee  
**Primary Tech Stack:** JavaScript, Node.js, Express, REST APIs, SQLite, Docker, Supabase Auth  

---

## 📂 Project Directory

| Assignment | Project Name | Description | Status |
| :---: | :--- | :--- | :---: |
| **1** | [Task CRUD API](./assignment_1) | An in-memory RESTful API with full CRUD operations, input validation, and interactive Swagger UI documentation. | ✅ Completed |
| **2** | [Database-Backed CRUD API](./assignment_2) | Migrated the storage layer to a real SQLite database ensuring data persistence, implementing parameterized SQL queries, and utilizing DB Browser. | ✅ Completed |
| **3** | [Containerize Your Stack](./assignment_3) | Containerized the task API and SQLite database with Docker — named volume for persistence, `.env` for config, `docker compose up` as a single start command. | ✅ Completed |
| **4** | [Auth — Login & Protect](./assignment_4) | Built a secure API using Supabase Auth — signup/login/logout, JWT verification, and a reusable middleware guarding protected routes, documented with Swagger bearer auth. | ✅ Completed |

*(Future assignments will be added to this directory as they are completed.)*

---

## 🛠️ Tools & Practices Demonstrated
*   **API Design:** RESTful principles, HTTP status codes, routing, and parameter handling.
*   **Database Integration:** Setting up SQLite, writing raw SQL queries, and ensuring data persistence across server restarts.
*   **Containerization:** Dockerfiles, Docker Compose, named volumes for persistent storage, and `.env`-based configuration.
*   **Authentication & Security:** Identity-provider-based auth (Supabase), JWT verification, reusable auth middleware, and bearer-token-protected routes.
*   **Security:** Utilizing parameterized queries to prevent SQL injection attacks, keeping secrets out of version control.
*   **Data Validation:** Ensuring reliable server inputs and returning standardized JSON error responses.
*   **Documentation:** Implementing OpenAPI specifications and Swagger UI for interactive testing.
*   **Version Control:** Stage-by-stage Git commits, clear documentation, and clean repository structure.

> *Note: Each assignment folder contains its own detailed README with specific setup and run instructions.*