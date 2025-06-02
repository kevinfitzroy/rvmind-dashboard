import React, { useState } from 'react';
import { ArrowLeft, Lock, Bell, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SecurityDevice {
  id: string;
  name: string;
  state: boolean;
  type: 'lock' | 'alarm' | 'camera';
}

const SecurityControl: React.FC = () => {
  const [devices, setDevices] = useState<SecurityDevice[]>([
    { id: 'main-door', name: 'Main Door Lock', state: false, type: 'lock' },
    { id: 'storage-lock', name: 'Storage Compartment', state: false, type: 'lock' },
    { id: 'motion-sensor', name: 'Motion Sensor', state: false, type: 'alarm' },
    { id: 'front-camera', name: 'Front Camera', state: false, type: 'camera' },
    { id: 'rear-camera', name: 'Rear Camera', state: false, type: 'camera' },
  ]);

  const toggleDevice = (id: string) => {
    setDevices(devices.map(device => 
      device.id === id ? { ...device, state: !device.state } : device
    ));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lock':
        return <Lock className="w-5 h-5 mr-2 text-blue-600" />;
      case 'alarm':
        return <Bell className="w-5 h-5 mr-2 text-red-600" />;
      case 'camera':
        return <Camera className="w-5 h-5 mr-2 text-green-600" />;
      default:
        return <Lock className="w-5 h-5 mr-2 text-blue-600" />;
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to="/" className="text-blue-600 hover:text-blue-800 flex items-center">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <h2 className="text-2xl font-bold mb-6">Security Control</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map(device => (
          <div 
            key={device.id}
            className="bg-white rounded-lg shadow-md p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getIcon(device.type)}
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

export default SecurityControl;