import { prisma } from '@/lib/prisma'

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const latStr = searchParams.get('lat')
  const lngStr = searchParams.get('lng')

  if (latStr === null || lngStr === null) {
    return Response.json(
      { error: 'lat and lng query parameters are required' },
      { status: 400 }
    )
  }

  const lat = Number(latStr)
  const lng = Number(lngStr)

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return Response.json(
      { error: 'Invalid coordinates. lat must be in [-90,90], lng in [-180,180]' },
      { status: 400 }
    )
  }

  try {
    const buildings = await prisma.building.findMany()

    const nearby = buildings
      .map((building: { latitude: number; longitude: number; geofenceRadius: number }) => {
        const distance = haversineDistance(lat, lng, building.latitude, building.longitude)
        return { ...building, distance }
      })
      .filter((b: { distance: number; geofenceRadius: number }) => b.distance <= b.geofenceRadius)
      .sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance)

    return Response.json(nearby)
  } catch (error) {
    console.error('Failed to fetch nearby buildings:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
