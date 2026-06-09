import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  const { buildingId } = await params

  const building = await prisma.building.findUnique({
    where: { id: buildingId },
  })

  if (!building) {
    return Response.json({ error: 'Building not found' }, { status: 404 })
  }

  const floors = await prisma.floor.findMany({
    where: { buildingId },
    orderBy: { number: 'asc' },
  })

  return Response.json(floors)
}
