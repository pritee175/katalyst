# SafeWalk Backend API

Node.js + Express.js backend for SafeWalk Route Safety Companion.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file (see `.env.example` for template)

3. Start server:
   ```bash
   npm run dev  # Development with nodemon
   # or
   npm start    # Production
   ```

## API Documentation

### POST /api/route/safest
Find the safest route between two points.

**Request:**
```json
{
  "origin": { "lat": 40.7128, "lon": -74.0060 },
  "destination": { "lat": 40.7589, "lon": -73.9851 },
  "alpha": 0.7
}
```

**Response:**
```json
{
  "success": true,
  "route": {
    "polyline": [[lat, lon], ...],
    "distance": 5000,
    "distanceKm": "5.00",
    "eta": 10,
    "isc": 0.75,
    "safetyScore": "75.0",
    "unsafeSegments": [...],
    "segments": [...]
  }
}
```

### POST /api/report
Create a safety report.

**Request:**
```json
{
  "type": "incident",
  "location": { "lat": 40.7128, "lon": -74.0060 },
  "description": "Suspicious activity",
  "userId": "user123"
}
```

### GET /api/report
Get all active reports (not expired).

### POST /api/panic
Trigger emergency alert.

**Request:**
```json
{
  "userId": "user123",
  "location": { "lat": 40.7128, "lon": -74.0060 },
  "message": "Emergency! Need help!"
}
```

### GET /api/zone-status
Get zone safety level.

**Query Params:**
- `lat` - Latitude
- `lon` - Longitude

**Response:**
```json
{
  "success": true,
  "location": { "lat": 40.7128, "lon": -74.0060 },
  "isc": "0.750",
  "status": "green",
  "breakdown": {
    "lighting": 1.0,
    "weather": 0.8,
    "crowd": 0.7,
    "reports": 1.0,
    "traffic": 0.9
  }
}
```

