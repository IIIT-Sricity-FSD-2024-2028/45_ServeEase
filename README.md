# ServeEase – Service Provider Discovery & Booking Platform

## 📌 Problem Statement

Customers often face difficulty finding reliable service providers for non-retail services such as plumbing, electrical work, home cleaning, tutoring, and repairs. The process can be unorganized and time-consuming, with limited transparency about availability, pricing, and service status.

ServeEase provides a web-based platform for discovering service providers, booking services, and managing service-related operations.

## 👥 Current Actors

| Actor | Main responsibilities |
|---|---|
| Customer | Discover services, manage bookings and profile, view payment history, leave reviews, and raise support tickets |
| Service Provider | Manage services and availability, handle bookings, update profile details, and track service-related information |
| Employee | Handle customer and provider operations, verification, and support-ticket workflows according to assigned responsibilities |
| Admin / Superuser | Oversee platform operations, bookings, finances, service categories, and escalated support tickets |

## 🧩 Main Application Features

| Area | Features |
|---|---|
| Authentication | Login, signup, password recovery, and account-status handling |
| Service discovery | Browse services, search results, provider profiles, checkout, and booking confirmation |
| Customer | Dashboard, bookings and history, profile, payment history, reviews, and support tickets |
| Service provider | Dashboard, service management, availability, bookings, profile, and support |
| Employee operations | Customer/provider operations, provider verification, and support workflows |
| Admin / Superuser | User and provider operations, service categories, booking oversight, finance overview, and escalated tickets |
| Shared support | Support tickets, ticket details, attachments, and notifications |

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | NestJS, TypeScript, REST API |
| API documentation | Swagger |
| Development state storage | JSON file at `back-end/data/state.json` |

The current development setup does not require a separate database server. Database design files are available in `Database/`.

## 📂 Project Structure

```text
45_ServeEase/
├── Database/                  # Database schema and design documents
├── Figma Designs/              # UI/UX design references
├── back-end/
│   ├── data/                   # Application state JSON
│   ├── docs/                   # API documentation files
│   ├── src/
│   │   ├── common/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── middleware/
│   │   └── modules/            # Auth, bookings, catalog, tickets, etc.
│   ├── uploads/                # Development upload fixtures
│   └── package.json
├── react-frontend/
│   ├── public/                 # Static assets and images
│   ├── src/
│   │   ├── app/                # App setup and routes
│   │   ├── components/         # Shared UI components
│   │   ├── context/            # Authentication context
│   │   ├── features/           # Customer, provider, employee, admin, etc.
│   │   ├── layouts/
│   │   ├── services/           # API client and request helpers
│   │   └── styles/
│   └── package.json
├── README.md
└── SRS.pdf
```

## 🚀 Project Setup

**Requirements:** Node.js and npm.

Install backend dependencies:

```bash
cd back-end
npm install
```

In a separate terminal, install frontend dependencies:

```bash
cd react-frontend
npm install
```

## ▶️ Run the Application

Start the backend:

```bash
cd back-end
npm run dev
```

The backend normally runs at `http://localhost:3000`.

In another terminal, start the React frontend:

```bash
cd react-frontend
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

📖 Swagger API documentation: `http://localhost:3000/api/docs` (while the backend is running).

## 🧪 Testing

Run the available checks from the relevant directory.

**Backend**

```bash
cd back-end
npm test
npm run build
```

**Frontend**

```bash
cd react-frontend
npm test
npm run lint
npm run build
```

The available commands are defined in each directory's `package.json`.
