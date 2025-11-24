import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function HeatmapLayer({ reports }) {
  const map = useMap();

  useEffect(() => {
    if (reports.length === 0) return;

    // Create heatmap circles for each report
    reports.forEach((report) => {
      if (report.location) {
        const circle = L.circleMarker([report.location.lat, report.location.lon], {
          radius: 15,
          fillColor: '#ef4444',
          color: '#dc2626',
          weight: 2,
          opacity: 0.7,
          fillOpacity: 0.6
        }).addTo(map);

        circle.bindPopup(`
          <strong>${report.type}</strong><br/>
          ${report.description || 'No description'}<br/>
          <small>${new Date(report.timestamp).toLocaleString()}</small>
        `);
      }
    });
  }, [reports, map]);

  return null;
}

export default function Reports() {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'incident',
    description: '',
    location: null
  });
  const [currentLocation, setCurrentLocation] = useState([40.7128, -74.0060]);

  useEffect(() => {
    fetchReports();
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation([position.coords.latitude, position.coords.longitude]);
          setFormData(prev => ({
            ...prev,
            location: {
              lat: position.coords.latitude,
              lon: position.coords.longitude
            }
          }));
        },
        (err) => console.error('Geolocation error:', err)
      );
    }
  }, []);

  const fetchReports = async () => {
    try {
      const response = await api.get('/api/report');
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/api/report', {
        ...formData,
        userId: currentUser?.uid || 'anonymous'
      });
      
      setFormData({
        type: 'incident',
        description: '',
        location: formData.location // Keep current location
      });
      
      fetchReports();
      alert('Report submitted successfully!');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Safety Reports</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Submit a Report</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="incident">Incident</option>
                  <option value="hazard">Hazard</option>
                  <option value="suspicious">Suspicious Activity</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe what you observed..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                {formData.location ? (
                  <div className="text-sm text-gray-600">
                    {formData.location.lat.toFixed(6)}, {formData.location.lon.toFixed(6)}
                    <br />
                    <small>Using your current location</small>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Getting your location...</div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !formData.location}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '500px' }}>
            <MapContainer
              center={currentLocation}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <HeatmapLayer reports={reports} />
            </MapContainer>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Recent Reports ({reports.length})</h2>
          <div className="space-y-2">
            {reports.length === 0 ? (
              <p className="text-gray-500">No recent reports</p>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="border-b border-gray-200 pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-gray-900">{report.type}</span>
                      {report.description && (
                        <p className="text-sm text-gray-600">{report.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(report.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

