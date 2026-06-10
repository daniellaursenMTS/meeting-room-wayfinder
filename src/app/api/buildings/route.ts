import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const buildings = await prisma.building.findMany()
    return Response.json(buildings)
  } catch (error) {
    console.error('Failed to fetch buildings:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
