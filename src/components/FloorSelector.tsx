'use client';

import React from 'react';

interface Floor {
  id: string;
  number: number;
  name: string;
  buildingId: string;
}

interface FloorSelectorProps {
  floors: Floor[];
  selectedFloor: Floor | null;
  onSelect: (floor: Floor) => void;
  onClose: () => void;
}

export default function FloorSelector({
  floors,
  selectedFloor,
  onSelect,
  onClose,
}: FloorSelectorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end max-w-lg mx-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-transition"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full bg-white rounded-t-2xl shadow-lg sheet-transition max-h-[60vh] flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-4 pb-4 overflow-y-auto flex-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select Floor
          </h2>

          <div className="space-y-1">
            {floors.map((floor) => {
              const isSelected = selectedFloor?.id === floor.id;
              return (
                <button
                  key={floor.id}
                  onClick={() => onSelect(floor)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-3 min-h-11 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  {/* Indicator */}
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      isSelected ? 'bg-blue-600' : 'border-2 border-gray-300'
                    }`}
                  />
                  <div className="text-sm font-medium text-gray-900">
                    Floor {floor.number} &mdash; {floor.name}
                  </div>
                </button>
              );
            })}
            {floors.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">
                No floors available.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
