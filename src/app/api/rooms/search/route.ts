import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  const buildingId = searchParams.get('buildingId')
  const floorId = searchParams.get('floorId')
  const minCapacityStr = searchParams.get('minCapacity')
  const equipmentStr = searchParams.get('equipment')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {}

  if (name) {
    where.name = { contains: name, mode: 'insensitive' }
  }

  if (buildingId) {
    where.buildingId = buildingId
  }

  if (floorId) {
    where.floorId = floorId
  }

  if (minCapacityStr !== null) {
    const minCapacity = Number(minCapacityStr)
    if (
      !Number.isInteger(minCapacity) ||
      minCapacity < 0
    ) {
      return Response.json(
        { error: 'minCapacity must be a non-negative integer' },
        { status: 400 }
      )
    }
    where.capacity = { gte: minCapacity }
  }

  if (equipmentStr) {
    const equipmentNames = equipmentStr.split(',').map((s) => s.trim()).filter(Boolean)
    if (equipmentNames.length > 0) {
      where.AND = equipmentNames.map((eqName) => ({
        equipment: {
          some: {
            equipment: {
              name: eqName,
            },
          },
        },
      }))
    }
  }

  const rooms = await prisma.room.findMany({
    where,
    include: {
      building: { select: { id: true, name: true } },
      floor: { select: { id: true, number: true, name: true } },
      equipment: {
        include: {
          equipment: { select: { name: true } },
        },
      },
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = rooms.map((room: any) => ({
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    x: room.x,
    y: room.y,
    nearestPathNode: room.nearestPathNode,
    building: room.building,
    floor: room.floor,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    equipment: room.equipment.map((re: any) => ({
      name: re.equipment.name,
      quantity: re.quantity,
    })),
  }))

  return Response.json(result)
}
