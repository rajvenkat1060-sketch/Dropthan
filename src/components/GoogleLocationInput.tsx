import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

interface GoogleLocationInputProps {
  value: string;
  onChange: (value: string, details?: { lat?: number; lng?: number; formattedAddress?: string }) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const GoogleLocationInput: React.FC<GoogleLocationInputProps> = ({
  value,
  onChange,
  placeholder = 'Search location, city, or address...',
  className = 'w-full bg-white border border-blue-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]',
  required = false,
}) => {
  let placesLib: any = null;
  let geocodingLib: any = null;
  try {
    placesLib = useMapsLibrary('places');
    geocodingLib = useMapsLibrary('geocoding');
  } catch (e) {
    placesLib = null;
    geocodingLib = null;
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    try {
      const autocomplete = new placesLib.Autocomplete(inputRef.current, {
        fields: ['formatted_address', 'geometry', 'name', 'place_id'],
      });

      const listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place) {
          const formatted = place.formatted_address || place.name || '';
          let lat: number | undefined;
          let lng: number | undefined;
          if (place.geometry?.location) {
            lat = place.geometry.location.lat();
            lng = place.geometry.location.lng();
          }
          if (formatted) {
            onChange(formatted, { lat, lng, formattedAddress: formatted });
          }
        }
      });

      autocompleteRef.current = autocomplete;

      return () => {
        if (listener && (window as any).google?.maps?.event) {
          (window as any).google.maps.event.removeListener(listener);
        }
      };
    } catch (e) {
      console.warn('Places Autocomplete initialization notice:', e);
    }
  }, [placesLib]);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (geocodingLib) {
          try {
            const geocoder = new geocodingLib.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
              setIsLocating(false);
              if (status === 'OK' && results && results[0]) {
                const address = results[0].formatted_address;
                onChange(address, { lat, lng, formattedAddress: address });
              } else {
                fallbackReverseGeocode(lat, lng);
              }
            });
            return;
          } catch (e) {
            // fallback
          }
        }

        fallbackReverseGeocode(lat, lng);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation notice:', err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const fallbackReverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
        { headers: { 'User-Agent': 'Dropthan-B2B-App' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const shortAddress = data.display_name.split(',').slice(0, 4).join(',').trim();
          onChange(shortAddress, { lat, lng, formattedAddress: data.display_name });
          setIsLocating(false);
          return;
        }
      }
    } catch (e) {
      /* ignore */
    }

    const fallback = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    onChange(fallback, { lat, lng });
    setIsLocating(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={isLocating}
          title="Detect Current Location via GPS"
          className="absolute right-2 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border border-blue-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition active:scale-95"
        >
          {isLocating ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <span>📍 Pin GPS</span>
          )}
        </button>
      </div>
    </div>
  );
};
