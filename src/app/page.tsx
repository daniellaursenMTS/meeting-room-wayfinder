'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppShell from '@/components/AppShell';
import BuildingSelector from '@/components/BuildingSelector';
import FloorSelector from '@/components/FloorSelector';
import MapView from '@/components/MapView';
import SearchView from '@/components/SearchView';
import RoutePanel from '@/components/RoutePanel';

// ---------- Types ----------

interface Building {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
}

interface Floor {
  id: string;
  number: number;
  name: string;
  buildingId: string;
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

interface CurrentPosition {
  nodeId: string;
  x: number;
  y: number;
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
  segments?: Array<{
    floorId: string;
    floorNumber: number;
    floorName: string;
    nodeIds: string[];
    coordinates: Array<{ x: number; y: number }>;
  }>;
  instructions?: string[];
  message?: string;
}

// ---------- localStorage helpers ----------

const LS_BUILDING_KEY = 'wayfinder_buildingId';
const LS_FLOOR_KEY = 'wayfinder_floorId';

function loadFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveToStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

// ---------- Main Page ----------

export default function Home() {
  const pendingFloorIdRef = useRef<string | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'search'>('map');
  const [currentPosition, setCurrentPosition] = useState<CurrentPosition | null>(null);
  const [destination, setDestination] = useState<Room | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [showBuildingSelector, setShowBuildingSelector] = useState(false);
  const [showFloorSelector, setShowFloorSelector] = useState(false);
  const [suggestedBuilding, setSuggestedBuilding] = useState<Building | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Fetch all buildings on mount
  useEffect(() => {
    fetch('/api/buildings')
      .then((r) => r.json())
      .then((data) => {
        setBuildings(data);
        return data as Building[];
      })
      .then((allBuildings) => {
        // Try restoring from localStorage
        const savedBuildingId = loadFromStorage(LS_BUILDING_KEY);
        const savedFloorId = loadFromStorage(LS_FLOOR_KEY);
        const savedBuilding = savedBuildingId
          ? allBuildings.find((b) => b.id === savedBuildingId) ?? null
          : null;

        if (savedBuilding) {
          setSelectedBuilding(savedBuilding);
          // Floors will be loaded via the building-change effect
          if (savedFloorId) {
            // We'll restore the floor after floors are loaded
            pendingFloorIdRef.current = savedFloorId;
          }
        }

        // Try geolocation regardless
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              fetch(
                `/api/buildings/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
              )
                .then((r) => r.json())
                .then((nearby) => {
                  if (Array.isArray(nearby) && nearby.length > 0) {
                    setSuggestedBuilding(nearby[0]);
                    if (!savedBuilding) {
                      // Show building selector with suggestion
                      setShowBuildingSelector(true);
                    }
                  } else if (!savedBuilding) {
                    setShowBuildingSelector(true);
                  }
                  setInitialized(true);
                })
                .catch(() => {
                  if (!savedBuilding) setShowBuildingSelector(true);
                  setInitialized(true);
                });
            },
            () => {
              // Geolocation denied/failed
              if (!savedBuilding) setShowBuildingSelector(true);
              setInitialized(true);
            },
            { timeout: 5000 }
          );
        } else {
          if (!savedBuilding) setShowBuildingSelector(true);
          setInitialized(true);
        }
      })
      .catch(() => {
        setShowBuildingSelector(true);
        setInitialized(true);
      });
  }, []);

  // Load floors when building changes
  useEffect(() => {
    if (!selectedBuilding) {
      setFloors([]);
      setSelectedFloor(null);
      return;
    }

    fetch(`/api/buildings/${selectedBuilding.id}/floors`)
      .then((r) => r.json())
      .then((data: Floor[]) => {
        setFloors(data);

        // Try to restore pending floor from localStorage
        if (pendingFloorIdRef.current) {
          const pendingId = pendingFloorIdRef.current;
          pendingFloorIdRef.current = null;
          const restored = data.find((f) => f.id === pendingId);
          if (restored) {
            setSelectedFloor(restored);
            return;
          }
        }

        // Default to first floor if none selected
        if (data.length > 0 && !selectedFloor) {
          setSelectedFloor(data[0]);
        }
      })
      .catch(() => {
        setFloors([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuilding]);

  // Persist selections to localStorage
  useEffect(() => {
    if (selectedBuilding) saveToStorage(LS_BUILDING_KEY, selectedBuilding.id);
  }, [selectedBuilding]);

  useEffect(() => {
    if (selectedFloor) saveToStorage(LS_FLOOR_KEY, selectedFloor.id);
  }, [selectedFloor]);

  // Clear position/route when floor changes
  useEffect(() => {
    setCurrentPosition(null);
    setRoute(null);
  }, [selectedFloor]);

  // ---------- Handlers ----------

  const handleSelectBuilding = useCallback((building: Building) => {
    setSelectedBuilding(building);
    setSelectedFloor(null);
    setCurrentPosition(null);
    setDestination(null);
    setRoute(null);
    setShowBuildingSelector(false);
  }, []);

  const handleSelectFloor = useCallback((floor: Floor) => {
    setSelectedFloor(floor);
    setShowFloorSelector(false);
  }, []);

  const handleSelectRoom = useCallback(
    (room: Room) => {
      setDestination(room);
      setActiveTab('map');

      // If the room is on a different floor, switch to it
      if (room.floor.id !== selectedFloor?.id) {
        const targetFloor = floors.find((f) => f.id === room.floor.id);
        if (targetFloor) {
          setSelectedFloor(targetFloor);
          // Clear position since we're changing floors
          setCurrentPosition(null);
          setRoute(null);
        }
      }
    },
    [selectedFloor, floors]
  );

  const handleSetPosition = useCallback((pos: CurrentPosition) => {
    setCurrentPosition(pos);
  }, []);

  const handleRouteCalculated = useCallback((result: RouteResult | null) => {
    setRoute(result);
  }, []);

  const handleClearRoute = useCallback(() => {
    setRoute(null);
    setDestination(null);
  }, []);

  // ---------- Render ----------

  // Show a loading spinner until initialized
  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-white max-w-lg mx-auto">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50">
      <AppShell
        selectedBuilding={selectedBuilding}
        selectedFloor={selectedFloor}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBuildingSelectorOpen={() => setShowBuildingSelector(true)}
        onFloorSelectorOpen={() => setShowFloorSelector(true)}
      >
        {activeTab === 'map' ? (
          <MapView
            selectedFloor={selectedFloor}
            currentPosition={currentPosition}
            destination={destination}
            route={route}
            onSetPosition={handleSetPosition}
            onRouteCalculated={handleRouteCalculated}
          />
        ) : (
          <SearchView
            buildings={buildings}
            floors={floors}
            selectedBuilding={selectedBuilding}
            selectedFloor={selectedFloor}
            onSelectRoom={handleSelectRoom}
          />
        )}

        {/* Route panel overlay on map tab */}
        {activeTab === 'map' && route && (
          <RoutePanel route={route} onClearRoute={handleClearRoute} />
        )}
      </AppShell>

      {/* Bottom sheet overlays */}
      {showBuildingSelector && (
        <BuildingSelector
          buildings={buildings}
          suggestedBuilding={suggestedBuilding}
          onSelect={handleSelectBuilding}
          onClose={() => setShowBuildingSelector(false)}
        />
      )}

      {showFloorSelector && (
        <FloorSelector
          floors={floors}
          selectedFloor={selectedFloor}
          onSelect={handleSelectFloor}
          onClose={() => setShowFloorSelector(false)}
        />
      )}
    </div>
  );
}
