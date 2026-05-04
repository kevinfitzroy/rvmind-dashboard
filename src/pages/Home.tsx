import React from 'react';
import StatusPanel from '../components/status/StatusPanel';
import ControlGrid from '../components/controls/ControlGrid';
import ThermalCenterBanner from '../components/status/ThermalCenterBanner';

const Home: React.FC = () => {
  return (
    <div className="space-y-6">
      <ThermalCenterBanner />
      <StatusPanel />
      <ControlGrid />
    </div>
  );
}

export default Home;