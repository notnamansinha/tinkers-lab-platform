<div align="center">

# Tinkers Lab Platform

A comprehensive device and lab management system for tracking equipment, bookings, tool checkouts, and inventory in a maker space environment.

[Features](#features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [Contributing](#contributing)

</div>

## Overview

The Tinkers Lab Platform is a robust web application built to streamline operations within a maker space or fabrication lab. It manages user roles, tracks physical equipment (across bookable and checkout tiers), handles project-based consumable tracking, and provides administrative oversight for inventory and maintenance. 

## Features

- **Equipment Management** — Track machines across bookable tiers (e.g., 3D printers, laser cutters) and checkout tiers (e.g., power tools, hand tools).
- **Booking & Checkout System** — Allow users to reserve calendar slots for heavy machinery or check out hand tools for project usage.
- **Project Tracking** — Require and track user projects to associate lab usage and consumable materials with specific initiatives.
- **Inventory & Maintenance** — Provide staff with dashboards to monitor stock levels, record maintenance, and track equipment health.
- **Role-Based Access** — Secure different sections of the app for Students, Faculty, Lab Assistants, and Super Admins.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Usage

Start the local development server:

```bash
npm run dev
```

Build the production bundle:

```bash
npm run build
```

## Project Structure

```
tinkers-lab-platform/
├── src/
│   ├── components/      # Shared React components (UI and layout)
│   ├── contexts/        # React contexts (e.g., AuthContext)
│   ├── features/        # Feature-based domains (bookings, equipment, etc.)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and configurations
│   ├── routes/          # Application routing definitions
│   ├── services/        # External services (Firebase)
│   ├── styles/          # Global CSS and Tailwind configurations
│   └── types/           # TypeScript type definitions
├── docs/                # Project documentation and specifications
└── package.json         # Dependencies and scripts
```

## Architecture

The platform uses React and Vite on the frontend, integrated with Firebase (Firestore and Auth) on the backend. For a complete look at the system design and data model, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

No license specified.
