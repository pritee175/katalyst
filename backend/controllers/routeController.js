const { getRouteAlternatives } = require('../services/tomtomService');
const { calculateISC, calculateOptimalCost } = require('../services/safetyService');

/**
 * POST /api/route/safest
 * Find the safest route between origin and destination
 */
async function findSafestRoute(req, res) {
  try {
    const { origin, destination, alpha = 0.7 } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ 
        error: 'Origin and destination are required',
        example: {
          origin: { lat: 40.7128, lon: -74.0060 },
          destination: { lat: 40.7589, lon: -73.9851 },
          alpha: 0.7
        }
      });
    }

    // Validate alpha (0-1)
    const safetyWeight = Math.max(0, Math.min(1, parseFloat(alpha)));

    // Get route alternatives from TomTom
    const routeData = await getRouteAlternatives(origin, destination, 3);
    
    if (!routeData.routes || routeData.routes.length === 0) {
      return res.status(404).json({ error: 'No routes found' });
    }

    // Process each route alternative
    const processedRoutes = await Promise.all(
      routeData.routes.map(async (route, index) => {
        const leg = route.legs[0];
        const points = leg.points;
        
        // Calculate ISC for each segment
        const segments = [];
        let totalISC = 0;
        let unsafeSegments = [];

        for (let i = 0; i < points.length - 1; i++) {
          const segment = {
            start: points[i],
            end: points[i + 1],
            center: {
              lat: (points[i].latitude + points[i + 1].latitude) / 2,
              lon: (points[i].longitude + points[i + 1].longitude) / 2
            }
          };

          const iscResult = await calculateISC(segment);
          const segmentISC = iscResult.isc;
          
          segments.push({
            ...segment,
            isc: segmentISC,
            breakdown: iscResult.breakdown
          });

          totalISC += segmentISC;

          // Mark unsafe segments (ISC < 0.5)
          if (segmentISC < 0.5) {
            unsafeSegments.push({
              segment: i,
              isc: segmentISC,
              location: segment.center
            });
          }
        }

        // Average ISC for the route
        const avgISC = totalISC / segments.length;

        // Calculate distance in meters
        const distance = leg.summary.lengthInMeters;

        // Calculate optimal cost
        const optimalCost = calculateOptimalCost(avgISC, distance, safetyWeight);

        return {
          routeIndex: index,
          distance: distance,
          distanceKm: (distance / 1000).toFixed(2),
          duration: leg.summary.travelTimeInSeconds,
          durationMinutes: Math.round(leg.summary.travelTimeInSeconds / 60),
          isc: avgISC,
          safetyScore: (avgISC * 100).toFixed(1),
          optimalCost,
          unsafeSegments,
          segments,
          polyline: route.legs[0].points.map(p => [p.latitude, p.longitude])
        };
      })
    );

    // Sort by optimal cost (lower is better)
    processedRoutes.sort((a, b) => a.optimalCost - b.optimalCost);
    const safestRoute = processedRoutes[0];

    res.json({
      success: true,
      route: {
        polyline: safestRoute.polyline,
        distance: safestRoute.distance,
        distanceKm: safestRoute.distanceKm,
        eta: safestRoute.durationMinutes,
        isc: safestRoute.isc,
        safetyScore: safestRoute.safetyScore,
        unsafeSegments: safestRoute.unsafeSegments,
        segments: safestRoute.segments
      },
      alternatives: processedRoutes.slice(1).map(r => ({
        distanceKm: r.distanceKm,
        eta: r.durationMinutes,
        safetyScore: r.safetyScore
      }))
    });

  } catch (error) {
    console.error('Error finding safest route:', error);
    res.status(500).json({ 
      error: 'Failed to find safest route',
      message: error.message 
    });
  }
}

module.exports = {
  findSafestRoute
};

