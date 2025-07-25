import React, { useState } from 'react';
import { ArrowLeft, Wifi, Signal } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ConnectivityDevice {
  id: string;
  name: string;
  state: boolean;
  type: 'wifi' | 'cellular';
}

const ConnectivityControl: React.FC = () => {
  const [devices, setDevices] = useState<ConnectivityDevice[]>([
    { id: 'main-wifi', name: 'Main WiFi Router', state: false, type: 'wifi' },
    { id: 'wifi-extender', name: 'WiFi Extender', state: false, type: 'wifi' },
    { id: '4g-modem', name: '4G Modem', state: false, type: 'cellular' },
    { id: 'starlink', name: 'Starlink', state: false, type: 'wifi' },
  ]);

  const toggleDevice = (id: string) => {
    setDevices(devices.map(device => 
      device.id === id ? { ...device, state: !device.state } : device
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

      <h2 className="text-2xl font-bold mb-6">Connectivity Control</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map(device => (
          <div 
            key={device.id}
            className="bg-white rounded-lg shadow-md p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {device.type === 'wifi' ? (
                  <Wifi className="w-5 h-5 mr-2 text-blue-600" />
                ) : (
                  <Signal className="w-5 h-5 mr-2 text-green-600" />
                )}
                <span className="text-lg font-medium">{device.name}</span>
              </div>
              <button
                onClick={() => toggleDevice(device.id)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  device.state ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 ${
                    device.state ? 'translate-x-7' : 'translate-x-1'
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

export default ConnectivityControl;