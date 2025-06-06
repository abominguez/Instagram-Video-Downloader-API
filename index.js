const express = require('express');
const axios = require('axios');
const app = express();
const snapsave = require('./snapsave-downloader');
const port = 3000;
const express = require('express');
const axios = require('axios');
const app = express();
const snapsave = require('./snapsave-downloader');
const port = 3000;

// Configuración de Iframely
const IFRAMELY_API_KEY = '80c35cf85e5f42d8478c87';
const IFRAMELY_API_URL = 'https://cdn.iframe.ly/api/iframely';

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.get('/igdl', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is missing' });
    }

    // Descargar video usando snapsave
    const downloadedURL = await snapsave(url);
    
    // Obtener descripción usando Iframely
    let description = "Sin descripción disponible";
    
    try {
      const iframelyResponse = await axios.get(`${IFRAMELY_API_URL}?url=${encodeURIComponent(url)}&api_key=${IFRAMELY_API_KEY}`);
      
      // Extraer la mejor descripción disponible
      if (iframelyResponse.data?.meta?.title) {
        description = iframelyResponse.data.meta.title;
      } else if (iframelyResponse.data?.meta?.description) {
        description = iframelyResponse.data.meta.description;
      } else if (iframelyResponse.data?.links?.thumbnail?.[0]?.title) {
        description = iframelyResponse.data.links.thumbnail[0].title;
      }
    } catch (iframelyError) {
      console.error('Error con Iframely:', iframelyError.message);
    }
    
    res.json({
      download_url: downloadedURL,
      description: description
    });
    
  } catch (err) {
    console.error('Error principal:', err.message);
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: err.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});