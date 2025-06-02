export interface Device {
  id: string;
  name: string;
  type: 'ZQWL_RELAY_16' | 'ZQWL_RELAY_8' | 'ZQWL_RELAY_4';
  description: string;
  buttons: Button[];
}

export interface Button {
  id: string;
  name: string;
  description: string;
  relayIndex: number;
  room?: string;
}

export interface Room {
  name: string;
  buttons: {
    buttonId: string;
    deviceId: string;
    name: string;
  }[];
}

export interface RoomsResponse {
  rooms: Room[];
}