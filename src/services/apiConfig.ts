import axios from 'axios';
const SERVER_ADDRESS = "https://192.168.8.112:3000"
const api = axios.create({
  baseURL: `${SERVER_ADDRESS}/v1`,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  }
});

export {
    SERVER_ADDRESS,
    api
}