import React, { useState } from 'react';
import { ArrowLeft, Battery, Plug, Power } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PowerDevice {
  id: string;
  name: string;
  state: boolean;
  type: 'inverter' | 'charger' | 'outlet';
}

const PowerControl: React.FC = () => {
  const [devices, setDevices] = useState<PowerDevice[]>([
    { id: 'main-inverter', name: 'Main Inverter', state: false, type: 'inverter' },
    { id: 'battery-charger', name: 'Battery Charger', state: false, type: 'charger' },
    { id: 'solar-charger', name: 'Solar Charger', state: false, type: 'charger' },
    { id: 'ac-outlet-1', name: 'AC Outlet 1', state: false, type: 'outlet' },
    { id: 'ac-outlet-2', name: 'AC Outlet 2', state: false, type: 'outlet' },
    { id: 'ac-outlet-3', name: 'AC Outlet 3', state: false, type: 'outlet' },
  ]);

  const toggleDevice = (id: string) => {
    setDevices(devices.map(device => 
      device.id === id ? { ...device, state: !device.state } : device
    ));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'inverter':
        return <Power className="w-5 h-5 mr-2 text-purple-600" />;
      case 'charger':
        return <Battery className="w-5 h-5 mr-2 text-green-600" />;
      case 'outlet':
        return <Plug className="w-5 h-5 mr-2 text-blue-600" />;
      default:
        return <Power className="w-5 h-5 mr-2 text-purple-600" />;
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

      <h2 className="text-2xl font-bold mb-6">Power Control</h2>

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

export default PowerControl;