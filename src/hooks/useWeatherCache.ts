import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

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

interface CachedWeatherData {
  data: WeatherData;
  timestamp: number;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存
const CACHE_KEY = 'weather_cache';

export const useWeatherCache = (apiKey: string, location: string) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  const getCachedData = (): WeatherData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsedCache: CachedWeatherData = JSON.parse(cached);
        const now = Date.now();
        
        // 检查缓存是否还有效
        if (now - parsedCache.timestamp < CACHE_DURATION) {
          return parsedCache.data;
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error);
    }
    return null;
  };

  const setCachedData = (data: WeatherData) => {
    try {
      const cacheData: CachedWeatherData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  };

  const fetchWeather = async (useCache = true) => {
    try {
      // 首先尝试从缓存获取数据
      if (useCache) {
        const cachedData = getCachedData();
        if (cachedData) {
          setWeather(cachedData);
          setError(null);
          setLoading(false);
          return cachedData;
        }
      }

      console.log('Fetching fresh weather data...');
      const response = await axios.get(
        `https://mf6cdmu3ad.re.qweatherapi.com/v7/weather/now?location=${location}&key=${apiKey}`
      );

      if (response.data.code === '200') {
        const data = response.data.now;
        const weatherData: WeatherData = {
          temperature: parseInt(data.temp),
          description: data.text,
          icon: data.icon,
          humidity: parseInt(data.humidity),
          windSpeed: parseFloat(data.windSpeed),
          city: '北京',
          iconCode: data.icon,
          feelsLike: parseInt(data.feelsLike)
        };
        
        setWeather(weatherData);
        setCachedData(weatherData);
        setError(null);
        return weatherData;
      } else {
        setError(`获取天气信息失败: ${response.data.code}`);
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
    return null;
  };

  useEffect(() => {
    // 组件挂载时立即尝试获取缓存数据
    const cachedData = getCachedData();
    if (cachedData) {
      setWeather(cachedData);
      setLoading(false);
      setError(null);
    }

    // 获取最新数据
    fetchWeather(!cachedData); // 如果有缓存就不显示loading

    // 设置定时更新
    intervalRef.current = setInterval(() => {
      fetchWeather(false); // 定时更新时不使用缓存
    }, CACHE_DURATION);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [apiKey, location]);

  const refreshWeather = () => {
    setLoading(true);
    fetchWeather(false);
  };

  return {
    weather,
    loading,
    error,
    refreshWeather
  };
};
