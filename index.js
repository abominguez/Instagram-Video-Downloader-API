const express = require('express');
const snapsave = require('./snapsave-downloader'); // ya obtiene el JSON
const app   = express();
const port  = 3000;

/* Helper: de lo que devuelva snapsave saca la URL directa */
function pickDirectLink(obj) {
  if (!obj) return null;

  if (typeof obj === 'string') return obj;                     // cuando ya es string
  if (obj.url?.data?.length)   return obj.url.data[0].url;     // nueva estructura
  if (obj.url)                 return obj.url;                 // formato antiguo
  if (obj.video?.url)          return obj.video.url;           // por si acaso
  return null;
}

app.get('/', (req, res) => {
  res.json({ message: 'Instagram Downloader API' });
});

app.get('/igdl', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing ?url=' });

    // Llama a snapsave
    const raw = await snapsave(url);

    const direct = pickDirectLink(raw);
    if (!direct) return res.status(500).json({ error: 'Direct link not found' });

    return res.json({ url: direct, success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () =>
  console.log(`Instagram-Video-Downloader-API running on http://localhost:${port}`)
);
