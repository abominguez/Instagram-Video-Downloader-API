/* --------------------------------------------------
   Instagram-Video-Downloader-API – micro-servicio
   Descarga un reel/post:  GET /igdl?url=<insta_url>
   Devuelve JSON { url: "<enlace .mp4>", success: true }
-------------------------------------------------- */
const express  = require('express');
const snapsave = require('./snapsave-downloader');   // librería que ya tenías

const app  = express();

/* Helper: intenta encontrar la URL MP4 en distintos formatos */
function pickDirectLink(raw) {
  if (!raw) return null;

  // formato más reciente   { url: { data:[{ url:"..." }] } }
  if (raw.url?.data?.length && raw.url.data[0].url)
    return raw.url.data[0].url;

  // formato anterior       { url: "https://...mp4" }
  if (typeof raw.url === 'string')
    return raw.url;

  // otro posible formato   { video: { url:"..." } }
  if (raw.video?.url)
    return raw.video.url;

  return null;
}

/* Root */
app.get('/', (_, res) => {
  res.json({ message: 'Instagram Downloader API – use /igdl?url=' });
});

/* Main endpoint */
app.get('/igdl', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing ?url=' });

    // Llama a snapsave
    const raw = await snapsave(url);

    // Elegir enlace directo
    const direct = pickDirectLink(raw);
    if (!direct) return res.status(500).json({ error: 'Direct link not found' });

    res.json({ url: direct, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Instagram Downloader running on http://localhost:${PORT}`)
);
