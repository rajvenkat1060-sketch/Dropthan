import React, { useEffect, useState } from 'react';
import { Map, useMapsLibrary } from '@vis.gl/react-google-maps';

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
  title?: string;
  authorName?: string;
  coordinates?: { lat: number; lng: number };
}

export const LocationMapModal: React.FC<LocationMapModalProps> = ({
  isOpen,
  onClose,
  locationName,
  title,
  authorName,
  coordinates: initialCoordinates,
}) => {
  let geocodingLib: any = null;
  try {
    geocodingLib = useMapsLibrary('geocoding');
  } catch (e) {
    geocodingLib = null;
  }

  // Default center (Surat, India or fallback)
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

  if (!isOpen) return null;

  const hasGoogleMaps = Boolean(geocodingLib);
  const mapQuery = encodeURIComponent(formattedAddress || locationName || 'India');

  return (
    <div className="fixed inset-0 z-[160] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-blue-100 flex flex-col max-h-[92vh]">
        {/* HEADER */}
        <div className="bg-[#0d47a1] text-white p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm sm:text-base font-black flex items-center gap-1.5">
              <span>🗺️</span> {title || 'Business Location & Map'}
            </h3>
            {authorName && (
              <p className="text-xs text-blue-100 font-medium">Supplier / Business: {authorName}</p>
            )}
            <p className="text-[11px] text-blue-200 truncate">{formattedAddress || locationName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold cursor-pointer transition"
            title="Close Map"
          >
            ✕
          </button>
        </div>

        {/* MAP CONTAINER */}
        <div className="h-80 sm:h-96 w-full relative bg-slate-100">
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
              title="Interactive Location Map"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.03}%2C${center.lat - 0.03}%2C${center.lng + 0.03}%2C${center.lat + 0.03}&layer=mapnik&marker=${center.lat}%2C${center.lng}`}
              className="w-full h-full border-0"
              loading="lazy"
            />
          )}

          {isGeocoding && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl text-xs font-bold text-[#0d47a1] shadow-md border border-blue-100 flex items-center gap-1.5">
              <span className="animate-spin text-sm">⌛</span>
              <span>Locating on Map...</span>
            </div>
          )}
        </div>

        {/* FOOTER WITH NAVIGATION LINK */}
        <div className="p-3.5 bg-slate-50 flex items-center justify-between border-t border-slate-200 text-xs flex-wrap gap-2">
          <div className="text-slate-600 text-[11px] font-medium">
            GPS Coordinates:{' '}
            <span className="font-mono text-slate-800 font-bold">
              {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-xs active:scale-95"
              title="Start GPS Navigation in Google Maps"
            >
              <span>🚗 Get Directions</span>
              <span>↗</span>
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#0d47a1] hover:bg-blue-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-xs active:scale-95"
              title="Open location in Google Maps App"
            >
              <span>🗺️ Open in Google Maps</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
