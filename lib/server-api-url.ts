const PRODUCTION_API_URL = 'https://systemtest.citydrivehire.com';

export function getServerApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || PRODUCTION_API_URL;
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(configuredUrl);
  const hasHttpScheme = /^https?:\/\//i.test(configuredUrl);
  if (!hasHttpScheme && /^[a-z][a-z\d+.-]*:/i.test(configuredUrl) && !isLocalHost) {
    throw new Error('NEXT_PUBLIC_API_URL must use HTTP or HTTPS.');
  }

  const normalizedUrl = hasHttpScheme
    ? configuredUrl
    : `${isLocalHost ? 'http' : 'https'}://${configuredUrl}`;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    throw new Error('NEXT_PUBLIC_API_URL must be a valid HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('NEXT_PUBLIC_API_URL must use HTTP or HTTPS.');
  }
  if (parsedUrl.hostname === 'localruntest.com') return PRODUCTION_API_URL;
  return parsedUrl.toString().replace(/\/$/, '');
}
