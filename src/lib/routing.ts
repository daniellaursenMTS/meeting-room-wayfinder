// Dijkstra routing engine for same-floor and multi-floor pathfinding

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  floorId: string;
}

export interface GraphEdge {
  fromNodeId: string;
  toNodeId: string;
  weight: number;
}

export interface VerticalConnection {
  connectorId: string;
  connectorName: string;
  connectorType: string;
  stops: Array<{
    floorId: string;
    pathNodeId: string;
  }>;
}

export interface RouteSegment {
  floorId: string;
  floorNumber: number;
  floorName: string;
  nodeIds: string[];
  coordinates: Array<{ x: number; y: number }>;
}

export interface RouteResult {
  found: boolean;
  totalWeight?: number;
  destination?: {
    roomId: string;
    roomName: string;
    floorName: string;
    floorNumber: number;
    buildingName: string;
  };
  segments?: RouteSegment[];
  instructions?: string[];
  message?: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  floorId: string;
  nearestPathNode: string;
  building: { name: string };
  floor: { number: number; name: string };
}

export type FloorInfoMap = Map<
  string,
  { id: string; number: number; name: string }
>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Weight added for each vertical connector traversal (stair / elevator). */
const VERTICAL_TRANSIT_WEIGHT = 100;

// ---------------------------------------------------------------------------
// Adjacency list helpers
// ---------------------------------------------------------------------------

type AdjacencyList = Map<string, Array<{ neighbor: string; weight: number }>>;

function buildAdjacencyList(
  edges: GraphEdge[],
  verticalConnections: VerticalConnection[]
): { adjacency: AdjacencyList; connectorByEdge: Map<string, VerticalConnection> } {
  const adjacency: AdjacencyList = new Map();
  // Track which node-pair edges come from a vertical connector, so we can
  // identify floor transitions when reconstructing the path.
  const connectorByEdge = new Map<string, VerticalConnection>();

  const addEdge = (from: string, to: string, weight: number) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push({ neighbor: to, weight });
  };

  // Regular walkable edges (bidirectional)
  for (const edge of edges) {
    addEdge(edge.fromNodeId, edge.toNodeId, edge.weight);
    addEdge(edge.toNodeId, edge.fromNodeId, edge.weight);
  }

  // Virtual edges for vertical connectors – connect every pair of stops
  for (const vc of verticalConnections) {
    for (let i = 0; i < vc.stops.length; i++) {
      for (let j = i + 1; j < vc.stops.length; j++) {
        const a = vc.stops[i].pathNodeId;
        const b = vc.stops[j].pathNodeId;
        addEdge(a, b, VERTICAL_TRANSIT_WEIGHT);
        addEdge(b, a, VERTICAL_TRANSIT_WEIGHT);

        const edgeKey = (from: string, to: string) => `${from}:${to}`;
        connectorByEdge.set(edgeKey(a, b), vc);
        connectorByEdge.set(edgeKey(b, a), vc);
      }
    }
  }

  return { adjacency, connectorByEdge };
}

// ---------------------------------------------------------------------------
// Dijkstra
// ---------------------------------------------------------------------------

interface DijkstraResult {
  dist: Map<string, number>;
  prev: Map<string, string | null>;
}

function dijkstra(adjacency: AdjacencyList, startId: string): DijkstraResult {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  // Simple priority queue backed by an array (sufficient for building-scale
  // graphs of a few hundred nodes).
  const queue: Array<{ nodeId: string; cost: number }> = [];

  dist.set(startId, 0);
  prev.set(startId, null);
  queue.push({ nodeId: startId, cost: 0 });

  while (queue.length > 0) {
    // Pop the node with the smallest cost
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;

    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);

    const neighbors = adjacency.get(current.nodeId);
    if (!neighbors) continue;

    for (const { neighbor, weight } of neighbors) {
      if (visited.has(neighbor)) continue;
      const newDist = current.cost + weight;
      const knownDist = dist.get(neighbor);
      if (knownDist === undefined || newDist < knownDist) {
        dist.set(neighbor, newDist);
        prev.set(neighbor, current.nodeId);
        queue.push({ nodeId: neighbor, cost: newDist });
      }
    }
  }

  return { dist, prev };
}

function reconstructPath(
  prev: Map<string, string | null>,
  targetId: string
): string[] | null {
  if (!prev.has(targetId)) return null;

  const path: string[] = [];
  let current: string | null = targetId;
  while (current !== null) {
    path.push(current);
    current = prev.get(current) ?? null;
  }
  path.reverse();
  return path;
}

// ---------------------------------------------------------------------------
// Segment splitting
// ---------------------------------------------------------------------------

function splitPathIntoSegments(
  path: string[],
  nodeMap: Map<string, GraphNode>,
  floorInfo: FloorInfoMap,
  connectorByEdge: Map<string, VerticalConnection>
): { segments: RouteSegment[]; transitions: Array<{ connector: VerticalConnection; fromFloorId: string; toFloorId: string }> } {
  if (path.length === 0) return { segments: [], transitions: [] };

  const segments: RouteSegment[] = [];
  const transitions: Array<{ connector: VerticalConnection; fromFloorId: string; toFloorId: string }> = [];

  let currentFloorId = nodeMap.get(path[0])!.floorId;
  let currentNodeIds: string[] = [path[0]];
  let currentCoords: Array<{ x: number; y: number }> = [
    { x: nodeMap.get(path[0])!.x, y: nodeMap.get(path[0])!.y },
  ];

  for (let i = 1; i < path.length; i++) {
    const node = nodeMap.get(path[i])!;
    const prevNode = nodeMap.get(path[i - 1])!;

    if (node.floorId !== prevNode.floorId) {
      // Floor transition – close the current segment
      const floor = floorInfo.get(currentFloorId);
      segments.push({
        floorId: currentFloorId,
        floorNumber: floor?.number ?? 0,
        floorName: floor?.name ?? currentFloorId,
        nodeIds: currentNodeIds,
        coordinates: currentCoords,
      });

      // Record the transition
      const edgeKey = `${prevNode.id}:${node.id}`;
      const connector = connectorByEdge.get(edgeKey);
      if (connector) {
        transitions.push({
          connector,
          fromFloorId: prevNode.floorId,
          toFloorId: node.floorId,
        });
      }

      // Start a new segment on the new floor
      currentFloorId = node.floorId;
      currentNodeIds = [path[i]];
      currentCoords = [{ x: node.x, y: node.y }];
    } else {
      currentNodeIds.push(path[i]);
      currentCoords.push({ x: node.x, y: node.y });
    }
  }

  // Close the final segment
  const floor = floorInfo.get(currentFloorId);
  segments.push({
    floorId: currentFloorId,
    floorNumber: floor?.number ?? 0,
    floorName: floor?.name ?? currentFloorId,
    nodeIds: currentNodeIds,
    coordinates: currentCoords,
  });

  return { segments, transitions };
}

// ---------------------------------------------------------------------------
// Instruction generation
// ---------------------------------------------------------------------------

function generateInstructions(
  segments: RouteSegment[],
  transitions: Array<{ connector: VerticalConnection; fromFloorId: string; toFloorId: string }>,
  floorInfo: FloorInfoMap
): string[] {
  if (segments.length === 1) {
    const seg = segments[0];
    return [
      `Follow the highlighted route to your destination on ${seg.floorName} (Floor ${seg.floorNumber}).`,
    ];
  }

  const instructions: string[] = [];
  const firstSeg = segments[0];
  instructions.push(`Start on ${firstSeg.floorName} (Floor ${firstSeg.floorNumber}).`);

  for (let i = 0; i < transitions.length; i++) {
    const t = transitions[i];
    const targetFloor = floorInfo.get(t.toFloorId);
    const targetFloorName = targetFloor?.name ?? t.toFloorId;
    const targetFloorNumber = targetFloor?.number ?? 0;

    instructions.push(`Follow the highlighted route to ${t.connector.connectorName}.`);
    instructions.push(
      `Take ${t.connector.connectorName} (${t.connector.connectorType}) to ${targetFloorName} (Floor ${targetFloorNumber}).`
    );
  }

  instructions.push("Follow the highlighted route to your destination.");
  return instructions;
}

// ---------------------------------------------------------------------------
// computeRoute
// ---------------------------------------------------------------------------

export async function computeRoute(
  startNodeId: string,
  destinationRoomId: string,
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  verticalConnections: VerticalConnection[],
  floorInfo: FloorInfoMap,
  roomInfo: RoomInfo
): Promise<RouteResult> {
  const targetNodeId = roomInfo.nearestPathNode;

  // Build node lookup
  const nodeMap = new Map<string, GraphNode>();
  for (const n of allNodes) nodeMap.set(n.id, n);

  // Build adjacency list (includes virtual vertical-connector edges)
  const { adjacency, connectorByEdge } = buildAdjacencyList(
    allEdges,
    verticalConnections
  );

  // Run Dijkstra from the start node
  const { dist, prev } = dijkstra(adjacency, startNodeId);

  // Reconstruct path
  const path = reconstructPath(prev, targetNodeId);
  if (!path) {
    return {
      found: false,
      message: "No route found between the selected points.",
    };
  }

  const totalWeight = dist.get(targetNodeId) ?? 0;

  // Split path into per-floor segments
  const { segments, transitions } = splitPathIntoSegments(
    path,
    nodeMap,
    floorInfo,
    connectorByEdge
  );

  // Generate human-readable instructions
  const instructions = generateInstructions(segments, transitions, floorInfo);

  return {
    found: true,
    totalWeight,
    destination: {
      roomId: roomInfo.id,
      roomName: roomInfo.name,
      floorName: roomInfo.floor.name,
      floorNumber: roomInfo.floor.number,
      buildingName: roomInfo.building.name,
    },
    segments,
    instructions,
  };
}

// ---------------------------------------------------------------------------
// snapToNearestEdge
// ---------------------------------------------------------------------------

/**
 * Find the nearest point on any edge to the given (x, y) coordinate and
 * return the ID of the closer endpoint node. Useful for snapping a tap
 * position to the routable path network.
 */
export function snapToNearestEdge(
  x: number,
  y: number,
  nodes: Array<{ id: string; x: number; y: number }>,
  edges: Array<{ fromNodeId: string; toNodeId: string }>
): string {
  const nodeMap = new Map<string, { id: string; x: number; y: number }>();
  for (const n of nodes) nodeMap.set(n.id, n);

  let bestDist = Infinity;
  let bestNodeId = nodes[0]?.id ?? "";

  for (const edge of edges) {
    const a = nodeMap.get(edge.fromNodeId);
    const b = nodeMap.get(edge.toNodeId);
    if (!a || !b) continue;

    // Project (x, y) onto the line segment a→b
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    if (lenSq > 0) {
      t = ((x - a.x) * dx + (y - a.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    const distSq = (x - projX) * (x - projX) + (y - projY) * (y - projY);

    if (distSq < bestDist) {
      bestDist = distSq;
      // Return the closer endpoint
      const distToA =
        (projX - a.x) * (projX - a.x) + (projY - a.y) * (projY - a.y);
      const distToB =
        (projX - b.x) * (projX - b.x) + (projY - b.y) * (projY - b.y);
      bestNodeId = distToA <= distToB ? a.id : b.id;
    }
  }

  return bestNodeId;
}
