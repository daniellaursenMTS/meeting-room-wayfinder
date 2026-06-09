# Meeting Room Wayfinder

Mobile-first web app that helps employees and visitors find meeting rooms across office buildings. No login required.

## Stack

- Next.js 16 + React 19 + TypeScript
- PostgreSQL + Prisma 7 ORM
- Tailwind CSS
- Dijkstra routing engine

## Setup

```bash
# Install dependencies
npm install

# Set up PostgreSQL (must be running on localhost:5432)
# Create database:
# createdb wayfinder

# Configure .env
cp .env.example .env
# Edit DATABASE_URL if needed

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed data
npm run seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on a mobile browser.

## Features

1. **Building detection** — GPS-based building suggestion with manual override
2. **Floor selection** — Manual floor picker, persisted in localStorage
3. **Room search** — Search by name, filter by building/floor/capacity/equipment (AND semantics)
4. **Map viewer** — Pan & zoom SVG floor maps with overlays
5. **Position correction** — Tap map to set/correct position, snaps to nearest path
6. **Routing** — Dijkstra pathfinding, same-floor and multi-floor via stairs
7. **Route instructions** — Floor-by-floor human-readable directions
8. **Debug view** — Available at `/debug` — shows nodes, edges, rooms, stairs, route tester, validation

## API Endpoints

- `GET /api/buildings` — List all buildings
- `GET /api/buildings/nearby?lat=&lng=` — Find nearby buildings (geofence-based)
- `GET /api/buildings/:id/floors` — Floors for a building
- `GET /api/rooms/search` — Search rooms (filters: name, buildingId, floorId, minCapacity, equipment)
- `GET /api/floors/:id/map` — Floor map metadata + asset URLs
- `GET /api/floors/:id/graph` — Path nodes and edges for a floor
- `POST /api/routes` — Calculate route (body: { startNodeId, destinationRoomId })

## Seed Data

- 2 buildings (HQ + West Campus)
- 4 floors (2 per building)
- 7 meeting rooms with equipment
- Path graph with nodes, edges, and stair connectors
- 4 SVG placeholder floor maps

## Map Asset Workflow

Floor maps are pre-converted SVG files stored in `public/maps/`. Real PDFs should be converted ahead of time to SVG/PNG/WebP — the app does not parse PDFs at runtime.

Coordinate system: 1000x700 for all floor maps. Path nodes and room coordinates align with the SVG coordinate space.
