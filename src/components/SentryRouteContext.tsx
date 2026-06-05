import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { setSentryRouteContext } from '../sentry';

export function SentryRouteContext() {
  const location = useLocation();

  useEffect(() => {
    setSentryRouteContext(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  return null;
}
