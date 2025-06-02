import React, { useEffect, useState } from 'react';
import ControlCard from './ControlCard';
import { RoomInfo } from '../../services/api';
import { getRoomsSync, getRooms, subscribeToDeviceStatusChanges, getAllButtonStates } from '../../services/api';

interface RoomWithDeviceStatus extends RoomInfo {
  buttons: Array<{
    buttonId: string;
    deviceId: string;
    name: string;
    isOnline: boolean;
  }>;
}

const ControlGrid: React.FC = () => {
  const [rooms, setRooms] = useState<RoomWithDeviceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateRoomsWithDeviceStatus = (roomsData: RoomInfo[]) => {
    const allButtonStates = getAllButtonStates();
    console.log('ControlGrid - Button status:', allButtonStates);
    
    const roomsWithStatus: RoomWithDeviceStatus[] = roomsData.map(room => ({
      ...room,
      buttons: room.buttons.map(button => ({
        ...button,
        isOnline: allButtonStates[button.buttonId]?.isOnline || false
      }))
    }));

    setRooms(roomsWithStatus);
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        // 首先尝试从同步缓存获取
        const cachedRooms = getRoomsSync();
        
        if (cachedRooms) {
          // 配置已缓存，立即显示
          console.log('Using cached room configuration');
          updateRoomsWithDeviceStatus(cachedRooms.rooms);
          setLoading(false);
          
          // 订阅设备状态变化
          const unsubscribe = subscribeToDeviceStatusChanges(() => {
            updateRoomsWithDeviceStatus(cachedRooms.rooms);
          });
          
          return unsubscribe;
        } else {
          // 配置未缓存，需要等待加载
          console.log('Loading room configuration...');
          const roomsResponse = await getRooms();
          
          if (!roomsResponse || !roomsResponse.rooms) {
            setError('Invalid response format');
            console.error('Invalid response structure:', roomsResponse);
            return;
          }

          updateRoomsWithDeviceStatus(roomsResponse.rooms);
          
          // 订阅设备状态变化
          const unsubscribe = subscribeToDeviceStatusChanges(() => {
            updateRoomsWithDeviceStatus(roomsResponse.rooms);
          });

          return unsubscribe;
        }
      } catch (err) {
        setError('Failed to load rooms');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-white p-4 rounded-lg shadow">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-20 bg-gray-200 rounded col-span-1"></div>
                <div className="h-20 bg-gray-200 rounded col-span-1"></div>
                <div className="h-20 bg-gray-200 rounded col-span-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-white p-4 rounded-lg shadow">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Controls</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map(room => {
          const onlineDeviceCount = room.buttons.filter(button => button.isOnline).length;
          const totalDeviceCount = room.buttons.length;
          
          return (
            <ControlCard
              key={room.name}
              item={{
                id: room.name,
                name: room.name,
                description: `${totalDeviceCount} device${totalDeviceCount !== 1 ? 's' : ''} in ${room.name}`,
                route: `/controls/${encodeURIComponent(room.name)}`,
                icon: 'Lightbulb'
              }}
              onlineCount={onlineDeviceCount}
              totalCount={totalDeviceCount}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ControlGrid;