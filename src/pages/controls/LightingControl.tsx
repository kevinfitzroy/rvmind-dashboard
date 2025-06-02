import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDeviceState } from '../../services/api';

interface LightSwitch {
  id: string;
  name: string;
  state: boolean;
  relayIndex: number;
}

const LightingControl: React.FC = () => {
  const [switches, setSwitches] = useState<LightSwitch[]>([
    { id: 'living-main', name: 'Living Room Main', state: false, relayIndex: 0 },
    { id: 'living-ambient', name: 'Living Room Ambient', state: false, relayIndex: 1 },
    { id: 'bedroom-main', name: 'Bedroom Main', state: false, relayIndex: 2 },
    { id: 'bedroom-reading', name: 'Bedroom Reading', state: false, relayIndex: 3 }
  ]);

  useEffect(() => {
    const updateStates = async () => {
      try {
        const states = await getDeviceState('outdoor_light');
        setSwitches(prev => prev.map(sw => ({
          ...sw,
          state: states[sw.relayIndex] === 1
        })));
      } catch (error) {
        console.error('Failed to fetch device states:', error);
      }
    };

    // Initial fetch
    updateStates();

    // Set up polling interval
    const intervalId = setInterval(updateStates, 2000);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, []);

  const toggleSwitch = (id: string) => {
    setSwitches(switches.map(sw => 
      sw.id === id ? { ...sw, state: !sw.state } : sw
    ));
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to="/" className="text-blue-600 hover:text-blue-800 flex items-center">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <h2 className="text-2xl font-bold mb-6">Lighting Control</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {switches.map(sw => (
          <div 
            key={sw.id}
            className="bg-white rounded-lg shadow-md p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">{sw.name}</span>
              <button
                onClick={() => toggleSwitch(sw.id)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  sw.state ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 ${
                    sw.state ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LightingControl;