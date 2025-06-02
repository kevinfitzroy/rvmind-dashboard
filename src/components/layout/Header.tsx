import React, { useState } from 'react';
import { Menu, X, Radio, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold">RV Command Center</h1>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-blue-700 transition-colors"
              aria-label="Dashboard"
            >
              <Home className="w-5 h-5" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
            
            <button 
              onClick={() => navigate('/communication-status')}
              className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-blue-700 transition-colors"
              aria-label="Communication Status"
            >
              <Radio className="w-5 h-5" />
              <span className="text-sm font-medium">Modbus</span>
            </button>
            
            <nav>
              <ul className="flex space-x-4">
                <li><a href="#" className="hover:text-blue-200 transition-colors">Settings</a></li>
                <li><a href="#" className="hover:text-blue-200 transition-colors">Help</a></li>
              </ul>
            </nav>
          </div>
          
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => navigate('/communication-status')}
              className="p-2 mr-2 rounded-full hover:bg-blue-700 transition-colors"
              aria-label="Communication Status"
            >
              <Radio className="w-5 h-5" />
            </button>
            
            <button
              onClick={toggleMenu}
              className="p-2 rounded-md hover:bg-blue-700 transition-colors"
              aria-expanded={isMenuOpen}
              aria-label="Main menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu, show/hide based on menu state */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <button 
              onClick={() => {navigate('/'); setIsMenuOpen(false);}}
              className="flex items-center space-x-2 w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 hover:text-white"
            >
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <a href="#" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 hover:text-white">Settings</a>
            <a href="#" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 hover:text-white">Help</a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;