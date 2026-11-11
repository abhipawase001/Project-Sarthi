import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  Tooltip,
  Marker,
} from "react-leaflet";
import L from "leaflet";
import { CITY_CENTER, ROUTES, STOPS, type Bus } from "@/lib/mockData";

const occupancyColor = (o: Bus["occupancy"]) =>
  o === "low" ? "#a3e635" : o === "medium" ? "#22d3ee" : "#fbbf24";

function busIcon(b: Bus) {
  const color = occupancyColor(b.occupancy);
  return L.divIcon({
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `
      <div style="position:relative;width:44px;height:44px;display:grid;place-items:center;">
        <div style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:0.25;animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width:32px;height:32px;border-radius:9999px;background:${color};display:grid;place-items:center;box-shadow:0 0 18px ${color}cc;border:2px solid rgba(255,255,255,0.85);transform:rotate(${b.heading}deg);">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0b1220" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="16" cy="18" r="2"/></svg>
        </div>
      </div>`,
  });
}

const stopIcon = L.divIcon({
  className: "",
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  html: `<div style="width:12px;height:12px;border-radius:9999px;background:#0b1220;border:2px solid #22d3ee;box-shadow:0 0 8px #22d3ee99;"></div>`,
});

export function LiveMap({ buses, selectedRoute }: { buses: Bus[]; selectedRoute?: string | null }) {
  const stopById = Object.fromEntries(STOPS.map((s) => [s.id, s]));
  return (
    <MapContainer center={CITY_CENTER} zoom={14} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Route polylines */}
      {Object.entries(ROUTES).map(([rid, r]) => {
        if (selectedRoute && selectedRoute !== rid) return null;
        const pts = r.path.map((sid) => [stopById[sid].lat, stopById[sid].lng] as [number, number]);
        return (
          <Polyline
            key={rid}
            positions={pts}
            pathOptions={{ color: r.color, weight: 4, opacity: 0.55, dashArray: "8 6" }}
          />
        );
      })}
      {/* Stops */}
      {STOPS.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={stopIcon}>
          <Tooltip direction="top" offset={[0, -6]}>
            {s.name}
          </Tooltip>
        </Marker>
      ))}
      {/* Buses */}
      {buses.map((b) => (
        <Marker key={b.id} position={[b.lat, b.lng]} icon={busIcon(b)}>
          <Popup>
            <div className="font-sans" style={{ minWidth: 200 }}>
              <div className="font-bold text-sm">{b.id}</div>
              <div className="text-xs opacity-70">{b.routeName}</div>
              <div className="mt-2 text-xs grid grid-cols-2 gap-1">
                <span>Speed:</span>
                <span>{Math.round(b.speed)} km/h</span>
                <span>Occupancy:</span>
                <span className="capitalize">{b.occupancy} (driver report)</span>
                <span>Next:</span>
                <span>{b.nextStop}</span>
                <span>ETA:</span>
                <span>{b.etaMin > 0 ? `${b.etaMin} min` : "Unavailable"}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      {/* Bus accuracy ring */}
      {buses.map((b) => (
        <CircleMarker
          key={`r-${b.id}`}
          center={[b.lat, b.lng]}
          radius={20}
          pathOptions={{ color: occupancyColor(b.occupancy), opacity: 0.25, fillOpacity: 0.05 }}
        />
      ))}
    </MapContainer>
  );
}
