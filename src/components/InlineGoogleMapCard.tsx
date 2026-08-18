import React, { useEffect, useState } from 'react';
import { Map, useMapsLibrary } from '@vis.gl/react-google-maps';

interface InlineGoogleMapCardProps {
  locationName: string;
  storeName?: string;
  coordinates?: { lat: number; lng: number };
  className?: string;
}

export const InlineGoogleMapCard: React.FC<InlineGoogleMapCardProps> = ({
  locationName,
  storeName = 'Store Location',
  coordinates: initialCoordinates,
  className = '',
}) => {
  let geocodingLib: any = null;
  try {
    geocodingLib = useMapsLibrary('geocoding');
  } catch (e) {
    geocodingLib = null;
  }

  // Default center (Surat, Gujarat, India)
  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    initialCoordinates?.lat && initialCoordinates?.lng
      ? initialCoordinates
      : { lat: 21.1702, lng: 72.8311 }
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [formattedAddress, setFormattedAddress] = useState(locationName);

  useEffect(() => {
    if (initialCoordinates?.lat && initialCoordinates?.lng) {
      setCenter(initialCoordinates);
      return;
    }

    if (!locationName) return;

    if (geocodingLib) {
      try {
        setIsGeocoding(true);
        const geocoder = new geocodingLib.Geocoder();
        geocoder.geocode({ address: locationName }, (results: any, status: string) => {
          setIsGeocoding(false);
          if (status === 'OK' && results && results[0]?.geometry?.location) {
            const loc = results[0].geometry.location;
            setCenter({ lat: loc.lat(), lng: loc.lng() });
            if (results[0].formatted_address) {
              setFormattedAddress(results[0].formatted_address);
            }
          }
        });
      } catch (e) {
        setIsGeocoding(false);
      }
    }
  }, [geocodingLib, locationName, initialCoordinates]);

  const hasGoogleMaps = Boolean(geocodingLib);
  const mapQuery = encodeURIComponent(formattedAddress || locationName || 'Surat, Gujarat');

  return (
    <div className={`bg-white rounded-2xl overflow-hidden border border-blue-100 shadow-sm ${className}`}>
      {/* MAP HEADER BAR */}
      <div className="bg-slate-900 text-white px-3.5 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold truncate">
          <span>🗺️</span>
          <span className="truncate">{storeName}</span>
        </div>
        <span className="text-[10px] bg-blue-600/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-mono font-medium">
          Verified Location
        </span>
      </div>

      {/* MAP CANVAS */}
      <div className="h-48 w-full relative bg-slate-100">
        {hasGoogleMaps ? (
          <Map
            defaultCenter={center}
            center={center}
            defaultZoom={13}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <iframe
            title="Store Location Map"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.02}%2C${center.lat - 0.02}%2C${center.lng + 0.02}%2C${center.lat + 0.02}&layer=mapnik&marker=${center.lat}%2C${center.lng}`}
            className="w-full h-full border-0"
            loading="lazy"
          />
        )}

        {isGeocoding && (
          <div className="absolute top-2 left-2 bg-white/95 backdrop-blur px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#0d47a1] shadow border border-blue-100 flex items-center gap-1">
            <span className="animate-spin">⌛</span>
            <span>Locating...</span>
          </div>
        )}
      </div>

      {/* ADDRESS & NAVIGATION BAR */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
        <div className="text-slate-700 font-medium truncate flex items-center gap-1">
          <span className="text-blue-700">📍</span>
          <span className="truncate">{formattedAddress || locationName}</span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
          <span className="text-[10px] text-slate-500 font-mono">
            GPS: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </span>

          <div className="flex items-center gap-1.5">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition flex items-center gap-1 active:scale-95"
            >
              <span>🚗 Get Directions</span>
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#0d47a1] hover:bg-blue-800 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition flex items-center gap-1 active:scale-95"
            >
              <span>↗ Google Maps</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
