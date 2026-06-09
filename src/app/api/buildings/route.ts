import { prisma } from '@/lib/prisma'

export async function GET() {
  const buildings = await prisma.building.findMany()
  return Response.json(buildings)
}
