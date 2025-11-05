// api/google.ts
export default async function handler(req: any, res: any) {
  if (req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const origin = `https://${req.headers.host}`; // דומיין הפרודקשן/preview ב-Vercel
  const redirectUri = `${origin}/api/google/callback`;

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('prompt', 'select_account');

  res.setHeader('Location', url.toString());
  return res.status(302).end(); // חשוב: 302 כדי שהדפדפן ינווט
}
