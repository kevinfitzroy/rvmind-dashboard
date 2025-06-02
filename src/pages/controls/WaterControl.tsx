import React, { useState } from 'react';
import { ArrowLeft, Droplets, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WaterDevice {
  id: string;
  name: string;
  state: boolean;
  type: 'pump' | 'heater' | 'valve';
}

const WaterControl: React.FC = () => {
  const [devices, setDevices] = useState<WaterDevice[]>([
    { id: 'main-pump', name: 'Main Water Pump', state: false, type: 'pump' },
    { id: 'water-heater', name: 'Water Heater', state: false, type: 'heater' },
    { id: 'tank-fill', name: 'Tank Fill Valve', state: false, type: 'valve' },
    { id: 'tank-drain', name: 'Tank Drain Valve', state: false, type: 'valve' },
    { id: 'grey-drain', name: 'Grey Water Drain', state: false, type: 'valve' },
    { id: 'black-drain', name: 'Black Water Drain', state: false, type: 'valve' },
  ]);

  const toggleDevice = (id: string) => {
    setDevices(devices.map(device => 
      device.id === id ? { ...device, state: !device.state } : device
    ));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'heater':
        return <Flame className="w-5 h-5 mr-2 text-red-600" />;
      default:
        return <Droplets className="w-5 h-5 mr-2 text-blue-600" />;
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

      <h2 className="text-2xl font-bold mb-6">Water Control</h2>

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

export default WaterControl;