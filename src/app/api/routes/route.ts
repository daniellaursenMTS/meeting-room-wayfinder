import { prisma } from '@/lib/prisma'
import { computeRoute } from '@/lib/routing'
import type { GraphNode, GraphEdge, VerticalConnection, FloorInfoMap, RoomInfo } from '@/lib/routing'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    return Response.json({ error: 'Request body must be a JSON object' }, { status: 400 })
  }

  const { startNodeId, destinationRoomId } = body as Record<string, unknown>

  if (typeof startNodeId !== 'string' || startNodeId.trim() === '') {
    return Response.json(
      { error: 'startNodeId must be a non-empty string' },
      { status: 400 }
    )
  }

  if (typeof destinationRoomId !== 'string' || destinationRoomId.trim() === '') {
    return Response.json(
      { error: 'destinationRoomId must be a non-empty string' },
      { status: 400 }
    )
  }

  // Look up start node with floor info
  const startNode = await prisma.pathNode.findUnique({
    where: { id: startNodeId },
    include: { floor: true },
  })

  if (!startNode) {
    return Response.json({ error: 'Start node not found' }, { status: 404 })
  }

  // Look up destination room with floor and building
  const destRoom = await prisma.room.findUnique({
    where: { id: destinationRoomId },
    include: {
      floor: true,
      building: true,
    },
  })

  if (!destRoom) {
    return Response.json({ error: 'Destination room not found' }, { status: 404 })
  }

  // Get the building from the start node's floor
  const startBuildingId = startNode.floor.buildingId

  // Check cross-building routing
  if (destRoom.buildingId !== startBuildingId) {
    return Response.json(
      { error: 'Cross-building routing is not supported' },
      { status: 400 }
    )
  }

  const buildingId = startBuildingId

  // Load all floors for the building
  const floors = await prisma.floor.findMany({
    where: { buildingId },
  })

  const floorIds = floors.map((f: { id: string }) => f.id)

  // Load all nodes and edges for the building
  const [allPathNodes, allPathEdges, verticalConnectorStops] = await Promise.all([
    prisma.pathNode.findMany({
      where: { floorId: { in: floorIds } },
    }),
    prisma.pathEdge.findMany({
      where: {
        fromNode: { floorId: { in: floorIds } },
      },
    }),
    prisma.verticalConnectorStop.findMany({
      where: { floorId: { in: floorIds } },
      include: { connector: true },
    }),
  ])

  // Build the data structures the routing engine expects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allNodes: GraphNode[] = allPathNodes.map((n: any) => ({
    id: n.id,
    x: n.x,
    y: n.y,
    floorId: n.floorId,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEdges: GraphEdge[] = allPathEdges.map((e: any) => ({
    fromNodeId: e.fromNodeId,
    toNodeId: e.toNodeId,
    weight: e.weight,
  }))

  // Group vertical connector stops by connector
  const connectorMap = new Map<string, VerticalConnection>()
  for (const stop of verticalConnectorStops) {
    if (!connectorMap.has(stop.connectorId)) {
      connectorMap.set(stop.connectorId, {
        connectorId: stop.connectorId,
        connectorName: stop.connector.name,
        connectorType: stop.connector.type,
        stops: [],
      })
    }
    connectorMap.get(stop.connectorId)!.stops.push({
      floorId: stop.floorId,
      pathNodeId: stop.pathNodeId,
    })
  }

  const verticalConnections: VerticalConnection[] = Array.from(connectorMap.values())

  const floorInfo: FloorInfoMap = new Map(
    floors.map((f: { id: string; number: number; name: string }) => [f.id, { id: f.id, number: f.number, name: f.name }] as const)
  )

  const roomInfo: RoomInfo = {
    id: destRoom.id,
    name: destRoom.name,
    floorId: destRoom.floorId,
    nearestPathNode: destRoom.nearestPathNode,
    building: { name: destRoom.building.name },
    floor: { number: destRoom.floor.number, name: destRoom.floor.name },
  }

  const result = await computeRoute(
    startNodeId,
    destinationRoomId,
    allNodes,
    allEdges,
    verticalConnections,
    floorInfo,
    roomInfo
  )

  return Response.json(result)
}
