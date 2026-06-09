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

interface BuildingSelectorProps {
  buildings: Building[];
  suggestedBuilding: Building | null;
  onSelect: (building: Building) => void;
  onClose: () => void;
}

export default function BuildingSelector({
  buildings,
  suggestedBuilding,
  onSelect,
  onClose,
}: BuildingSelectorProps) {
  const [showAll, setShowAll] = React.useState(!suggestedBuilding);

  return (
    <div className="fixed inset-0 z-50 flex items-end max-w-lg mx-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-transition"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full bg-white rounded-t-2xl shadow-lg sheet-transition max-h-[80vh] flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-4 pb-4 overflow-y-auto flex-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select Building
          </h2>

          {/* Suggested building */}
          {suggestedBuilding && !showAll && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                It looks like you&apos;re at{' '}
                <span className="font-semibold text-gray-900">
                  {suggestedBuilding.name}
                </span>
              </p>
              <button
                onClick={() => onSelect(suggestedBuilding)}
                className="w-full min-h-11 bg-blue-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm"
              >
                Yes, that&apos;s right
              </button>
              <button
                onClick={() => setShowAll(true)}
                className="w-full min-h-11 text-blue-600 text-sm font-medium mt-2 px-4 py-2"
              >
                Choose a different building
              </button>
            </div>
          )}

          {/* All buildings list */}
          {(showAll || !suggestedBuilding) && (
            <div className="space-y-1">
              {buildings.map((building) => (
                <button
                  key={building.id}
                  onClick={() => onSelect(building)}
                  className="w-full text-left px-3 py-3 min-h-11 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="font-medium text-gray-900 text-sm">
                    {building.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {building.address}
                  </div>
                </button>
              ))}
              {buildings.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">
                  No buildings available.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
