declare module 'geoip-country' {
  interface GeoipCountryResult {
    country: string;
  }
  const geoip: { lookup(ip: string): GeoipCountryResult | null };
  export default geoip;
}
