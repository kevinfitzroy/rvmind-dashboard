import React from 'react';
import StatusPanel from '../components/status/StatusPanel';
import ControlGrid from '../components/controls/ControlGrid';

const Home: React.FC = () => {
  return (
    <div className="space-y-6">
      <StatusPanel />
      <ControlGrid />
    </div>
  );
}

export default Home;