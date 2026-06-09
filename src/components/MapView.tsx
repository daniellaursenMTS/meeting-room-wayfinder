'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { snapToNearestEdge } from '@/lib/snap';

// ---------- Types ----------

interface Floor {
  id: string;
  number: number;
  name: string;
  buildingId: string;
}

interface MapData {
  floorId: string;
  floorNumber: number;
  floorName: string;
  mapWidth: number;
  mapHeight: number;
  mapAssets: Array<{
    id: string;
    filename: string;
    url: string;
    mimeType: string;
  }>;
}

interface GraphData {
  floorId: string;
  nodes: Array<{ id: string; x: number; y: number; label: string | null }>;
  edges: Array<{
    id: string;
    fromNodeId: string;
    toNodeId: string;
    weight: number;
  }>;
}

interface RouteSegment {
  floorId: string;
  floorNumber: number;
  floorName: string;
  nodeIds: string[];
  coordinates: Array<{ x: number; y: number }>;
}

interface RouteResult {
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

interface CurrentPosition {
  nodeId: string;
  x: number;
  y: number;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  x: number;
  y: number;
  nearestPathNode: string;
  building: { id: string; name: string };
  floor: { id: string; number: number; name: string };
  equipment: Array<{ name: string; quantity: number }>;
}

interface MapViewProps {
  selectedFloor: Floor | null;
  currentPosition: CurrentPosition | null;
  destination: Room | null;
  route: RouteResult | null;
  onSetPosition: (pos: CurrentPosition) => void;
  onRouteCalculated: (route: RouteResult | null) => void;
}

// ---------- Component ----------

export default function MapView({
  selectedFloor,
  currentPosition,
  destination,
  route,
  onSetPosition,
  onRouteCalculated,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loadingMap, setLoadingMap] = useState(false);

  // Pan & zoom state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [minScale, setMinScale] = useState(1);

  // Touch tracking
  const gestureRef = useRef<{
    isPanning: boolean;
    startX: number;
    startY: number;
    startTranslateX: number;
    startTranslateY: number;
    startScale: number;
    startDist: number;
    pinchMidX: number;
    pinchMidY: number;
  }>({
    isPanning: false,
    startX: 0,
    startY: 0,
    startTranslateX: 0,
    startTranslateY: 0,
    startScale: 1,
    startDist: 0,
    pinchMidX: 0,
    pinchMidY: 0,
  });

  // Load map data when floor changes
  useEffect(() => {
    if (!selectedFloor) {
      setMapData(null);
      setGraphData(null);
      return;
    }
    let cancelled = false;
    setLoadingMap(true);

    Promise.all([
      fetch(`/api/floors/${selectedFloor.id}/map`).then((r) => r.json()),
      fetch(`/api/floors/${selectedFloor.id}/graph`).then((r) => r.json()),
    ])
      .then(([map, graph]) => {
        if (cancelled) return;
        setMapData(map);
        setGraphData(graph);
        setLoadingMap(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingMap(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFloor]);

  // Fit map to container on load
  useEffect(() => {
    if (!mapData || !containerRef.current) return;
    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const mw = mapData.mapWidth || 1000;
    const mh = mapData.mapHeight || 700;
    const fitScale = Math.min(cw / mw, ch / mh);
    setMinScale(fitScale);
    setScale(fitScale);
    setTranslate({
      x: (cw - mw * fitScale) / 2,
      y: (ch - mh * fitScale) / 2,
    });
  }, [mapData]);

  // Auto-route when position + destination are both set
  useEffect(() => {
    if (!currentPosition || !destination) return;
    let cancelled = false;

    fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startNodeId: currentPosition.nodeId,
        destinationRoomId: destination.id,
      }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (!cancelled) onRouteCalculated(result);
      })
      .catch(() => {
        if (!cancelled)
          onRouteCalculated({
            found: false,
            message: 'Failed to calculate route. Please try again.',
          });
      });

    return () => {
      cancelled = true;
    };
  }, [currentPosition, destination, onRouteCalculated]);

  // Convert screen coords to map coords
  const screenToMap = useCallback(
    (screenX: number, screenY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const cx = screenX - rect.left;
      const cy = screenY - rect.top;
      return {
        x: (cx - translate.x) / scale,
        y: (cy - translate.y) / scale,
      };
    },
    [scale, translate]
  );

  // Handle map tap to set position
  const handleMapClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!graphData || !graphData.nodes.length) return;

      let clientX: number, clientY: number;
      if ('touches' in e) {
        // Don't handle multi-touch as a tap
        if (e.touches.length > 1) return;
        const touch = e.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const mapCoords = screenToMap(clientX, clientY);

      // Clamp to map bounds
      const mw = mapData?.mapWidth || 1000;
      const mh = mapData?.mapHeight || 700;
      const clampedX = Math.max(0, Math.min(mw, mapCoords.x));
      const clampedY = Math.max(0, Math.min(mh, mapCoords.y));

      const snapped = snapToNearestEdge(
        clampedX,
        clampedY,
        graphData.nodes,
        graphData.edges
      );

      onSetPosition(snapped);
    },
    [graphData, mapData, screenToMap, onSetPosition]
  );

  // ---------- Touch handlers for pan/zoom ----------

  const getTouchDist = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        gestureRef.current = {
          ...gestureRef.current,
          isPanning: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          startTranslateX: translate.x,
          startTranslateY: translate.y,
          startScale: scale,
        };
      } else if (e.touches.length === 2) {
        const dist = getTouchDist(e.touches);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        gestureRef.current = {
          ...gestureRef.current,
          isPanning: false,
          startDist: dist,
          startScale: scale,
          startTranslateX: translate.x,
          startTranslateY: translate.y,
          pinchMidX: midX,
          pinchMidY: midY,
        };
      }
    },
    [scale, translate]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const g = gestureRef.current;

      if (e.touches.length === 1 && g.isPanning) {
        const dx = e.touches[0].clientX - g.startX;
        const dy = e.touches[0].clientY - g.startY;
        setTranslate({
          x: g.startTranslateX + dx,
          y: g.startTranslateY + dy,
        });
      } else if (e.touches.length === 2) {
        const dist = getTouchDist(e.touches);
        const ratio = dist / g.startDist;
        let newScale = g.startScale * ratio;
        newScale = Math.max(minScale, Math.min(4, newScale));

        // Zoom toward pinch midpoint
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          const cx = midX - containerRect.left;
          const cy = midY - containerRect.top;

          const mapX = (cx - g.startTranslateX) / g.startScale;
          const mapY = (cy - g.startTranslateY) / g.startScale;

          setScale(newScale);
          setTranslate({
            x: cx - mapX * newScale,
            y: cy - mapY * newScale,
          });
        }
      }
    },
    [minScale]
  );

  // Track whether a touch was a tap (minimal movement) vs a pan/pinch
  const tapTrackRef = useRef<{ startX: number; startY: number; startTime: number } | null>(null);

  const handleTouchStartWrapper = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        tapTrackRef.current = {
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          startTime: Date.now(),
        };
      } else {
        tapTrackRef.current = null;
      }
      handleTouchStart(e);
    },
    [handleTouchStart]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const tap = tapTrackRef.current;
      if (tap && e.changedTouches.length === 1) {
        const dx = Math.abs(e.changedTouches[0].clientX - tap.startX);
        const dy = Math.abs(e.changedTouches[0].clientY - tap.startY);
        const dt = Date.now() - tap.startTime;
        // Consider it a tap if moved less than 10px and was shorter than 300ms
        if (dx < 10 && dy < 10 && dt < 300) {
          handleMapClick(e);
        }
      }
      tapTrackRef.current = null;
      gestureRef.current.isPanning = false;
    },
    [handleMapClick]
  );

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const cx = e.clientX - containerRect.left;
      const cy = e.clientY - containerRect.top;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      let newScale = scale * zoomFactor;
      newScale = Math.max(minScale, Math.min(4, newScale));

      const mapX = (cx - translate.x) / scale;
      const mapY = (cy - translate.y) / scale;

      setScale(newScale);
      setTranslate({
        x: cx - mapX * newScale,
        y: cy - mapY * newScale,
      });
    },
    [scale, translate, minScale]
  );

  // ---------- Rendering ----------

  if (!selectedFloor) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm pb-14">
        Select a building and floor to view the map.
      </div>
    );
  }

  if (loadingMap) {
    return (
      <div className="flex items-center justify-center h-full pb-14">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const mapWidth = mapData?.mapWidth || 1000;
  const mapHeight = mapData?.mapHeight || 700;
  const mapAssetUrl = mapData?.mapAssets?.[0]?.url;

  // Get the route segment for the current floor
  const currentFloorSegment = route?.found
    ? route.segments?.find((s) => s.floorId === selectedFloor.id)
    : null;

  // Build route polyline points string
  const polylinePoints = currentFloorSegment
    ? currentFloorSegment.coordinates.map((c) => `${c.x},${c.y}`).join(' ')
    : '';

  return (
    <div className="relative h-full pb-14">
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden no-select relative"
        onTouchStart={handleTouchStartWrapper}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleMapClick}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      >
        {/* Map content with transform */}
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: mapWidth,
            height: mapHeight,
            position: 'relative',
          }}
        >
          {/* Floor map image / placeholder */}
          {mapAssetUrl ? (
            <img
              src={mapAssetUrl}
              alt={`Floor ${selectedFloor.number} map`}
              width={mapWidth}
              height={mapHeight}
              className="block"
              draggable={false}
            />
          ) : (
            <div
              className="bg-gray-100 border border-gray-200"
              style={{ width: mapWidth, height: mapHeight }}
            >
              <svg width={mapWidth} height={mapHeight} viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
                {/* Grid lines for placeholder */}
                {Array.from({ length: Math.floor(mapWidth / 100) + 1 }, (_, i) => (
                  <line
                    key={`v${i}`}
                    x1={i * 100}
                    y1={0}
                    x2={i * 100}
                    y2={mapHeight}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                ))}
                {Array.from({ length: Math.floor(mapHeight / 100) + 1 }, (_, i) => (
                  <line
                    key={`h${i}`}
                    x1={0}
                    y1={i * 100}
                    x2={mapWidth}
                    y2={i * 100}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                ))}
                <text x={mapWidth / 2} y={mapHeight / 2} textAnchor="middle" fill="#9ca3af" fontSize={14}>
                  Floor {selectedFloor.number} — {selectedFloor.name}
                </text>
              </svg>
            </div>
          )}

          {/* SVG overlay for route and markers */}
          <svg
            width={mapWidth}
            height={mapHeight}
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            className="absolute top-0 left-0 pointer-events-none"
          >
            {/* Route polyline */}
            {polylinePoints && (
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="#2563eb"
                strokeWidth={4 / scale}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${8 / scale} ${4 / scale}`}
                opacity={0.8}
              />
            )}

            {/* Current position marker */}
            {currentPosition && (
              <g>
                {/* Pulsing ring */}
                <circle
                  cx={currentPosition.x}
                  cy={currentPosition.y}
                  r={12 / scale}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={2 / scale}
                  opacity={0.4}
                  className="pulse-ring"
                />
                {/* Blue dot */}
                <circle
                  cx={currentPosition.x}
                  cy={currentPosition.y}
                  r={8 / scale}
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth={2 / scale}
                />
              </g>
            )}

            {/* Destination marker */}
            {destination && destination.floor.id === selectedFloor.id && (
              <g transform={`translate(${destination.x}, ${destination.y})`}>
                {/* Pin shape */}
                <path
                  d={`M0,${-20 / scale} C${-8 / scale},${-20 / scale} ${-12 / scale},${-14 / scale} ${-12 / scale},${-8 / scale} C${-12 / scale},${-2 / scale} 0,${4 / scale} 0,${4 / scale} C0,${4 / scale} ${12 / scale},${-2 / scale} ${12 / scale},${-8 / scale} C${12 / scale},${-14 / scale} ${8 / scale},${-20 / scale} 0,${-20 / scale}Z`}
                  fill="#dc2626"
                  stroke="#ffffff"
                  strokeWidth={1.5 / scale}
                />
                <circle
                  cx={0}
                  cy={-8 / scale}
                  r={3 / scale}
                  fill="#ffffff"
                />
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Prompt when no position set */}
      {!currentPosition && (
        <div className="absolute bottom-20 left-4 right-4 bg-white/95 rounded-lg shadow-md px-4 py-3 text-center">
          <p className="text-sm text-gray-700">
            Tap the map to set your current position
          </p>
        </div>
      )}
    </div>
  );
}
