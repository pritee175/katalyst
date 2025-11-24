const { reportsCollection } = require('./firebaseService');
const { getTrafficFlow, getTrafficIncidents } = require('./tomtomService');
const { getCurrentWeather, calculateWeatherSafetyFactor } = require('./weatherService');

/**
 * Calculate Incident Safety Coefficient (ISC) for a route segment
 * ISC = Σ wᵢ × Fᵢ
 * 
 * Factors:
 * - lighting (w1 = 0.2)
 * - weather (w2 = 0.2)
 * - crowd (w3 = 0.15)
 * - reports (w4 = 0.3)
 * - traffic (w5 = 0.15)
 */
async function calculateISC(segment, timeOfDay = null) {
  const weights = {
    lighting: 0.2,
    weather: 0.2,
    crowd: 0.15,
    reports: 0.3,
    traffic: 0.15
  };

  // 1. Lighting factor (0-1, where 1 is safest)
  const lightingFactor = calculateLightingFactor(segment, timeOfDay);

  // 2. Weather factor
  const weather = await getCurrentWeather(segment.center.lat, segment.center.lon);
  const weatherFactor = calculateWeatherSafetyFactor(weather);

  // 3. Crowd factor (estimated based on time and area type)
  const crowdFactor = calculateCrowdFactor(segment, timeOfDay);

  // 4. Reports factor (from Firestore)
  const reportsFactor = await calculateReportsFactor(segment);

  // 5. Traffic factor (from TomTom)
  const trafficFactor = await calculateTrafficFactor(segment);

  // Calculate weighted ISC
  const isc = 
    weights.lighting * lightingFactor +
    weights.weather * weatherFactor +
    weights.crowd * crowdFactor +
    weights.reports * reportsFactor +
    weights.traffic * trafficFactor;

  return {
    isc: Math.max(0, Math.min(1, isc)),
    breakdown: {
      lighting: lightingFactor,
      weather: weatherFactor,
      crowd: crowdFactor,
      reports: reportsFactor,
      traffic: trafficFactor
    }
  };
}

/**
 * Calculate lighting factor based on time of day and area type
 */
function calculateLightingFactor(segment, timeOfDay) {
  if (!timeOfDay) {
    const now = new Date();
    timeOfDay = now.getHours();
  }

  // Assume well-lit areas during day (6 AM - 8 PM)
  if (timeOfDay >= 6 && timeOfDay < 20) {
    return 1.0; // Daytime - well lit
  } else if (timeOfDay >= 20 || timeOfDay < 6) {
    // Nighttime - assume residential areas have better lighting
    // This is a simplified model - in production, use actual lighting data
    return 0.6; // Moderate lighting at night
  }
  return 0.7; // Default
}

/**
 * Calculate crowd factor (more people = safer)
 */
function calculateCrowdFactor(segment, timeOfDay) {
  if (!timeOfDay) {
    const now = new Date();
    timeOfDay = now.getHours();
  }

  // Peak hours (7-9 AM, 5-7 PM) have more people
  const isPeakHour = (timeOfDay >= 7 && timeOfDay <= 9) || (timeOfDay >= 17 && timeOfDay <= 19);
  
  // Residential areas might have fewer people at night
  if (timeOfDay >= 22 || timeOfDay < 6) {
    return 0.5; // Low crowd at night
  } else if (isPeakHour) {
    return 0.9; // High crowd during peak hours
  }
  return 0.7; // Moderate crowd
}

/**
 * Calculate reports factor based on recent safety reports
 */
async function calculateReportsFactor(segment) {
  try {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Get reports within 100m of segment center
    const reportsSnapshot = await reportsCollection
      .where('timestamp', '>', thirtyMinutesAgo)
      .get();

    if (reportsSnapshot.empty) {
      return 1.0; // No reports = safe
    }

    let nearbyReports = 0;
    const radius = 0.001; // ~100m in degrees (approximate)

    reportsSnapshot.forEach(doc => {
      const report = doc.data();
      if (report.location) {
        const distance = calculateDistance(
          segment.center.lat,
          segment.center.lon,
          report.location.lat,
          report.location.lon
        );
        if (distance < radius) {
          nearbyReports++;
        }
      }
    });

    // More reports = lower safety factor
    // 0 reports = 1.0, 1 report = 0.7, 2+ reports = 0.4
    if (nearbyReports === 0) return 1.0;
    if (nearbyReports === 1) return 0.7;
    return 0.4;
  } catch (error) {
    console.error('Error calculating reports factor:', error);
    return 0.8; // Default safe if error
  }
}

/**
 * Calculate traffic factor (moderate traffic = safer, too much = dangerous)
 */
async function calculateTrafficFactor(segment) {
  try {
    const bbox = {
      center: segment.center,
      minLat: segment.center.lat - 0.01,
      maxLat: segment.center.lat + 0.01,
      minLon: segment.center.lon - 0.01,
      maxLon: segment.center.lon + 0.01
    };

    const trafficFlow = await getTrafficFlow(bbox);
    if (!trafficFlow || !trafficFlow.flowSegmentData) {
      return 0.7; // Default moderate safety
    }

    const currentSpeed = trafficFlow.flowSegmentData.currentSpeed || 0;
    const freeFlowSpeed = trafficFlow.flowSegmentData.freeFlowSpeed || 50;

    // Moderate traffic (50-80% of free flow) is safest for pedestrians
    const speedRatio = currentSpeed / freeFlowSpeed;
    if (speedRatio > 0.8) {
      return 0.6; // Fast traffic = less safe
    } else if (speedRatio > 0.5) {
      return 0.9; // Moderate traffic = safer
    } else {
      return 0.7; // Slow/heavy traffic = moderate safety
    }
  } catch (error) {
    console.error('Error calculating traffic factor:', error);
    return 0.7; // Default
  }
}

/**
 * Calculate distance between two lat/lon points (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Calculate optimal route cost: α × Safety + (1 − α) × Distance
 */
function calculateOptimalCost(safetyScore, distance, alpha) {
  // Normalize distance (assume max route is 10km = 10000m)
  const normalizedDistance = Math.min(1, distance / 10000);
  
  // Safety score is already 0-1 (ISC)
  // Lower cost is better, so we invert distance
  const cost = alpha * (1 - safetyScore) + (1 - alpha) * normalizedDistance;
  
  return cost;
}

module.exports = {
  calculateISC,
  calculateOptimalCost,
  calculateDistance
};

