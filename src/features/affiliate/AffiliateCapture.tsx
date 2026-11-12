import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { captureAffiliateVisit } from '../../services/affiliate.service';
export function AffiliateCapture() {
  const location = useLocation();
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('ref');
    if (code) void captureAffiliateVisit(code).catch(() => { /* No referral is recorded when admission is unavailable. */ });
  }, [location.search]);
  return null;
}
