import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function Emergency() {
  const { currentUser } = useAuth();
  const [location, setLocation] = useState(null);
  const [trustedContacts, setTrustedContacts] = useState([]);
  const [newContact, setNewContact] = useState({ type: 'email', value: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          setLocation([position.coords.latitude, position.coords.longitude]);
        },
        (err) => console.error('Geolocation error:', err),
        { enableHighAccuracy: true }
      );
    }

    loadTrustedContacts();
  }, [currentUser]);

  const loadTrustedContacts = async () => {
    if (!currentUser || !db) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setTrustedContacts(userDoc.data().trustedContacts || []);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handlePanic = async () => {
    if (!location || !currentUser) {
      alert('Location not available');
      return;
    }

    if (!window.confirm('Are you sure you want to trigger an emergency alert?')) {
      return;
    }

    setLoading(true);

    try {
      await api.post('/api/panic', {
        userId: currentUser.uid,
        location: {
          lat: location[0],
          lon: location[1]
        },
        message: 'Emergency! Need help!'
      });

      alert('Emergency alert sent to your trusted contacts!');
    } catch (error) {
      console.error('Panic error:', error);
      alert('Failed to send emergency alert');
    } finally {
      setLoading(false);
    }
  };

  const addContact = async () => {
    if (!newContact.value || !currentUser) return;

    if (!db) {
      alert('Firebase is not configured. Contacts cannot be saved.');
      return;
    }

    const updatedContacts = [...trustedContacts, newContact];

    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        trustedContacts: updatedContacts
      }, { merge: true });

      setTrustedContacts(updatedContacts);
      setNewContact({ type: 'email', value: '' });
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Failed to add contact');
    }
  };

  const removeContact = async (index) => {
    if (!currentUser) return;

    if (!db) {
      // In demo mode, just update local state
      const updatedContacts = trustedContacts.filter((_, i) => i !== index);
      setTrustedContacts(updatedContacts);
      return;
    }

    const updatedContacts = trustedContacts.filter((_, i) => i !== index);

    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        trustedContacts: updatedContacts
      }, { merge: true });

      setTrustedContacts(updatedContacts);
    } catch (error) {
      console.error('Error removing contact:', error);
      alert('Failed to remove contact');
    }
  };

  const defaultLocation = [40.7128, -74.0060];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Emergency</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">🚨</div>
              <h2 className="text-2xl font-bold text-red-700 mb-4">Panic Button</h2>
              <p className="text-gray-700 mb-6">
                Press this button in an emergency to send your location to trusted contacts
              </p>
              <button
                onClick={handlePanic}
                disabled={loading || !location}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg text-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'SOS'}
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Trusted Contacts</h2>
              
              <div className="space-y-2 mb-4">
                {trustedContacts.length === 0 ? (
                  <p className="text-gray-500 text-sm">No trusted contacts added</p>
                ) : (
                  trustedContacts.map((contact, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{contact.type}:</span> {contact.value}
                      </div>
                      <button
                        onClick={() => removeContact(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex space-x-2 mb-2">
                  <select
                    value={newContact.type}
                    onChange={(e) => setNewContact({ ...newContact, type: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                  <input
                    type="text"
                    value={newContact.value}
                    onChange={(e) => setNewContact({ ...newContact, value: e.target.value })}
                    placeholder={newContact.type === 'email' ? 'email@example.com' : '+1234567890'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={addContact}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '500px' }}>
            {location ? (
              <MapContainer
                center={location}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={location}>
                  <Popup>Your Location</Popup>
                </Marker>
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Getting your location...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

