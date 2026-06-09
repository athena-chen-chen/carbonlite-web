import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../services/ga4.service';

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/pilot': 'Pilot Program',
  '/login': 'Login',
  '/register': 'Register',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms of Use',
  '/about': 'About CarbonLite',
  '/upload': 'Upload',
  '/data-records': 'Data Records',
  '/activity-data': 'Data Records',
  '/conversion-factors': 'Conversion Factors',
  '/metrics-summary': 'Metrics Summary',
  '/reports': 'Reports',
  '/reporting': 'Reports',
};

export function GA4RouteTracker() {
  const location = useLocation();
  const lastTrackedRouteRef = useRef<string | null>(null);

  useEffect(() => {
    const route = `${location.pathname}${location.search}`;
    if (lastTrackedRouteRef.current === route) return;
    lastTrackedRouteRef.current = route;

    trackPageView(route, pageTitles[location.pathname] ?? 'CarbonLite AI');
  }, [location.pathname, location.search]);

  return null;
}
