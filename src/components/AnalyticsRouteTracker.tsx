import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { track } from '../services/analytics.service';

const pageNames: Record<string, string> = {
  '/': 'Home',
  '/upload': 'Upload',
  '/data-records': 'Data Records',
  '/activity-data': 'Data Records',
  '/conversion-factors': 'Conversion Factors',
  '/metrics-summary': 'Metrics Summary',
  '/reports': 'Reports',
  '/reporting': 'Reports',
};

export function AnalyticsRouteTracker() {
  const location = useLocation();
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    const pageName = pageNames[location.pathname];
    const route = `${location.pathname}${location.search}`;

    if (!pageName || lastTrackedPathRef.current === route) return;
    lastTrackedPathRef.current = route;

    track('PAGE_VIEW', {
      pageName,
      route: location.pathname,
    });
  }, [location.pathname, location.search]);

  return null;
}
