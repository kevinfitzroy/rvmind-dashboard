import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ControlItem } from '../../types';
import { 
  Lightbulb, 
  Thermometer, 
  Wifi, 
  Lock, 
  Battery, 
  Droplets,
  ChevronRight 
} from 'lucide-react';

interface ControlCardProps {
  item: ControlItem;
  onlineCount?: number;
  totalCount?: number;
}

const ControlCard: React.FC<ControlCardProps> = ({ item, onlineCount = 0, totalCount = 0 }) => {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (item.icon) {
      case 'Lightbulb':
        return <Lightbulb className="w-6 h-6" />;
      case 'Thermometer':
        return <Thermometer className="w-6 h-6" />;
      case 'Wifi':
        return <Wifi className="w-6 h-6" />;
      case 'Lock':
        return <Lock className="w-6 h-6" />;
      case 'Battery':
        return <Battery className="w-6 h-6" />;
      case 'Droplets':
        return <Droplets className="w-6 h-6" />;
      default:
        return <Lightbulb className="w-6 h-6" />;
    }
  };

  const getStatusColor = () => {
    if (totalCount === 0) return 'bg-gray-100';
    if (onlineCount === totalCount) return 'bg-green-100';
    if (onlineCount === 0) return 'bg-red-100';
    return 'bg-yellow-100';
  };

  const getStatusTextColor = () => {
    if (totalCount === 0) return 'text-gray-600';
    if (onlineCount === totalCount) return 'text-green-600';
    if (onlineCount === 0) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getStatusText = () => {
    if (totalCount === 0) return 'No devices';
    if (onlineCount === totalCount) return 'All online';
    if (onlineCount === 0) return 'All offline';
    return `${onlineCount}/${totalCount} online`;
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px] cursor-pointer"
      onClick={() => navigate(item.route)}
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-blue-100 text-blue-600">
              {getIcon()}
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-800">{item.name}</h3>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
        
        <p className="mt-2 text-sm text-gray-500">{item.description}</p>
        
        {totalCount > 0 && (
          <div className="mt-3 flex items-center">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()} ${getStatusTextColor()}`}>
              <span className={`w-2 h-2 rounded-full mr-1.5 ${onlineCount > 0 ? 'bg-current' : 'bg-gray-400'}`}></span>
              {getStatusText()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlCard;