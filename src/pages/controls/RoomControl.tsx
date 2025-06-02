import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { RoomInfo } from '../../services/api';
import { getRoomsSync, getRooms, toggleButton, subscribeToDeviceStatusChanges, getAllButtonStates, forceRefreshButtonDeviceStatus } from '../../services/api';

interface RoomWithDeviceStatus extends RoomInfo {
  buttons: Array<{
    buttonId: string;
    deviceId: string;
    name: string;
    isOnline: boolean;
  }>;
}

const RoomControl: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<RoomWithDeviceStatus | null>(null);
  const [buttonStates, setButtonStates] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [buttonLoadingStates, setButtonLoadingStates] = useState<Record<string, boolean>>({});
  const [pendingStates, setPendingStates] = useState<Record<string, { targetState: boolean; timestamp: number }>>({});

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const roomDataRef = useRef<RoomInfo | null>(null);

  const pendingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const BUTTON_DELAY_MS = 1000; // 减少到1秒延迟

  useEffect(() => {
    const fetchRoom = async () => {
      console.log('Fetching room for roomId:', roomId);

      try {
        setLoading(true);
        setError(null);

        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        const decodedRoomId = decodeURIComponent(roomId || '');
        console.log('Looking for room:', decodedRoomId);

        let roomsData: RoomInfo[] = [];
        const cachedRooms = getRoomsSync();

        if (cachedRooms) {
          console.log('Using cached room configuration');
          roomsData = cachedRooms.rooms;
        } else {
          console.log('Loading room configuration...');
          const response = await getRooms();
          roomsData = response.rooms || [];
        }

        console.log('Available rooms:', roomsData.map(r => r.name));
        const foundRoom = roomsData.find(r => r.name === decodedRoomId);

        if (!foundRoom) {
          setError(`Room "${decodedRoomId}" not found`);
          setLoading(false);
          return;
        }

        console.log('Found room:', foundRoom);
        roomDataRef.current = foundRoom;

        const initialRoom: RoomWithDeviceStatus = {
          ...foundRoom,
          buttons: foundRoom.buttons.map(button => ({
            ...button,
            isOnline: false
          }))
        };

        setRoom(initialRoom);

        const initialStates: Record<string, boolean> = {};
        foundRoom.buttons.forEach(button => {
          initialStates[button.buttonId] = false;
        });
        setButtonStates(initialStates);

        setLoading(false);

        const updateRoomWithButtonStatus = () => {
          if (!roomDataRef.current) return;

          const allButtonStates = getAllButtonStates();
          console.log('Updating button status:', allButtonStates);

          const roomWithStatus: RoomWithDeviceStatus = {
            ...roomDataRef.current,
            buttons: roomDataRef.current.buttons.map(button => ({
              ...button,
              isOnline: allButtonStates[button.buttonId]?.isOnline || false
            }))
          };

          setRoom(roomWithStatus);

          setButtonStates(prevStates => {
            const newStates: Record<string, boolean> = { ...prevStates };

            roomDataRef.current!.buttons.forEach(button => {
              const buttonStatus = allButtonStates[button.buttonId];
              const newState = buttonStatus?.state || false;

              setPendingStates(currentPending => {
                const pendingState = currentPending[button.buttonId];

                if (!pendingState) {
                  newStates[button.buttonId] = newState;
                } else {
                  if (newState === pendingState.targetState) {
                    console.log(`Button ${button.buttonId} reached target state early, applying immediately`);
                    newStates[button.buttonId] = newState;

                    setButtonLoadingStates(prev => ({
                      ...prev,
                      [button.buttonId]: false
                    }));

                    const timeoutId = pendingTimeoutsRef.current.get(button.buttonId);
                    if (timeoutId) {
                      clearTimeout(timeoutId);
                      pendingTimeoutsRef.current.delete(button.buttonId);
                    }

                    const { [button.buttonId]: removed, ...rest } = currentPending;
                    return rest;
                  }
                }

                return currentPending;
              });
            });

            return newStates;
          });
        };

        updateRoomWithButtonStatus();

        unsubscribeRef.current = subscribeToDeviceStatusChanges(() => {
          console.log('Device status changed, updating room');
          updateRoomWithButtonStatus();
        });

      } catch (error) {
        console.error('Error fetching room:', error);
        setError('Failed to load room data');
        setLoading(false);
      }
    };

    if (roomId) {
      fetchRoom();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      pendingTimeoutsRef.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      pendingTimeoutsRef.current.clear();
    };
  }, [roomId]);

  const handleToggle = async (buttonId: string, isOnline: boolean) => {
    if (!isOnline) {
      console.warn('Cannot toggle offline device');
      return;
    }

    if (buttonLoadingStates[buttonId]) {
      return;
    }

    try {
      const currentState = buttonStates[buttonId];
      const newState = !currentState;

      console.log(`Button ${buttonId} toggle initiated: ${currentState} -> ${newState}`);

      setButtonLoadingStates(prev => ({
        ...prev,
        [buttonId]: true
      }));

      setPendingStates(prev => ({
        ...prev,
        [buttonId]: { targetState: newState, timestamp: Date.now() }
      }));

      const existingTimeout = pendingTimeoutsRef.current.get(buttonId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      await toggleButton(buttonId, newState);
      console.log(`Button ${buttonId} API call completed: ${newState}`);

      forceRefreshButtonDeviceStatus(buttonId);

      const timeoutId = setTimeout(() => {
        console.log(`Delayed state change timeout for button ${buttonId}`);

        setButtonLoadingStates(prev => ({
          ...prev,
          [buttonId]: false
        }));

        setPendingStates(current => {
          const pending = current[buttonId];
          if (pending && pending.targetState === newState) {
            setButtonStates(prevStates => {
              if (prevStates[buttonId] !== newState) {
                console.log(`Force applying state change for button ${buttonId}: ${newState}`);
                return {
                  ...prevStates,
                  [buttonId]: newState
                };
              }
              return prevStates;
            });
          }

          const { [buttonId]: removed, ...rest } = current;
          return rest;
        });

        pendingTimeoutsRef.current.delete(buttonId);

      }, BUTTON_DELAY_MS);

      pendingTimeoutsRef.current.set(buttonId, timeoutId);

    } catch (error) {
      console.error('Error toggling button:', error);

      setButtonLoadingStates(prev => ({
        ...prev,
        [buttonId]: false
      }));

      setPendingStates(prev => {
        const { [buttonId]: removed, ...rest } = prev;
        return rest;
      });

      const timeoutId = pendingTimeoutsRef.current.get(buttonId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        pendingTimeoutsRef.current.delete(buttonId);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-4">
        <div className="text-red-600">Room not found</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to="/" className="text-blue-600 hover:text-blue-800 flex items-center">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <h2 className="text-2xl font-bold mb-6">{room.name}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {room.buttons.map(button => {
          const isLoading = buttonLoadingStates[button.buttonId];
          const pendingState = pendingStates[button.buttonId];
          const currentState = buttonStates[button.buttonId];

          return (
            <div 
              key={button.buttonId}
              className={`bg-white rounded-lg shadow-md p-4 ${!button.isOnline ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-medium">{button.name}</span>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    button.isOnline ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                      button.isOnline ? 'bg-green-600' : 'bg-red-600'
                    }`}></span>
                    {button.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Device: {button.deviceId}</span>
                <div className="flex items-center space-x-2">
                  {isLoading && (
                    <div className="flex items-center text-xs text-blue-600">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      <span>Switching...</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleToggle(button.buttonId, button.isOnline)}
                    disabled={!button.isOnline || isLoading}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      !button.isOnline 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : isLoading
                          ? 'bg-blue-400 cursor-wait'
                          : currentState 
                            ? 'bg-blue-600' 
                            : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 flex items-center justify-center ${
                        currentState ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    >
                      {isLoading && (
                        <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {pendingState && (
                <div className="mt-2 text-xs text-gray-500">
                  Will switch to {pendingState.targetState ? 'ON' : 'OFF'} in {Math.ceil((BUTTON_DELAY_MS - (Date.now() - pendingState.timestamp)) / 1000)}s
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoomControl;