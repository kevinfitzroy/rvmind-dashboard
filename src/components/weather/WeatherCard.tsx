import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getWeatherEmoji } from '../../constants/weatherIcons';

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  city: string;
  iconCode: string;
  feelsLike: number;
}

const WeatherCard: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_KEY = import.meta.env.VITE_QWEATHER_API_KEY || 'your-qweather-api-key-here';
  const LOCATION = '101010100'; // 北京的位置ID

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        console.log('Fetching weather data...', API_KEY);
        const response = await axios.get(
          `https://mf6cdmu3ad.re.qweatherapi.com/v7/weather/now?location=${LOCATION}&key=${API_KEY}`
        );

        console.log('Weather API Response:', response.data);

        if (response.data.code === '200') {
          const data = response.data.now;
          const weatherData = {
            temperature: parseInt(data.temp),
            description: data.text,
            icon: data.icon,
            humidity: parseInt(data.humidity),
            windSpeed: parseFloat(data.windSpeed),
            city: '北京',
            iconCode: data.icon,
            feelsLike: parseInt(data.feelsLike)
          };
          
          console.log('Setting weather data:', weatherData);
          setWeather(weatherData);
          setError(null);
        } else {
          console.error('API Error:', response.data);
          setError(`获取天气信息失败: ${response.data.code}`);
        }
      } catch (err) {
        console.error('Network Error:', err);
        setError('网络请求失败');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, [API_KEY]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 w-full">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 w-full">
        <div className="text-red-500 text-center">{error}</div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg shadow-lg p-6 w-full border border-blue-100 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-800 truncate">{weather.city}</h3>
          <p className="text-sm text-gray-600">实时天气</p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <span className="text-4xl">{getWeatherEmoji(weather.iconCode)}</span>
        </div>
      </div>
      
      <div className="mb-4 flex-1">
        <div className="text-3xl font-bold text-gray-800 mb-1">
          {weather.temperature}°C
        </div>
        <div className="text-gray-600">{weather.description}</div>
        <div className="text-sm text-gray-500 mt-1">
          体感温度 {weather.feelsLike}°C
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm bg-white/50 rounded-lg p-3 mt-auto">
        <div className="flex justify-between">
          <span className="text-gray-600">💧 湿度:</span>
          <span className="font-medium">{weather.humidity}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">💨 风速:</span>
          <span className="font-medium">{weather.windSpeed} km/h</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;
