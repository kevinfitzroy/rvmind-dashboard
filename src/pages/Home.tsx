import React from 'react';
import StatusPanel from '../components/status/StatusPanel';
import ControlGrid from '../components/controls/ControlGrid';
import DieselHeaterBanner from '../components/status/DieselHeaterBanner';

const Home: React.FC = () => {
  return (
    <div className="space-y-6">
      <DieselHeaterBanner />
      <StatusPanel />
      <ControlGrid />
    </div>
  );
}

export default Home;