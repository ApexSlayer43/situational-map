import type {
  Airport,
  Port,
  RegionPreset,
  AirRoute,
  SeaLane,
  SatelliteGroup,
  NoFlyZone,
  TrafficZone,
  TimelineEvent,
  CameraFeed,
  CountryLabel,
  CityLabel,
} from "@/types";

export const GLOBE_W = 1020;
export const GLOBE_H = 600;
export const HISTORY_STEPS = 32;

export const REGION_PRESETS: Record<string, RegionPreset> = {
  global: { key: "global", name: "Global", lon: 0, lat: 15, scale: 255 },
  atlantic: { key: "atlantic", name: "North Atlantic", lon: -35, lat: 35, scale: 360 },
  europe: { key: "europe", name: "Europe / East Med", lon: 20, lat: 38, scale: 470 },
  gulf: { key: "gulf", name: "Gulf / Hormuz", lon: 54, lat: 24, scale: 690 },
  eastAsia: { key: "eastAsia", name: "East Asia", lon: 125, lat: 28, scale: 470 },
  usaEast: { key: "usaEast", name: "US East", lon: -78, lat: 34, scale: 560 },
};

export const REGION_KEYS = Object.keys(REGION_PRESETS);

export const AIRPORTS: Record<string, Airport> = {
  JFK: { code: "JFK", city: "New York", country: "United States", lon: -73.7781, lat: 40.6413 },
  ATL: { code: "ATL", city: "Atlanta", country: "United States", lon: -84.4277, lat: 33.6407 },
  LAX: { code: "LAX", city: "Los Angeles", country: "United States", lon: -118.4085, lat: 33.9416 },
  DFW: { code: "DFW", city: "Dallas", country: "United States", lon: -97.0403, lat: 32.8998 },
  ORD: { code: "ORD", city: "Chicago", country: "United States", lon: -87.9073, lat: 41.9742 },
  LHR: { code: "LHR", city: "London", country: "United Kingdom", lon: -0.4543, lat: 51.47 },
  CDG: { code: "CDG", city: "Paris", country: "France", lon: 2.5479, lat: 49.0097 },
  FRA: { code: "FRA", city: "Frankfurt", country: "Germany", lon: 8.5706, lat: 50.0379 },
  MAD: { code: "MAD", city: "Madrid", country: "Spain", lon: -3.5676, lat: 40.4983 },
  FCO: { code: "FCO", city: "Rome", country: "Italy", lon: 12.2508, lat: 41.7999 },
  IST: { code: "IST", city: "Istanbul", country: "Turkey", lon: 28.8146, lat: 41.2753 },
  DOH: { code: "DOH", city: "Doha", country: "Qatar", lon: 51.6138, lat: 25.2731 },
  DXB: { code: "DXB", city: "Dubai", country: "United Arab Emirates", lon: 55.3657, lat: 25.2532 },
  DEL: { code: "DEL", city: "Delhi", country: "India", lon: 77.1031, lat: 28.5562 },
  BOM: { code: "BOM", city: "Mumbai", country: "India", lon: 72.8679, lat: 19.0896 },
  SIN: { code: "SIN", city: "Singapore", country: "Singapore", lon: 103.994, lat: 1.3644 },
  HND: { code: "HND", city: "Tokyo", country: "Japan", lon: 139.7798, lat: 35.5494 },
  ICN: { code: "ICN", city: "Seoul", country: "South Korea", lon: 126.4407, lat: 37.4602 },
  SYD: { code: "SYD", city: "Sydney", country: "Australia", lon: 151.1772, lat: -33.9399 },
  JNB: { code: "JNB", city: "Johannesburg", country: "South Africa", lon: 28.246, lat: -26.1337 },
  GRU: { code: "GRU", city: "São Paulo", country: "Brazil", lon: -46.4731, lat: -23.4356 },
  MEX: { code: "MEX", city: "Mexico City", country: "Mexico", lon: -99.0721, lat: 19.4361 },
  ANC: { code: "ANC", city: "Anchorage", country: "United States", lon: -149.9964, lat: 61.1743 },
  KEF: { code: "KEF", city: "Reykjavík", country: "Iceland", lon: -22.6056, lat: 63.985 },
  NRT: { code: "NRT", city: "Tokyo", country: "Japan", lon: 140.3929, lat: 35.772 },
  PAE: { code: "PAE", city: "Everett", country: "United States", lon: -122.281, lat: 47.9063 },
  DOV: { code: "DOV", city: "Dover", country: "United States", lon: -75.466, lat: 39.1295 },
  RMS: { code: "RMS", city: "Ramstein", country: "Germany", lon: 7.6003, lat: 49.4369 },
  OKA: { code: "OKA", city: "Okinawa", country: "Japan", lon: 127.6459, lat: 26.1958 },
  HIK: { code: "HIK", city: "Honolulu", country: "United States", lon: -157.9376, lat: 21.3187 },
};

export const PORTS: Record<string, Port> = {
  NYC: { code: "NYC", city: "New York", country: "United States", lon: -74.0059, lat: 40.7128 },
  HOU: { code: "HOU", city: "Houston", country: "United States", lon: -95.3698, lat: 29.7604 },
  RDM: { code: "RDM", city: "Rotterdam", country: "Netherlands", lon: 4.47917, lat: 51.9244 },
  HAM: { code: "HAM", city: "Hamburg", country: "Germany", lon: 9.9937, lat: 53.5511 },
  ALG: { code: "ALG", city: "Algeciras", country: "Spain", lon: -5.4562, lat: 36.1408 },
  SUE: { code: "SUE", city: "Suez", country: "Egypt", lon: 32.5498, lat: 29.9668 },
  DXB: { code: "DXB", city: "Dubai", country: "United Arab Emirates", lon: 55.2708, lat: 25.2048 },
  MUM: { code: "MUM", city: "Mumbai", country: "India", lon: 72.8777, lat: 18.9388 },
  SGP: { code: "SGP", city: "Singapore", country: "Singapore", lon: 103.8198, lat: 1.2903 },
  SHA: { code: "SHA", city: "Shanghai", country: "China", lon: 121.4737, lat: 31.2304 },
  HKG: { code: "HKG", city: "Hong Kong", country: "China", lon: 114.1694, lat: 22.3193 },
  TYO: { code: "TYO", city: "Tokyo Bay", country: "Japan", lon: 139.8395, lat: 35.6427 },
  SYD: { code: "SYD", city: "Sydney", country: "Australia", lon: 151.2093, lat: -33.8688 },
  CPT: { code: "CPT", city: "Cape Town", country: "South Africa", lon: 18.4241, lat: -33.9249 },
  RIO: { code: "RIO", city: "Rio de Janeiro", country: "Brazil", lon: -43.1729, lat: -22.9068 },
  NOR: { code: "NOR", city: "Norfolk", country: "United States", lon: -76.2859, lat: 36.8508 },
  GIB: { code: "GIB", city: "Gibraltar", country: "United Kingdom", lon: -5.3536, lat: 36.1408 },
  BUS: { code: "BUS", city: "Busan", country: "South Korea", lon: 129.0756, lat: 35.1796 },
};

export const COUNTRY_LABELS: CountryLabel[] = [
  { name: "United States", lon: -98, lat: 39 },
  { name: "Canada", lon: -103, lat: 58 },
  { name: "Mexico", lon: -102, lat: 23 },
  { name: "Brazil", lon: -53, lat: -10 },
  { name: "Argentina", lon: -64, lat: -35 },
  { name: "United Kingdom", lon: -2, lat: 54 },
  { name: "France", lon: 2, lat: 46 },
  { name: "Germany", lon: 10, lat: 51 },
  { name: "Spain", lon: -3, lat: 40 },
  { name: "Italy", lon: 12, lat: 42 },
  { name: "Norway", lon: 8, lat: 61 },
  { name: "Turkey", lon: 35, lat: 39 },
  { name: "Saudi Arabia", lon: 45, lat: 24 },
  { name: "Egypt", lon: 30, lat: 27 },
  { name: "South Africa", lon: 24, lat: -29 },
  { name: "Russia", lon: 95, lat: 60 },
  { name: "India", lon: 79, lat: 22 },
  { name: "China", lon: 104, lat: 35 },
  { name: "Japan", lon: 138, lat: 37 },
  { name: "South Korea", lon: 127.5, lat: 36.2 },
  { name: "Indonesia", lon: 118, lat: -2 },
  { name: "Australia", lon: 134, lat: -25 },
];

export const CITY_LABELS: CityLabel[] = [
  { name: "New York", lon: -74.0, lat: 40.71, tier: 1 },
  { name: "Miami", lon: -80.19, lat: 25.76, tier: 2 },
  { name: "Washington", lon: -77.03, lat: 38.9, tier: 2 },
  { name: "Los Angeles", lon: -118.24, lat: 34.05, tier: 1 },
  { name: "Chicago", lon: -87.62, lat: 41.88, tier: 2 },
  { name: "London", lon: -0.12, lat: 51.5, tier: 1 },
  { name: "Paris", lon: 2.35, lat: 48.85, tier: 1 },
  { name: "Berlin", lon: 13.4, lat: 52.52, tier: 2 },
  { name: "Rome", lon: 12.49, lat: 41.9, tier: 2 },
  { name: "Madrid", lon: -3.7, lat: 40.42, tier: 2 },
  { name: "Cairo", lon: 31.23, lat: 30.04, tier: 2 },
  { name: "Dubai", lon: 55.27, lat: 25.2, tier: 1 },
  { name: "Mumbai", lon: 72.87, lat: 19.07, tier: 2 },
  { name: "Singapore", lon: 103.82, lat: 1.35, tier: 2 },
  { name: "Tokyo", lon: 139.65, lat: 35.67, tier: 1 },
  { name: "Seoul", lon: 126.98, lat: 37.56, tier: 2 },
  { name: "Hong Kong", lon: 114.17, lat: 22.32, tier: 2 },
  { name: "Sydney", lon: 151.2, lat: -33.87, tier: 1 },
  { name: "São Paulo", lon: -46.63, lat: -23.55, tier: 2 },
  { name: "Johannesburg", lon: 28.04, lat: -26.2, tier: 2 },
];

export const EVENTS: TimelineEvent[] = [
  { t: 18, title: "Satellite pass", detail: "Orbital coverage lines up with corridor activity.", severity: "low", region: "East Med" },
  { t: 33, title: "Airspace alert", detail: "Restriction advisory bends commercial routing northward.", severity: "high", region: "Eastern Europe" },
  { t: 56, title: "Vessel reroute", detail: "Maritime posture shifts near a chokepoint.", severity: "medium", region: "Hormuz" },
  { t: 82, title: "Traffic spike", detail: "Ground flow pressure intensifies in urban cores.", severity: "low", region: "NYC / London / Tokyo" },
];

export const CAMERAS: CameraFeed[] = [
  { name: "NYC DOT Midtown", city: "New York", note: "Public traffic camera placeholder" },
  { name: "Florida 511 I-95", city: "Miami", note: "Public traffic camera placeholder" },
  { name: "TfL Central London", city: "London", note: "Official transport camera directory placeholder" },
];

export const NO_FLY: NoFlyZone[] = [
  { name: "Ukraine conflict airspace", west: 18, south: 43, east: 41, north: 53, kind: "high" },
  { name: "North Korea restricted", west: 124, south: 37, east: 131, north: 43, kind: "high" },
  { name: "Hormuz caution", west: 52, south: 23, east: 58, north: 28, kind: "medium" },
];

export const TRAFFIC_ZONES: TrafficZone[] = [
  { name: "NYC core", lon: -73.98, lat: 40.75, radius: 2.8 },
  { name: "London central", lon: -0.11, lat: 51.51, radius: 2.5 },
  { name: "Tokyo central", lon: 139.76, lat: 35.68, radius: 3.0 },
  { name: "Dubai corridor", lon: 55.27, lat: 25.2, radius: 2.2 },
  { name: "Singapore core", lon: 103.82, lat: 1.35, radius: 1.8 },
];

export const AIR_ROUTES: AirRoute[] = [
  { operator: "Delta", from: "JFK", to: "LHR", category: "commercial", count: 3 },
  { operator: "American", from: "DFW", to: "LHR", category: "commercial", count: 2 },
  { operator: "United", from: "ORD", to: "FRA", category: "commercial", count: 2 },
  { operator: "British Airways", from: "LHR", to: "JFK", category: "commercial", count: 3 },
  { operator: "Air France", from: "CDG", to: "JFK", category: "commercial", count: 2 },
  { operator: "Lufthansa", from: "FRA", to: "ORD", category: "commercial", count: 2 },
  { operator: "Qatar Airways", from: "DOH", to: "FRA", category: "commercial", count: 2 },
  { operator: "Emirates", from: "DXB", to: "LHR", category: "commercial", count: 2 },
  { operator: "Singapore Airlines", from: "SIN", to: "LAX", category: "commercial", count: 2 },
  { operator: "ANA", from: "HND", to: "LAX", category: "commercial", count: 2 },
  { operator: "JAL", from: "NRT", to: "JFK", category: "commercial", count: 2 },
  { operator: "Air India", from: "DEL", to: "LHR", category: "commercial", count: 2 },
  { operator: "Qantas", from: "SYD", to: "SIN", category: "commercial", count: 2 },
  { operator: "LATAM", from: "GRU", to: "MAD", category: "commercial", count: 2 },
  { operator: "Aeromexico", from: "MEX", to: "ATL", category: "commercial", count: 1 },
  { operator: "Korean Air", from: "ICN", to: "LAX", category: "commercial", count: 2 },
  { operator: "Icelandair", from: "KEF", to: "JFK", category: "commercial", count: 1 },
  { operator: "USAF", from: "DOV", to: "RMS", category: "military", count: 2 },
  { operator: "USAF", from: "HIK", to: "OKA", category: "military", count: 1 },
  { operator: "RAF", from: "LHR", to: "RMS", category: "military", count: 1 },
  { operator: "NATO", from: "RMS", to: "IST", category: "military", count: 1 },
  { operator: "Boeing Test", from: "PAE", to: "ANC", category: "commercial", count: 1 },
];

export const SEA_LANES: SeaLane[] = [
  { operator: "Maersk", from: "NYC", to: "RDM", category: "commercial", count: 2 },
  { operator: "MSC", from: "SGP", to: "SHA", category: "commercial", count: 3 },
  { operator: "CMA CGM", from: "ALG", to: "SUE", category: "commercial", count: 2 },
  { operator: "COSCO", from: "SHA", to: "SGP", category: "commercial", count: 2 },
  { operator: "Evergreen", from: "SGP", to: "BUS", category: "commercial", count: 2 },
  { operator: "Hapag-Lloyd", from: "HAM", to: "RDM", category: "commercial", count: 1 },
  { operator: "ONE", from: "TYO", to: "SGP", category: "commercial", count: 2 },
  { operator: "MOL", from: "TYO", to: "BUS", category: "commercial", count: 1 },
  { operator: "US Navy", from: "NOR", to: "GIB", category: "military", count: 1 },
  { operator: "US Navy", from: "GIB", to: "SUE", category: "military", count: 1 },
  { operator: "Royal Navy", from: "GIB", to: "ALG", category: "military", count: 1 },
  { operator: "MSC", from: "RIO", to: "CPT", category: "commercial", count: 2 },
  { operator: "Maersk", from: "DXB", to: "MUM", category: "commercial", count: 2 },
  { operator: "CMA CGM", from: "SUE", to: "DXB", category: "commercial", count: 2 },
];

export const SATELLITE_GROUPS: SatelliteGroup[] = [
  { operator: "ISS partnership", name: "ISS", category: "civil", count: 1, inclination: 51.6, altitude: 408, drift: 2.8 },
  { operator: "SpaceX", name: "STARLINK", category: "commercial", count: 18, inclination: 53, altitude: 550, drift: 3.2 },
  { operator: "OneWeb", name: "ONEWEB", category: "commercial", count: 12, inclination: 87, altitude: 1200, drift: 2.2 },
  { operator: "Planet", name: "PLANET", category: "commercial", count: 8, inclination: 97.4, altitude: 500, drift: 2.9 },
  { operator: "US Government", name: "USA", category: "military", count: 6, inclination: 63.4, altitude: 520, drift: 2.5 },
  { operator: "EU Copernicus", name: "SENTINEL", category: "civil", count: 4, inclination: 98.2, altitude: 690, drift: 2.6 },
];
