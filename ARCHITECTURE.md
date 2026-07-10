# Architecture

## System Overview

```mermaid
flowchart TD
    Client["Vite + React SPA"] -->|Auth State| FirebaseAuth["Firebase Authentication"]
    Client -->|CRUD Operations| FirestoreDB[("Firestore Database")]
    
    subgraph "Frontend Services"
        Contexts["React Contexts (Auth)"]
        Query["TanStack Query (Data Caching)"]
        Router["React Router (Navigation)"]
    end
    
    Client --> Contexts
    Client --> Query
    Client --> Router
    
    Query --> FirestoreDB
    Contexts --> FirebaseAuth
```

## Components

### Frontend (React/Vite)
- **Responsibility**: Provides the user interface, manages client-side routing, and handles state.
- **Location**: `src/`
- **Key dependencies**: `react`, `react-router-dom`, `@tanstack/react-query`, `lucide-react`, `tailwindcss`.

### Firebase Services
- **Responsibility**: Handles backend infrastructure including user authentication and NoSQL data storage.
- **Location**: Configured in `src/lib/firebase.ts` and managed via `src/services/firebase/`.
- **Key dependencies**: `firebase`.

## Data Model

The following Entity-Relationship diagram outlines the core Firestore collections and their relationships based on the TypeScript definitions:

```mermaid
erDiagram
    USER ||--o{ PROJECT : "creates"
    USER ||--o{ BOOKING : "makes"
    USER ||--o{ TOOL_CHECKOUT : "checks out"
    USER ||--o{ ISSUE : "reports"
    
    PROJECT ||--o{ BOOKING : "associated with"
    PROJECT ||--o{ TOOL_CHECKOUT : "associated with"
    
    EQUIPMENT ||--o{ BOOKING : "booked for"
    EQUIPMENT ||--o{ MAINTENANCE_RECORD : "undergoes"
    
    INVENTORY_ITEM ||--o{ INVENTORY_TRANSACTION : "tracked via"

    USER {
        string uid PK
        string email
        string role
        string userType
    }
    
    PROJECT {
        string id PK
        string title
        string userId FK
        string status
    }
    
    EQUIPMENT {
        string id PK
        string name
        string tier
        string status
    }
    
    BOOKING {
        string id PK
        string equipmentId FK
        string projectId FK
        string userId FK
        string date
    }
    
    TOOL_CHECKOUT {
        string id PK
        string toolCategory
        string toolName
        string projectId FK
        string userId FK
        string expectedReturnDate
    }
    
    INVENTORY_ITEM {
        string id PK
        string name
        number quantity
        string status
    }
```

## Design Decisions

- **Service Layer Pattern**: Firestore interactions are decoupled into a dedicated service layer (`src/services/firebase/`) using native Firebase SDK methods to streamline data access across the application.
- **Data Caching**: `@tanstack/react-query` is heavily utilized to cache Firestore document reads, reducing database reads and improving UI responsiveness.
- **Tailwind & shadcn/ui**: The UI is built with a utility-first CSS framework (Tailwind) and reusable components (inspired by shadcn/ui) for rapid, consistent development.

## Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 (Vite) | Main SPA framework |
| Styling | Tailwind CSS | Utility-first styling |
| Backend | Firebase | Auth and Firestore |
| State/Cache | TanStack Query | Remote data fetching and caching |
| Routing | React Router | Client-side routing |
