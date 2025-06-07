const express = require('express');
const axios = require('axios');
const app = express();
const snapsave = require('./snapsave-downloader');
const port = 3000;

// Configuración de Iframely
const IFRAMELY_API_KEY = '80c35cf85e5f42d8478c87';
const IFRAMELY_API_URL = 'https://cdn.iframe.ly/api/iframely';

// Función para convertir cualquier URL de Facebook al formato público /watch/?v=
const normalizeFacebookUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Extraer ID de video de diferentes formatos
    let videoId = null;
    
    // Formato Reel: /reel/995532505548246/
    const reelMatch = path.match(/\/reel\/(\d+)/);
    if (reelMatch) videoId = reelMatch[1];
    
    // Formato Share: /share/v/1B65jR958u/
    const shareMatch = path.match(/\/share\/v\/([^/]+)/);
    if (shareMatch) videoId = shareMatch[1];
    
    // Formato Watch: /watch/?v=1313736923683358
    const watchMatch = urlObj.searchParams.get('v');
    if (watchMatch) videoId = watchMatch;
    
    // Formato Videos: /videos/1313736923683358/
    const videoMatch = path.match(/\/videos\/(\d+)/);
    if (videoMatch) videoId = videoMatch[1];
    
    // Si encontramos un ID de video, creamos URL pública
    if (videoId) {
      return `https://www.facebook.com/watch/?v=${videoId}`;
    }
    
    // Si no reconocemos el formato, devolvemos la URL original
    return url;
  } catch (e) {
    return url;
  }
};

// Función para obtener datos de Iframely con múltiples intentos
const getIframelyData = async (urls) => {
  for (const url of urls) {
    try {
      const response = await axios.get(
        `${IFRAMELY_API_URL}?url=${encodeURIComponent(url)}&api_key=${IFRAMELY_API_KEY}`,
        { timeout: 5000 }
      );
      
      // Verificamos que tengamos datos válidos
      if (response.data && (response.data.meta || response.data.html)) {
        return {
          description: response.data.meta?.description || 
                      response.data.meta?.title || 
                      "Sin descripción disponible",
          html: response.data.html || null,
          thumbnail: response.data.links?.thumbnail?.[0]?.href || null
        };
      }
    } catch (error) {
      console.log(`Intento fallido para ${url}: ${error.message}`);
    }
  }
  return {
    description: "Sin descripción disponible",
    html: null,
    thumbnail: null
  };
};

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.get('/igdl', async (req, res) => {
  try {
    const originalUrl = req.query.url;
    if (!originalUrl) {
      return res.status(400).json({ error: 'URL parameter is missing' });
    }

    // Normalizamos la URL de Facebook al formato público
    const publicUrl = normalizeFacebookUrl(originalUrl);
    
    // Creamos una lista de URLs para intentar obtener los datos
    const iframelyUrls = [
      publicUrl,                   // Formato público
      originalUrl,                 // URL original
      publicUrl.replace('https://www.', 'https://m.'), // Versión móvil
      originalUrl.replace('https://www.', 'https://m.') 
    ];

    // Descargar video usando la URL ORIGINAL
    const downloadedURL = await snapsave(originalUrl);
    
    // Obtener datos de Iframely (descripción, HTML de incrustación y miniatura)
    const iframelyData = await getIframelyData(iframelyUrls);
    
    res.json({
      download_url: downloadedURL,
      description: iframelyData.description,
      embed_html: iframelyData.html, // HTML para incrustar el video
      thumbnail: iframelyData.thumbnail,
      original_url: originalUrl,
      public_url: publicUrl
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