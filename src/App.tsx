import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import RoomControl from './pages/controls/RoomControl';
import CommunicationStatus from './components/communication/CommunicationStatus';
import BatteryDetailPage from './pages/BatteryDetailPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/controls/:roomId" element={<RoomControl />} />
          <Route path="/communication-status" element={<CommunicationStatus />} />
          <Route path="/battery/backup" element={<BatteryDetailPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;