import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wayfinder'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Cleanup in reverse dependency order
  await prisma.verticalConnectorStop.deleteMany()
  await prisma.verticalConnector.deleteMany()
  await prisma.pathEdge.deleteMany()
  await prisma.pathNode.deleteMany()
  await prisma.roomEquipment.deleteMany()
  await prisma.equipment.deleteMany()
  await prisma.room.deleteMany()
  await prisma.mapAsset.deleteMany()
  await prisma.floor.deleteMany()
  await prisma.building.deleteMany()

  // --- Buildings ---
  await prisma.building.createMany({
    data: [
      {
        id: 'bld-hq',
        name: 'HQ Building',
        address: '100 Innovation Drive, San Francisco, CA 94105',
        latitude: 37.7749,
        longitude: -122.4194,
        geofenceRadius: 500,
      },
      {
        id: 'bld-west',
        name: 'West Campus',
        address: '200 Tech Boulevard, San Francisco, CA 94107',
        latitude: 37.7751,
        longitude: -122.418,
        geofenceRadius: 300,
      },
    ],
  })

  // --- Floors ---
  await prisma.floor.createMany({
    data: [
      { id: 'flr-hq-1', number: 1, name: 'Ground Floor', buildingId: 'bld-hq' },
      { id: 'flr-hq-3', number: 3, name: 'Third Floor', buildingId: 'bld-hq' },
      { id: 'flr-west-1', number: 1, name: 'Ground Floor', buildingId: 'bld-west' },
      { id: 'flr-west-2', number: 2, name: 'Second Floor', buildingId: 'bld-west' },
    ],
  })

  // --- Map Assets ---
  await prisma.mapAsset.createMany({
    data: [
      { id: 'ma-hq-1', filename: 'hq-floor-1.svg', url: '/maps/hq-floor-1.svg', mimeType: 'image/svg+xml', floorId: 'flr-hq-1' },
      { id: 'ma-hq-3', filename: 'hq-floor-3.svg', url: '/maps/hq-floor-3.svg', mimeType: 'image/svg+xml', floorId: 'flr-hq-3' },
      { id: 'ma-west-1', filename: 'west-floor-1.svg', url: '/maps/west-floor-1.svg', mimeType: 'image/svg+xml', floorId: 'flr-west-1' },
      { id: 'ma-west-2', filename: 'west-floor-2.svg', url: '/maps/west-floor-2.svg', mimeType: 'image/svg+xml', floorId: 'flr-west-2' },
    ],
  })

  // --- Equipment ---
  await prisma.equipment.createMany({
    data: [
      { id: 'eq-projector', name: 'Projector' },
      { id: 'eq-whiteboard', name: 'Whiteboard' },
      { id: 'eq-tv', name: 'TV Display' },
      { id: 'eq-phone', name: 'Conference Phone' },
      { id: 'eq-webcam', name: 'Webcam' },
    ],
  })

  // --- Rooms ---
  await prisma.room.createMany({
    data: [
      // HQ Floor 1
      { id: 'room-alpha', name: 'Alpha', capacity: 10, x: 200, y: 190, nearestPathNode: 'pn-hq1-alpha', floorId: 'flr-hq-1', buildingId: 'bld-hq' },
      { id: 'room-beta', name: 'Beta', capacity: 6, x: 800, y: 190, nearestPathNode: 'pn-hq1-beta', floorId: 'flr-hq-1', buildingId: 'bld-hq' },
      { id: 'room-gamma', name: 'Gamma', capacity: 4, x: 200, y: 550, nearestPathNode: 'pn-hq1-gamma', floorId: 'flr-hq-1', buildingId: 'bld-hq' },
      // HQ Floor 3
      { id: 'room-delta', name: 'Delta', capacity: 12, x: 200, y: 190, nearestPathNode: 'pn-hq3-delta', floorId: 'flr-hq-3', buildingId: 'bld-hq' },
      { id: 'room-epsilon', name: 'Epsilon', capacity: 8, x: 800, y: 190, nearestPathNode: 'pn-hq3-epsilon', floorId: 'flr-hq-3', buildingId: 'bld-hq' },
      // West Floor 1
      { id: 'room-sol', name: 'Sol', capacity: 6, x: 200, y: 190, nearestPathNode: 'pn-w1-sol', floorId: 'flr-west-1', buildingId: 'bld-west' },
      // West Floor 2
      { id: 'room-luna', name: 'Luna', capacity: 10, x: 800, y: 190, nearestPathNode: 'pn-w2-luna', floorId: 'flr-west-2', buildingId: 'bld-west' },
    ],
  })

  // --- Room Equipment ---
  await prisma.roomEquipment.createMany({
    data: [
      // Alpha: Projector(1), Whiteboard(2)
      { roomId: 'room-alpha', equipmentId: 'eq-projector', quantity: 1 },
      { roomId: 'room-alpha', equipmentId: 'eq-whiteboard', quantity: 2 },
      // Beta: TV Display(1), Conference Phone(1)
      { roomId: 'room-beta', equipmentId: 'eq-tv', quantity: 1 },
      { roomId: 'room-beta', equipmentId: 'eq-phone', quantity: 1 },
      // Gamma: Whiteboard(1)
      { roomId: 'room-gamma', equipmentId: 'eq-whiteboard', quantity: 1 },
      // Delta: Projector(1), TV Display(1), Webcam(1)
      { roomId: 'room-delta', equipmentId: 'eq-projector', quantity: 1 },
      { roomId: 'room-delta', equipmentId: 'eq-tv', quantity: 1 },
      { roomId: 'room-delta', equipmentId: 'eq-webcam', quantity: 1 },
      // Epsilon: Conference Phone(1), Whiteboard(1)
      { roomId: 'room-epsilon', equipmentId: 'eq-phone', quantity: 1 },
      { roomId: 'room-epsilon', equipmentId: 'eq-whiteboard', quantity: 1 },
      // Sol: TV Display(1), Whiteboard(1)
      { roomId: 'room-sol', equipmentId: 'eq-tv', quantity: 1 },
      { roomId: 'room-sol', equipmentId: 'eq-whiteboard', quantity: 1 },
      // Luna: Projector(1), Conference Phone(1), Webcam(1)
      { roomId: 'room-luna', equipmentId: 'eq-projector', quantity: 1 },
      { roomId: 'room-luna', equipmentId: 'eq-phone', quantity: 1 },
      { roomId: 'room-luna', equipmentId: 'eq-webcam', quantity: 1 },
    ],
  })

  // --- Path Nodes ---
  await prisma.pathNode.createMany({
    data: [
      // HQ Floor 1
      { id: 'pn-hq1-lobby', x: 500, y: 400, label: 'Lobby Entrance', floorId: 'flr-hq-1' },
      { id: 'pn-hq1-hall-c', x: 500, y: 350, label: 'Central Hallway', floorId: 'flr-hq-1' },
      { id: 'pn-hq1-hall-l', x: 200, y: 350, label: 'Left Hallway', floorId: 'flr-hq-1' },
      { id: 'pn-hq1-hall-r', x: 800, y: 350, label: 'Right Hallway', floorId: 'flr-hq-1' },
      { id: 'pn-hq1-alpha', x: 200, y: 290, label: null, floorId: 'flr-hq-1' },
      { id: 'pn-hq1-beta', x: 800, y: 290, label: null, floorId: 'flr-hq-1' },
      { id: 'pn-hq1-hall-bl', x: 200, y: 500, label: 'Bottom Left', floorId: 'flr-hq-1' },
      { id: 'pn-hq1-gamma', x: 200, y: 550, label: null, floorId: 'flr-hq-1' },
      { id: 'pn-hq1-stairs', x: 890, y: 350, label: 'Stairs S1', floorId: 'flr-hq-1' },

      // HQ Floor 3
      { id: 'pn-hq3-stairs', x: 890, y: 350, label: 'Stairs S1', floorId: 'flr-hq-3' },
      { id: 'pn-hq3-hall-c', x: 500, y: 350, label: 'Central Hallway', floorId: 'flr-hq-3' },
      { id: 'pn-hq3-hall-l', x: 200, y: 350, label: 'Left Hallway', floorId: 'flr-hq-3' },
      { id: 'pn-hq3-hall-r', x: 800, y: 350, label: 'Right Hallway', floorId: 'flr-hq-3' },
      { id: 'pn-hq3-delta', x: 200, y: 290, label: null, floorId: 'flr-hq-3' },
      { id: 'pn-hq3-epsilon', x: 800, y: 290, label: null, floorId: 'flr-hq-3' },

      // West Floor 1
      { id: 'pn-w1-lobby', x: 500, y: 400, label: 'Main Entrance', floorId: 'flr-west-1' },
      { id: 'pn-w1-hall', x: 500, y: 350, label: 'Hallway', floorId: 'flr-west-1' },
      { id: 'pn-w1-hall-l', x: 200, y: 350, label: 'Left Wing', floorId: 'flr-west-1' },
      { id: 'pn-w1-sol', x: 200, y: 290, label: null, floorId: 'flr-west-1' },
      { id: 'pn-w1-stairs', x: 800, y: 350, label: 'Stairs W1', floorId: 'flr-west-1' },

      // West Floor 2
      { id: 'pn-w2-stairs', x: 800, y: 350, label: 'Stairs W1', floorId: 'flr-west-2' },
      { id: 'pn-w2-hall', x: 500, y: 350, label: 'Hallway', floorId: 'flr-west-2' },
      { id: 'pn-w2-hall-r', x: 800, y: 290, label: null, floorId: 'flr-west-2' },
      { id: 'pn-w2-luna', x: 800, y: 190, label: null, floorId: 'flr-west-2' },
    ],
  })

  // --- Path Edges (bidirectional) ---
  let edgeCounter = 0
  const edges: { id: string; fromNodeId: string; toNodeId: string; weight: number }[] = []

  function addBidirectional(prefix: string, fromId: string, toId: string, weight: number) {
    edgeCounter++
    edges.push(
      { id: `${prefix}-${edgeCounter}-fwd`, fromNodeId: fromId, toNodeId: toId, weight },
      { id: `${prefix}-${edgeCounter}-rev`, fromNodeId: toId, toNodeId: fromId, weight },
    )
  }

  // HQ Floor 1
  addBidirectional('e-hq1', 'pn-hq1-lobby', 'pn-hq1-hall-c', 50)
  addBidirectional('e-hq1', 'pn-hq1-hall-c', 'pn-hq1-hall-l', 300)
  addBidirectional('e-hq1', 'pn-hq1-hall-c', 'pn-hq1-hall-r', 300)
  addBidirectional('e-hq1', 'pn-hq1-hall-l', 'pn-hq1-alpha', 60)
  addBidirectional('e-hq1', 'pn-hq1-hall-r', 'pn-hq1-beta', 60)
  addBidirectional('e-hq1', 'pn-hq1-hall-l', 'pn-hq1-hall-bl', 150)
  addBidirectional('e-hq1', 'pn-hq1-hall-bl', 'pn-hq1-gamma', 50)
  addBidirectional('e-hq1', 'pn-hq1-hall-r', 'pn-hq1-stairs', 90)

  // HQ Floor 3
  addBidirectional('e-hq3', 'pn-hq3-stairs', 'pn-hq3-hall-r', 90)
  addBidirectional('e-hq3', 'pn-hq3-hall-r', 'pn-hq3-hall-c', 300)
  addBidirectional('e-hq3', 'pn-hq3-hall-c', 'pn-hq3-hall-l', 300)
  addBidirectional('e-hq3', 'pn-hq3-hall-l', 'pn-hq3-delta', 60)
  addBidirectional('e-hq3', 'pn-hq3-hall-r', 'pn-hq3-epsilon', 60)

  // West Floor 1
  addBidirectional('e-w1', 'pn-w1-lobby', 'pn-w1-hall', 50)
  addBidirectional('e-w1', 'pn-w1-hall', 'pn-w1-hall-l', 300)
  addBidirectional('e-w1', 'pn-w1-hall-l', 'pn-w1-sol', 60)
  addBidirectional('e-w1', 'pn-w1-hall', 'pn-w1-stairs', 300)

  // West Floor 2
  addBidirectional('e-w2', 'pn-w2-stairs', 'pn-w2-hall', 300)
  addBidirectional('e-w2', 'pn-w2-stairs', 'pn-w2-hall-r', 60)
  addBidirectional('e-w2', 'pn-w2-hall-r', 'pn-w2-luna', 100)

  await prisma.pathEdge.createMany({ data: edges })

  // --- Vertical Connectors ---
  await prisma.verticalConnector.createMany({
    data: [
      { id: 'vc-s1', name: 'Stairs S1', type: 'stairs' },
      { id: 'vc-w1', name: 'Stairs W1', type: 'stairs' },
    ],
  })

  await prisma.verticalConnectorStop.createMany({
    data: [
      { id: 'vcs-s1-hq1', connectorId: 'vc-s1', floorId: 'flr-hq-1', pathNodeId: 'pn-hq1-stairs' },
      { id: 'vcs-s1-hq3', connectorId: 'vc-s1', floorId: 'flr-hq-3', pathNodeId: 'pn-hq3-stairs' },
      { id: 'vcs-w1-west1', connectorId: 'vc-w1', floorId: 'flr-west-1', pathNodeId: 'pn-w1-stairs' },
      { id: 'vcs-w1-west2', connectorId: 'vc-w1', floorId: 'flr-west-2', pathNodeId: 'pn-w2-stairs' },
    ],
  })

  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
