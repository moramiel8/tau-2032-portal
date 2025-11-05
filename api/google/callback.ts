// api/google/callback.ts
export default async function handler(req: any, res: any) {
  const origin = `https://${req.headers.host}`;
  const { url } = req;
  const code = new URL(url, origin).searchParams.get('code');
  if (!code) return res.status(400).send('Missing code');

  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: `${origin}/api/google/callback`,
    grant_type: 'authorization_code',
  });

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const tokens = await r.json();

  // TODO: לשמור session/cookie משלך כאן אם צריך
  // res.setHeader('Set-Cookie', `session=...; Path=/; HttpOnly; Secure; SameSite=Lax`);

  res.setHeader('Location', '/'); // לאן להחזיר את המשתמש אחרי התחברות
  return res.status(302).end();
}
