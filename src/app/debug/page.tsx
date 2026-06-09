'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Building {
  id: string;
  name: string;
}

interface Floor {
  id: string;
  number: number;
  name: string;
  buildingId: string;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  label: string | null;
}

interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  weight: number;
}

interface MapData {
  floorId: string;
  mapWidth: number;
  mapHeight: number;
  mapAssets: Array<{ url: string }>;
}

interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  nearestPathNode: string;
  capacity: number;
  equipment: Array<{ name: string }>;
}

interface RouteResult {
  found: boolean;
  totalWeight?: number;
  segments?: Array<{
    floorId: string;
    floorNumber: number;
    floorName: string;
    coordinates: Array<{ x: number; y: number }>;
  }>;
  instructions?: string[];
  message?: string;
}

interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
}

export default function DebugPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [showNodes, setShowNodes] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [showRooms, setShowRooms] = useState(true);
  const [showStairs, setShowStairs] = useState(true);
  const [startNode, setStartNode] = useState('');
  const [destRoom, setDestRoom] = useState('');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  // Load buildings
  useEffect(() => {
    fetch('/api/buildings')
      .then((r) => r.json())
      .then(setBuildings)
      .catch(() => {});
  }, []);

  // Load floors when building changes
  useEffect(() => {
    if (!selectedBuilding) {
      setFloors([]);
      return;
    }
    fetch(`/api/buildings/${selectedBuilding}/floors`)
      .then((r) => r.json())
      .then((data: Floor[]) => {
        setFloors(data);
        if (data.length > 0) setSelectedFloor(data[0].id);
      })
      .catch(() => setFloors([]));
  }, [selectedBuilding]);

  // Load graph + map + rooms when floor changes
  useEffect(() => {
    if (!selectedFloor) {
      setNodes([]);
      setEdges([]);
      setRooms([]);
      setMapData(null);
      return;
    }

    Promise.all([
      fetch(`/api/floors/${selectedFloor}/graph`).then((r) => r.json()),
      fetch(`/api/floors/${selectedFloor}/map`).then((r) => r.json()),
      fetch(`/api/rooms/search?floorId=${selectedFloor}`).then((r) => r.json()),
    ])
      .then(([graphData, mapInfo, roomData]) => {
        setNodes(graphData.nodes || []);
        setEdges(graphData.edges || []);
        setMapData(mapInfo);
        setRooms(roomData || []);
      })
      .catch(() => {});
  }, [selectedFloor]);

  // Validation
  useEffect(() => {
    const issues: ValidationIssue[] = [];

    // Check rooms have nearest path nodes that exist
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const room of rooms) {
      if (!nodeIds.has(room.nearestPathNode)) {
        issues.push({
          type: 'error',
          message: `Room "${room.name}" references missing path node: ${room.nearestPathNode}`,
        });
      }
    }

    // Check edges reference existing nodes
    for (const edge of edges) {
      if (!nodeIds.has(edge.fromNodeId)) {
        issues.push({
          type: 'error',
          message: `Edge ${edge.id} references missing fromNode: ${edge.fromNodeId}`,
        });
      }
      if (!nodeIds.has(edge.toNodeId)) {
        issues.push({
          type: 'error',
          message: `Edge ${edge.id} references missing toNode: ${edge.toNodeId}`,
        });
      }
    }

    // Check for isolated nodes (no edges)
    const connectedNodes = new Set<string>();
    for (const edge of edges) {
      connectedNodes.add(edge.fromNodeId);
      connectedNodes.add(edge.toNodeId);
    }
    for (const node of nodes) {
      if (!connectedNodes.has(node.id)) {
        issues.push({
          type: 'warning',
          message: `Node "${node.label || node.id}" has no edges (isolated)`,
        });
      }
    }

    // Check map asset exists
    if (!mapData?.mapAssets?.length) {
      issues.push({
        type: 'warning',
        message: 'No map asset found for this floor',
      });
    }

    setValidationIssues(issues);
  }, [nodes, edges, rooms, mapData]);

  const testRoute = useCallback(async () => {
    if (!startNode || !destRoom) return;
    setRouteLoading(true);
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startNodeId: startNode, destinationRoomId: destRoom }),
      });
      const data = await res.json();
      setRouteResult(data);
    } catch {
      setRouteResult({ found: false, message: 'Request failed' });
    } finally {
      setRouteLoading(false);
    }
  }, [startNode, destRoom]);

  const stairNodes = nodes.filter((n) => n.label?.toLowerCase().includes('stairs'));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">🔧 Debug / Admin View</h1>
          <a href="/" className="text-blue-400 hover:text-blue-300 text-sm">
            ← Back to App
          </a>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">SELECT FLOOR</h2>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-2 text-sm"
            >
              <option value="">Select building...</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
            >
              <option value="">Select floor...</option>
              {floors.map((f) => (
                <option key={f.id} value={f.id}>Floor {f.number} — {f.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">OVERLAYS</h2>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Nodes', state: showNodes, setter: setShowNodes, color: 'bg-green-500' },
                { label: 'Edges', state: showEdges, setter: setShowEdges, color: 'bg-blue-500' },
                { label: 'Rooms', state: showRooms, setter: setShowRooms, color: 'bg-purple-500' },
                { label: 'Stairs', state: showStairs, setter: setShowStairs, color: 'bg-yellow-500' },
              ].map(({ label, state, setter, color }) => (
                <button
                  key={label}
                  onClick={() => setter(!state)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    state ? `${color} text-white` : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Map Visualization */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-2">
            FLOOR MAP {mapData ? `(${mapData.mapWidth}×${mapData.mapHeight})` : ''}
          </h2>
          {mapData ? (
            <div className="relative w-full" style={{ aspectRatio: `${mapData.mapWidth}/${mapData.mapHeight}` }}>
              {/* SVG map background */}
              {mapData.mapAssets[0] && (
                <img
                  src={mapData.mapAssets[0].url}
                  alt="Floor map"
                  className="absolute inset-0 w-full h-full"
                  style={{ opacity: 0.5 }}
                />
              )}

              {/* Overlay SVG */}
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox={`0 0 ${mapData.mapWidth} ${mapData.mapHeight}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Edges */}
                {showEdges &&
                  edges.map((edge) => {
                    const from = nodes.find((n) => n.id === edge.fromNodeId);
                    const to = nodes.find((n) => n.id === edge.toNodeId);
                    if (!from || !to) return null;
                    return (
                      <line
                        key={edge.id}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        opacity={0.6}
                      />
                    );
                  })}

                {/* Route polyline */}
                {routeResult?.found &&
                  routeResult.segments?.map((seg, si) => {
                    if (seg.floorId !== selectedFloor) return null;
                    const points = seg.coordinates.map((c) => `${c.x},${c.y}`).join(' ');
                    return (
                      <polyline
                        key={si}
                        points={points}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={4}
                        strokeDasharray="8 4"
                        opacity={0.9}
                      />
                    );
                  })}

                {/* Nodes */}
                {showNodes &&
                  nodes.map((node) => (
                    <g key={node.id}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={5}
                        fill="#22c55e"
                        stroke="#fff"
                        strokeWidth={1}
                        className="cursor-pointer"
                        onClick={() => setStartNode(node.id)}
                      />
                      <text
                        x={node.x}
                        y={node.y - 10}
                        textAnchor="middle"
                        fill="#9ca3af"
                        fontSize={8}
                      >
                        {node.label || node.id.split('-').pop()}
                      </text>
                    </g>
                  ))}

                {/* Room anchors */}
                {showRooms &&
                  rooms.map((room) => (
                    <g key={room.id}>
                      <rect
                        x={room.x - 15}
                        y={room.y - 10}
                        width={30}
                        height={20}
                        fill="#a855f7"
                        opacity={0.5}
                        rx={3}
                      />
                      <text
                        x={room.x}
                        y={room.y + 4}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={8}
                        fontWeight="bold"
                      >
                        {room.name}
                      </text>
                    </g>
                  ))}

                {/* Stairs */}
                {showStairs &&
                  stairNodes.map((node) => (
                    <g key={`stairs-${node.id}`}>
                      <rect
                        x={node.x - 12}
                        y={node.y - 12}
                        width={24}
                        height={24}
                        fill="#f59e0b"
                        stroke="#fff"
                        strokeWidth={1}
                        rx={4}
                      />
                      <text
                        x={node.x}
                        y={node.y + 4}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={10}
                      >
                        ⬛
                      </text>
                      <text
                        x={node.x}
                        y={node.y + 24}
                        textAnchor="middle"
                        fill="#f59e0b"
                        fontSize={8}
                      >
                        {node.label}
                      </text>
                    </g>
                  ))}
              </svg>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              Select a building and floor to view the map
            </div>
          )}
        </div>

        {/* Route Tester */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">ROUTE TESTER</h2>
            <select
              value={startNode}
              onChange={(e) => setStartNode(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-2 text-sm"
            >
              <option value="">Start node...</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label || n.id} ({n.x}, {n.y})
                </option>
              ))}
            </select>
            <select
              value={destRoom}
              onChange={(e) => setDestRoom(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-2 text-sm"
            >
              <option value="">Destination room...</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (cap: {r.capacity})
                </option>
              ))}
            </select>
            <button
              onClick={testRoute}
              disabled={!startNode || !destRoom || routeLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded px-3 py-2 text-sm font-medium transition-colors"
            >
              {routeLoading ? 'Calculating...' : 'Test Route'}
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">ROUTE RESULT</h2>
            {routeResult ? (
              <div className="text-sm">
                <div className={`font-medium ${routeResult.found ? 'text-green-400' : 'text-red-400'}`}>
                  {routeResult.found ? `✓ Route found (weight: ${routeResult.totalWeight})` : `✗ ${routeResult.message || 'No route'}`}
                </div>
                {routeResult.instructions && (
                  <ol className="mt-2 space-y-1 text-gray-300 list-decimal list-inside">
                    {routeResult.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ol>
                )}
                {routeResult.segments && (
                  <div className="mt-2 text-gray-400 text-xs">
                    {routeResult.segments.length} segment(s) across {new Set(routeResult.segments.map((s) => s.floorId)).size} floor(s)
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Select start node and destination, then click Test Route</p>
            )}
          </div>
        </div>

        {/* Stats & Validation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">FLOOR STATS</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-xl font-bold text-green-400">{nodes.length}</div>
                <div className="text-gray-400 text-xs">Nodes</div>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-xl font-bold text-blue-400">{edges.length}</div>
                <div className="text-gray-400 text-xs">Edges</div>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-xl font-bold text-purple-400">{rooms.length}</div>
                <div className="text-gray-400 text-xs">Rooms</div>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-xl font-bold text-yellow-400">{stairNodes.length}</div>
                <div className="text-gray-400 text-xs">Stairs</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">
              VALIDATION {validationIssues.length === 0 ? '✓' : `(${validationIssues.length} issues)`}
            </h2>
            {validationIssues.length === 0 ? (
              <p className="text-green-400 text-sm">All checks pass</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {validationIssues.map((issue, i) => (
                  <div
                    key={i}
                    className={`text-xs p-1.5 rounded ${
                      issue.type === 'error'
                        ? 'bg-red-900/50 text-red-300'
                        : 'bg-yellow-900/50 text-yellow-300'
                    }`}
                  >
                    {issue.type === 'error' ? '✗' : '⚠'} {issue.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Raw Data Tables */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-2">NODE TABLE</h2>
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-gray-400 border-b border-gray-700">
                <tr>
                  <th className="py-1 px-2">ID</th>
                  <th className="py-1 px-2">X</th>
                  <th className="py-1 px-2">Y</th>
                  <th className="py-1 px-2">Label</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {nodes.map((node) => (
                  <tr key={node.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-1 px-2 font-mono">{node.id}</td>
                    <td className="py-1 px-2">{node.x}</td>
                    <td className="py-1 px-2">{node.y}</td>
                    <td className="py-1 px-2">{node.label || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
