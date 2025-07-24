import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url param', { status: 400 });
  }
  console.log('[FETCH-PAGE] Fetching', url);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      // Pretend to be a regular browser
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
    });

    const status = res.status;
    const html = await res.text();

    if (status >= 400) {
      console.warn('[FETCH-PAGE] Upstream non-OK status', status);
    }

    const truncated = html.slice(0, 500_000);
    return NextResponse.json({ html: truncated, status });
  } catch (e) {
    console.error('[FETCH-PAGE] Error fetching page', e);
    return new NextResponse('Fetch error', { status: 500 });
  }
} 