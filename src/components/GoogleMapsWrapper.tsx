import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

export const getGoogleMapsApiKey = (): string => {
  const key =
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    '';
  return typeof key === 'string' ? key.trim() : '';
};

export const GoogleMapsWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string>(getGoogleMapsApiKey());

  useEffect(() => {
    // Check from server config if not in client env
    if (!apiKey) {
      fetch('/api/config')
        .then((r) => r.json())
        .then((cfg) => {
          if (cfg.googleMapsKey && typeof cfg.googleMapsKey === 'string' && cfg.googleMapsKey.trim()) {
            setApiKey(cfg.googleMapsKey.trim());
          }
        })
        .catch(() => {});
    }
  }, [apiKey]);

  if (!apiKey) {
    // If no Google Maps Platform API key is provided, render children safely without loading unauthenticated Maps script
    return <>{children}</>;
  }

  return (
    <APIProvider apiKey={apiKey} version="weekly" libraries={['places', 'geocoding']}>
      {children}
    </APIProvider>
  );
};
