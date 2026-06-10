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
        mapAssets: {
          select: {
            id: true,
            filename: true,
            url: true,
            mimeType: true,
          },
        },
      },
    })

    if (!floor) {
      return Response.json({ error: 'Floor not found' }, { status: 404 })
    }

    return Response.json({
      floorId: floor.id,
      floorNumber: floor.number,
      floorName: floor.name,
      mapWidth: floor.mapWidth,
      mapHeight: floor.mapHeight,
      mapAssets: floor.mapAssets,
    })
  } catch (error) {
    console.error('Failed to fetch floor map:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
