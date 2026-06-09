import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ floorId: string }> }
) {
  const { floorId } = await params

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
}
