const express = require('express');
const axios = require('axios');
const app = express();
const snapsave = require('./snapsave-downloader');
const port = 3000;

// Token de acceso de Facebook (usa el que proporcionaste)
const FB_ACCESS_TOKEN = '1213051549991229|StQwB54cS-ClpHQ9raxnn5ij0dk';

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.get('/igdl', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is missing' });
    }

    // 1. Descargar video usando snapsave
    const downloadedURL = await snapsave(url);
    
    // 2. Obtener descripción usando oEmbed API
    const oembedUrl = `https://graph.facebook.com/v18.0/oembed_video?url=${encodeURIComponent(url)}&access_token=${FB_ACCESS_TOKEN}`;
    const oembedResponse = await axios.get(oembedUrl);
    
    res.json({
      download_url: downloadedURL,
      description: oembedResponse.data.title || "Sin descripción disponible"
    });
    
  } catch (err) {
    console.error('Error:', err.message);
    
    // Manejo específico de errores de Facebook API
    if (err.response?.data?.error) {
      return res.status(500).json({ 
        error: 'Error de Facebook API',
        message: err.response.data.error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: err.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});