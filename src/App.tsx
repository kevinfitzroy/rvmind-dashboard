import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import RoomControl from './pages/controls/RoomControl';
import CommunicationStatus from './components/communication/CommunicationStatus';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/controls/:roomId" element={<RoomControl />} />
          <Route path="/communication-status" element={<CommunicationStatus />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;