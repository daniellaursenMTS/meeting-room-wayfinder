'use client';

import React, { useState } from 'react';

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

interface RoutePanelProps {
  route: RouteResult | null;
  onClearRoute: () => void;
}

export default function RoutePanel({ route, onClearRoute }: RoutePanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!route) return null;

  // Error state
  if (!route.found) {
    return (
      <div className="fixed bottom-14 left-0 right-0 z-20 max-w-lg mx-auto">
        <div className="bg-white rounded-t-2xl shadow-lg border-t border-gray-200 px-4 py-4">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              We couldn&apos;t find a route
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {route.message || 'The destination may be unreachable from your current position.'}
            </p>
          </div>
          <button
            onClick={onClearRoute}
            className="w-full mt-3 text-sm text-red-500 font-medium min-h-11"
          >
            Clear Route
          </button>
        </div>
      </div>
    );
  }

  const instructions = route.instructions ?? [];
  const isMultiFloor = (route.segments?.length ?? 0) > 1;

  return (
    <div className="fixed bottom-14 left-0 right-0 z-20 max-w-lg mx-auto">
      <div
        className={`bg-white rounded-t-2xl shadow-lg border-t border-gray-200 sheet-transition ${
          expanded ? 'max-h-[60vh]' : 'max-h-32'
        } overflow-hidden flex flex-col`}
      >
        {/* Drag handle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex flex-col items-center pt-2 pb-1 w-full shrink-0"
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </button>

        {/* Header / peek state */}
        <div className="px-4 pb-2 shrink-0">
          {route.destination && (
            <p className="text-sm font-semibold text-gray-900">
              Route to {route.destination.roomName}
            </p>
          )}
          {!expanded && instructions.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {instructions[0]}
            </p>
          )}
          {!expanded && (
            <p className="text-xs text-blue-600 font-medium mt-1">
              Swipe up for directions
            </p>
          )}
        </div>

        {/* Expanded instructions */}
        {expanded && (
          <div className="px-4 pb-4 overflow-y-auto flex-1">
            <ol className="space-y-2.5 mt-1">
              {instructions.map((instruction, idx) => {
                const isStairs =
                  isMultiFloor &&
                  (instruction.toLowerCase().includes('stair') ||
                    instruction.toLowerCase().includes('elevator') ||
                    instruction.toLowerCase().includes('take '));
                return (
                  <li key={idx} className="flex gap-2.5 text-sm text-gray-700">
                    <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                      {idx + 1}
                    </span>
                    <span>
                      {isStairs && '\ud83e\ude9c '}
                      {instruction}
                    </span>
                  </li>
                );
              })}
            </ol>

            <button
              onClick={onClearRoute}
              className="w-full mt-4 text-sm text-red-500 font-medium min-h-11"
            >
              Clear Route
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
