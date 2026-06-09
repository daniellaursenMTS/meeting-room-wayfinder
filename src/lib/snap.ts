/**
 * Client-side snap-to-nearest-edge utility.
 * Mirrors the server-side snapToNearestEdge in routing.ts.
 */

export function snapToNearestEdge(
  x: number,
  y: number,
  nodes: Array<{ id: string; x: number; y: number }>,
  edges: Array<{ fromNodeId: string; toNodeId: string }>
): { nodeId: string; x: number; y: number } {
  const nodeMap = new Map<string, { id: string; x: number; y: number }>();
  for (const n of nodes) nodeMap.set(n.id, n);

  let bestDist = Infinity;
  let bestNodeId = nodes[0]?.id ?? "";

  for (const edge of edges) {
    const a = nodeMap.get(edge.fromNodeId);
    const b = nodeMap.get(edge.toNodeId);
    if (!a || !b) continue;

    // Project (x, y) onto the line segment a->b
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

  const bestNode = nodeMap.get(bestNodeId);
  return {
    nodeId: bestNodeId,
    x: bestNode?.x ?? x,
    y: bestNode?.y ?? y,
  };
}
