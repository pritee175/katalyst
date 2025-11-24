const axios = require('axios');

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const BASE_URL = 'https://api.tomtom.com';

/**
 * Get route from TomTom Routing API
 */
async function getRoute(origin, destination, options = {}) {
  try {
    const { lat: originLat, lon: originLon } = origin;
    const { lat: destLat, lon: destLon } = destination;
    
    const url = `${BASE_URL}/routing/1/calculateRoute/${originLat},${originLon}:${destLat},${destLon}/json`;
    
    const params = {
      key: TOMTOM_API_KEY,
      instructionsType: 'text',
      routeType: 'pedestrian',
      traffic: true,
      ...options
    };

    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    console.error('TomTom Routing API error:', error.message);
    throw new Error('Failed to fetch route from TomTom');
  }
}

/**
 * Get multiple route alternatives
 */
async function getRouteAlternatives(origin, destination, maxAlternatives = 3) {
  try {
    const { lat: originLat, lon: originLon } = origin;
    const { lat: destLat, lon: destLon } = destination;
    
    const url = `${BASE_URL}/routing/1/calculateRoute/${originLat},${originLon}:${destLat},${destLon}/json`;
    
    const params = {
      key: TOMTOM_API_KEY,
      instructionsType: 'text',
      routeType: 'pedestrian',
      traffic: true,
      maxAlternatives: maxAlternatives
    };

    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    console.error('TomTom Routing API error:', error.message);
    throw new Error('Failed to fetch route alternatives from TomTom');
  }
}

/**
 * Get traffic flow data for a bounding box
 */
async function getTrafficFlow(bbox) {
  try {
    const url = `${BASE_URL}/traffic/services/4/flowSegmentData/absolute/10/json`;
    
    const params = {
      key: TOMTOM_API_KEY,
      point: `${bbox.center.lat},${bbox.center.lon}`,
      unit: 'KMPH'
    };

    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    console.error('TomTom Traffic API error:', error.message);
    return null; // Return null if traffic data unavailable
  }
}

/**
 * Get traffic incidents in an area
 */
async function getTrafficIncidents(bbox) {
  try {
    const url = `${BASE_URL}/traffic/services/4/incidentDetails`;
    
    const params = {
      key: TOMTOM_API_KEY,
      bbox: `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`,
      fields: '{incidents{type,geometry,properties{iconCategory,severity}}}'
    };

    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    console.error('TomTom Traffic Incidents API error:', error.message);
    return null;
  }
}

module.exports = {
  getRoute,
  getRouteAlternatives,
  getTrafficFlow,
  getTrafficIncidents
};

