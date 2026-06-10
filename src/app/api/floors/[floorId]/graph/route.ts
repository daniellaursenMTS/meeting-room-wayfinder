import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ floorId: string }> }
) {
  const { floorId } = await params

  try {
    const floor = await prisma.floor.findUnique({
      where: { id: floorId },
      include: {
        pathNodes: {
          select: { id: true, x: true, y: true, label: true },
        },
      },
    })

    if (!floor) {
      return Response.json({ error: 'Floor not found' }, { status: 404 })
    }

    const nodeIds = floor.pathNodes.map((n: { id: string }) => n.id)

    const edges = await prisma.pathEdge.findMany({
      where: {
        fromNodeId: { in: nodeIds },
      },
      select: {
        id: true,
        fromNodeId: true,
        toNodeId: true,
        weight: true,
      },
    })

    return Response.json({
      floorId: floor.id,
      floorNumber: floor.number,
      floorName: floor.name,
      nodes: floor.pathNodes,
      edges,
    })
  } catch (error) {
    console.error('Failed to fetch floor graph:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
