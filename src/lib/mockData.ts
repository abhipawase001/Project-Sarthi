// Mock data for Project Sarthi — Sangamner city bus network
export type BusStatus = 'on-time' | 'delayed' | 'crowded' | 'idle';
export type Occupancy = 'low' | 'medium' | 'high';

export interface Bus {
  id: string;
  route: string;
  routeName: string;
  driver: string;
  lat: number;
  lng: number;
  speed: number; // km/h
  heading: number; // degrees
  occupancy: Occupancy;
  seatsAvailable: number;
  seatsTotal: number;
  status: BusStatus;
  nextStop: string;
  etaMin: number;
}

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
}

// Sangamner, Maharashtra approx coords: 19.5667° N, 74.2167° E
export const CITY_CENTER: [number, number] = [19.5667, 74.2167];

export const STOPS: Stop[] = [
  { id: 's1', name: 'Sangamner Bus Depot',  lat: 19.5680, lng: 74.2160, routes: ['R1','R2','R3'] },
  { id: 's2', name: 'Market Yard',          lat: 19.5720, lng: 74.2230, routes: ['R1','R2'] },
  { id: 's3', name: 'Sangamner College',    lat: 19.5790, lng: 74.2310, routes: ['R1'] },
  { id: 's4', name: 'Civil Hospital',       lat: 19.5640, lng: 74.2080, routes: ['R2','R3'] },
  { id: 's5', name: 'Ghulewadi Naka',       lat: 19.5580, lng: 74.1980, routes: ['R3'] },
  { id: 's6', name: 'Malpani Industrial',   lat: 19.5840, lng: 74.2410, routes: ['R1'] },
  { id: 's7', name: 'Pravara Sangam',       lat: 19.5520, lng: 74.1880, routes: ['R3'] },
  { id: 's8', name: 'Akole Road Junction',  lat: 19.5750, lng: 74.2050, routes: ['R2'] },
];

export const ROUTES = {
  R1: { name: 'Depot ↔ Malpani', color: '#22d3ee', path: ['s1','s2','s3','s6'] },
  R2: { name: 'Hospital ↔ Akole',  color: '#a3e635', path: ['s4','s1','s2','s8'] },
  R3: { name: 'Pravara Circuit',    color: '#fbbf24', path: ['s7','s5','s4','s1'] },
} as const;

export const INITIAL_BUSES: Bus[] = [
  { id: 'MH17-AB-1023', route: 'R1', routeName: 'Depot ↔ Malpani', driver: 'Ramesh K.', lat: 19.5700, lng: 74.2200, speed: 32, heading: 45, occupancy: 'medium', seatsAvailable: 14, seatsTotal: 42, status: 'on-time', nextStop: 'Sangamner College', etaMin: 4 },
  { id: 'MH17-CD-4521', route: 'R1', routeName: 'Depot ↔ Malpani', driver: 'Suresh P.', lat: 19.5790, lng: 74.2310, speed: 0, heading: 90, occupancy: 'high', seatsAvailable: 3, seatsTotal: 42, status: 'crowded', nextStop: 'Malpani Industrial', etaMin: 7 },
  { id: 'MH17-EF-7788', route: 'R2', routeName: 'Hospital ↔ Akole', driver: 'Vijay M.', lat: 19.5680, lng: 74.2120, speed: 28, heading: 270, occupancy: 'low', seatsAvailable: 28, seatsTotal: 42, status: 'on-time', nextStop: 'Civil Hospital', etaMin: 2 },
  { id: 'MH17-GH-2210', route: 'R2', routeName: 'Hospital ↔ Akole', driver: 'Anil S.', lat: 19.5720, lng: 74.2050, speed: 18, heading: 320, occupancy: 'medium', seatsAvailable: 19, seatsTotal: 42, status: 'delayed', nextStop: 'Akole Road Junction', etaMin: 9 },
  { id: 'MH17-IJ-9090', route: 'R3', routeName: 'Pravara Circuit', driver: 'Pradeep B.', lat: 19.5580, lng: 74.1980, speed: 36, heading: 180, occupancy: 'low', seatsAvailable: 31, seatsTotal: 42, status: 'on-time', nextStop: 'Pravara Sangam', etaMin: 5 },
  { id: 'MH17-KL-3344', route: 'R3', routeName: 'Pravara Circuit', driver: 'Mahesh T.', lat: 19.5640, lng: 74.2080, speed: 24, heading: 0,   occupancy: 'medium', seatsAvailable: 17, seatsTotal: 42, status: 'on-time', nextStop: 'Sangamner Bus Depot', etaMin: 3 },
];

export function stepBus(b: Bus): Bus {
  // Random walk along heading
  const rad = (b.heading * Math.PI) / 180;
  const dist = (b.speed || 5) * 0.00002; // tiny degree step
  let lat = b.lat + Math.cos(rad) * dist;
  let lng = b.lng + Math.sin(rad) * dist;
  // Keep within city bounds — bounce
  if (Math.abs(lat - CITY_CENTER[0]) > 0.035) { lat = b.lat; }
  if (Math.abs(lng - CITY_CENTER[1]) > 0.04)  { lng = b.lng; }
  const heading = (b.heading + (Math.random() - 0.5) * 30 + 360) % 360;
  const speed = Math.max(0, Math.min(55, b.speed + (Math.random() - 0.5) * 8));
  const etaMin = Math.max(1, b.etaMin + (Math.random() < 0.3 ? -1 : Math.random() < 0.2 ? 1 : 0));
  return { ...b, lat, lng, heading, speed, etaMin };
}

export const CITY_KPIS = {
  busesLive: 6,
  totalBuses: 38,
  routes: 3,
  passengersToday: 4280,
  onTimePct: 87,
  avgWaitBefore: 28,
  avgWaitAfter: 21,
  co2SavedKg: 1240,
  ecoPoints: 18430,
};

export const HOURLY_RIDERSHIP = [
  { hour: '6AM', riders: 120, predicted: 130 },
  { hour: '7AM', riders: 340, predicted: 360 },
  { hour: '8AM', riders: 580, predicted: 600 },
  { hour: '9AM', riders: 520, predicted: 510 },
  { hour: '10AM', riders: 280, predicted: 290 },
  { hour: '11AM', riders: 240, predicted: 250 },
  { hour: '12PM', riders: 380, predicted: 390 },
  { hour: '1PM', riders: 420, predicted: 410 },
  { hour: '2PM', riders: 360, predicted: 350 },
  { hour: '3PM', riders: 310, predicted: 320 },
  { hour: '4PM', riders: 470, predicted: 480 },
  { hour: '5PM', riders: 640, predicted: 650 },
  { hour: '6PM', riders: 720, predicted: 710 },
  { hour: '7PM', riders: 510, predicted: 520 },
  { hour: '8PM', riders: 290, predicted: 300 },
];

export const OCCUPANCY_DIST = [
  { name: 'Low',    value: 38, color: '#a3e635' },
  { name: 'Medium', value: 42, color: '#22d3ee' },
  { name: 'High',   value: 20, color: '#fbbf24' },
];

export const ROUTE_PERF = [
  { route: 'R1', onTime: 92, delay: 8 },
  { route: 'R2', onTime: 84, delay: 16 },
  { route: 'R3', onTime: 89, delay: 11 },
];

export const LEADERBOARD = [
  { rank: 1, name: 'Priya S.',   trips: 142, co2: 84, points: 4260 },
  { rank: 2, name: 'Amit J.',    trips: 128, co2: 76, points: 3840 },
  { rank: 3, name: 'Sneha R.',   trips: 119, co2: 71, points: 3570 },
  { rank: 4, name: 'Rohit M.',   trips: 104, co2: 62, points: 3120 },
  { rank: 5, name: 'Kavita P.',  trips: 96,  co2: 57, points: 2880 },
  { rank: 6, name: 'You',        trips: 73,  co2: 43, points: 2190 },
];
