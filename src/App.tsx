import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import RoomControl from './pages/controls/RoomControl';
import CommunicationStatus from './components/communication/CommunicationStatus';
import BatteryDetailPage from './pages/BatteryDetailPage';
import MainBatteryDetailPage from './pages/MainBatteryDetailPage';
import DieselHeaterPage from './pages/DieselHeaterPage';
import SettingsPage from './pages/SettingsPage';
import LightingLayoutPage from './pages/LightingLayoutPage';
import SpeedControllerPage from './pages/SpeedControllerPage';
import ThermalCenterPage from './pages/ThermalCenterPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/controls/:roomId" element={<RoomControl />} />
          <Route path="/communication-status" element={<CommunicationStatus />} />
          <Route path="/battery/backup" element={<BatteryDetailPage />} />
          <Route path="/battery/main" element={<MainBatteryDetailPage />} />
          <Route path="/settings/diesel-heater" element={<DieselHeaterPage />} />
          <Route path="/lighting" element={<LightingLayoutPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/thermal-center" element={<ThermalCenterPage />} />
          <Route path="/settings/speed-controller" element={<SpeedControllerPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;