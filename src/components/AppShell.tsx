'use client';

import React from 'react';

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

interface AppShellProps {
  selectedBuilding: Building | null;
  selectedFloor: Floor | null;
  activeTab: 'map' | 'search';
  onTabChange: (tab: 'map' | 'search') => void;
  onBuildingSelectorOpen: () => void;
  onFloorSelectorOpen: () => void;
  children: React.ReactNode;
}

export default function AppShell({
  selectedBuilding,
  selectedFloor,
  activeTab,
  onTabChange,
  onBuildingSelectorOpen,
  onFloorSelectorOpen,
  children,
}: AppShellProps) {
  return (
    <div className="flex flex-col h-full max-w-lg mx-auto w-full bg-white relative">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-12 px-4 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={onBuildingSelectorOpen}
          className="flex items-center gap-1 min-h-11 text-sm font-semibold text-gray-900 truncate"
        >
          <span className="truncate max-w-[200px]">
            {selectedBuilding?.name ?? 'Select Building'}
          </span>
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {selectedFloor && (
          <button
            onClick={onFloorSelectorOpen}
            className="flex items-center gap-1 min-h-11 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-full"
          >
            Floor {selectedFloor.number}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </header>

      {/* Content area */}
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 max-w-lg mx-auto">
        <div className="flex h-14">
          <button
            onClick={() => onTabChange('map')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-11 ${
              activeTab === 'map' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'map' ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-xs font-medium">Map</span>
            {activeTab === 'map' && (
              <div className="absolute bottom-0 w-12 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

          <button
            onClick={() => onTabChange('search')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-11 ${
              activeTab === 'search' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'search' ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs font-medium">Search</span>
            {activeTab === 'search' && (
              <div className="absolute bottom-0 w-12 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}
