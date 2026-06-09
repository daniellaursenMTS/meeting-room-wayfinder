'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

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

interface SearchViewProps {
  buildings: Building[];
  floors: Floor[];
  selectedBuilding: Building | null;
  selectedFloor: Floor | null;
  onSelectRoom: (room: Room) => void;
}

type FilterKey = 'building' | 'floor' | 'capacity' | 'equipment';

const CAPACITY_OPTIONS = [2, 4, 6, 8, 10, 20];
const EQUIPMENT_OPTIONS = [
  'Projector',
  'Whiteboard',
  'Video Conferencing',
  'TV Screen',
  'Speakerphone',
];

export default function SearchView({
  buildings,
  floors,
  selectedBuilding,
  selectedFloor,
  onSelectRoom,
}: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);

  // Filters
  const [filterBuildingId, setFilterBuildingId] = useState<string | null>(
    selectedBuilding?.id ?? null
  );
  const [filterFloorId, setFilterFloorId] = useState<string | null>(null);
  const [filterMinCapacity, setFilterMinCapacity] = useState<number | null>(
    null
  );
  const [filterEquipment, setFilterEquipment] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const filterRowRef = useRef<HTMLDivElement>(null);

  const performSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('name', query.trim());
      if (filterBuildingId) params.set('buildingId', filterBuildingId);
      if (filterFloorId) params.set('floorId', filterFloorId);
      if (filterMinCapacity !== null)
        params.set('minCapacity', String(filterMinCapacity));
      if (filterEquipment.length > 0)
        params.set('equipment', filterEquipment.join(','));

      const res = await fetch(`/api/rooms/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [query, filterBuildingId, filterFloorId, filterMinCapacity, filterEquipment]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [performSearch]);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        filterRowRef.current &&
        !filterRowRef.current.contains(e.target as Node)
      ) {
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const activeFilterCount =
    (filterBuildingId ? 1 : 0) +
    (filterFloorId ? 1 : 0) +
    (filterMinCapacity !== null ? 1 : 0) +
    (filterEquipment.length > 0 ? 1 : 0);

  const floorsForBuilding = filterBuildingId
    ? floors.filter((f) => f.buildingId === filterBuildingId)
    : floors;

  return (
    <div className="flex flex-col h-full pb-14">
      {/* Search input */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms\u2026"
            className="w-full h-10 pl-9 pr-8 text-sm bg-gray-100 rounded-lg border-0 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter row */}
      <div
        ref={filterRowRef}
        className="px-4 pb-2 flex gap-2 overflow-x-auto no-select relative"
      >
        {/* Building filter */}
        <div className="relative">
          <button
            onClick={() =>
              setOpenFilter(openFilter === 'building' ? null : 'building')
            }
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border min-h-8 ${
              filterBuildingId
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Building
            {filterBuildingId && (
              <span className="ml-1">&times;</span>
            )}
          </button>
          {openFilter === 'building' && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1 max-h-48 overflow-y-auto">
              <button
                onClick={() => {
                  setFilterBuildingId(null);
                  setFilterFloorId(null);
                  setOpenFilter(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
              >
                All Buildings
              </button>
              {buildings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setFilterBuildingId(b.id);
                    if (filterFloorId) {
                      const floorStillValid = floors.some(
                        (f) => f.id === filterFloorId && f.buildingId === b.id
                      );
                      if (!floorStillValid) setFilterFloorId(null);
                    }
                    setOpenFilter(null);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                    filterBuildingId === b.id
                      ? 'font-semibold text-blue-600'
                      : 'text-gray-700'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Floor filter */}
        <div className="relative">
          <button
            onClick={() =>
              setOpenFilter(openFilter === 'floor' ? null : 'floor')
            }
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border min-h-8 ${
              filterFloorId
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Floor
            {filterFloorId && <span className="ml-1">&times;</span>}
          </button>
          {openFilter === 'floor' && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1 max-h-48 overflow-y-auto">
              <button
                onClick={() => {
                  setFilterFloorId(null);
                  setOpenFilter(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
              >
                All Floors
              </button>
              {floorsForBuilding.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilterFloorId(f.id);
                    setOpenFilter(null);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                    filterFloorId === f.id
                      ? 'font-semibold text-blue-600'
                      : 'text-gray-700'
                  }`}
                >
                  Floor {f.number} &mdash; {f.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Capacity filter */}
        <div className="relative">
          <button
            onClick={() =>
              setOpenFilter(openFilter === 'capacity' ? null : 'capacity')
            }
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border min-h-8 ${
              filterMinCapacity !== null
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Capacity{filterMinCapacity !== null ? ` ${filterMinCapacity}+` : ''}
          </button>
          {openFilter === 'capacity' && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
              <button
                onClick={() => {
                  setFilterMinCapacity(null);
                  setOpenFilter(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
              >
                Any
              </button>
              {CAPACITY_OPTIONS.map((cap) => (
                <button
                  key={cap}
                  onClick={() => {
                    setFilterMinCapacity(cap);
                    setOpenFilter(null);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                    filterMinCapacity === cap
                      ? 'font-semibold text-blue-600'
                      : 'text-gray-700'
                  }`}
                >
                  {cap}+ people
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Equipment filter */}
        <div className="relative">
          <button
            onClick={() =>
              setOpenFilter(openFilter === 'equipment' ? null : 'equipment')
            }
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border min-h-8 ${
              filterEquipment.length > 0
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Equipment
            {filterEquipment.length > 0 && (
              <span className="ml-1">({filterEquipment.length})</span>
            )}
          </button>
          {openFilter === 'equipment' && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const isActive = filterEquipment.includes(eq);
                return (
                  <button
                    key={eq}
                    onClick={() => {
                      setFilterEquipment((prev) =>
                        isActive
                          ? prev.filter((e) => e !== eq)
                          : [...prev, eq]
                      );
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2"
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                        isActive
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {isActive && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <span className={isActive ? 'text-blue-600 font-medium' : 'text-gray-700'}>
                      {eq}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={() => {
              setFilterBuildingId(null);
              setFilterFloorId(null);
              setFilterMinCapacity(null);
              setFilterEquipment([]);
              setOpenFilter(null);
            }}
            className="whitespace-nowrap px-2 py-1.5 text-xs text-red-500 font-medium min-h-8"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm font-medium text-gray-900">No rooms found</p>
            <p className="text-xs text-gray-500 mt-1">
              Try a different name or adjust your filters.
            </p>
          </div>
        )}

        {!loading && (
          <div className="space-y-2 pb-4">
            {results.map((room) => (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room)}
                className="w-full text-left p-3 min-h-11 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 active:bg-blue-50 transition-colors"
              >
                <div className="font-medium text-base text-gray-900">
                  {room.name}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {room.building.name} &middot; Floor {room.floor.number}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {room.capacity}
                  </span>
                  {room.equipment.length > 0 && (
                    <span className="truncate">
                      {room.equipment.map((e) => e.name).join(', ')}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
