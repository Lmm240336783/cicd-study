type ImageProxyRequest = {
  body?: unknown;
  method?: string;
};

type ImageProxyResponse = {
  json: (body: unknown) => void;
  send: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ImageProxyResponse;
};

const PSYDO_IMAGE_API_URL = 'https://api.psydo.top/v1/images/generations';

export default async function handler(request: ImageProxyRequest, response: ImageProxyResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ message: 'Only POST requests are supported.' });
    return;
  }

  const apiKey = process.env.PSYDO_API_KEY;
  if (!apiKey) {
    response.status(500).json({ message: 'Missing PSYDO_API_KEY on the server.' });
    return;
  }

  try {
    const upstreamResponse = await fetch(PSYDO_IMAGE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });
    const contentType = upstreamResponse.headers.get('content-type') ?? 'application/json';
    const payload = contentType.includes('application/json')
      ? await upstreamResponse.json()
      : await upstreamResponse.text();

    response.status(upstreamResponse.status);
    response.setHeader('Content-Type', contentType);
    response.send(payload);
  } catch (error) {
    response.status(502).json({
      message: error instanceof Error ? error.message : 'Image generation proxy failed.',
    });
  }
}
