const express = require('express');
const axios = require('axios');
const app = express();
const snapsave = require('./snapsave-downloader');
const port = 3000;

// Configuración de Iframely
const IFRAMELY_API_KEY = '80c35cf85e5f42d8478c87';
const IFRAMELY_API_URL = 'https://cdn.iframe.ly/api/iframely';

// Función para convertir URLs de Facebook al formato share/v/
const normalizeFacebookUrl = (url) => {
  try {
    const urlObj = new URL(url);
    
    // Si ya es una URL share/v/, la devolvemos tal cual
    if (urlObj.pathname.includes('/share/v/')) {
      return url;
    }
    
    // Si es un Reel, extraemos el ID y lo convertimos
    const reelMatch = url.match(/facebook\.com\/reel\/(\d+)/);
    if (reelMatch) {
      return `https://www.facebook.com/share/v/${reelMatch[1]}/`;
    }
    
    // Si es un video normal, extraemos el ID
    const videoMatch = url.match(/videos(?:\/|%2F)(\d+)/) || 
                      url.match(/video\.php\?v=(\d+)/) ||
                      url.match(/\/videos\/\d+\/(\d+)\//);
    if (videoMatch) {
      return `https://www.facebook.com/share/v/${videoMatch[1]}/`;
    }
    
    // Si no reconocemos el formato, devolvemos la URL original
    return url;
  } catch (e) {
    return url;
  }
};

// Función para extraer la descripción de la respuesta de Iframely
const extractDescription = (iframelyData) => {
  if (!iframelyData) return "Sin descripción disponible";
  
  // Primero intentamos con la descripción completa
  if (iframelyData.meta?.description) {
    return iframelyData.meta.description;
  }
  
  // Luego con el título
  if (iframelyData.meta?.title) {
    return iframelyData.meta.title;
  }
  
  // Intentamos extraer del HTML embebido
  if (iframelyData.html) {
    const descMatch = iframelyData.html.match(/<p>(.*?)<\/p>/s);
    if (descMatch) {
      return descMatch[1]
        .replace(/<[^>]+>/g, '') // Eliminar etiquetas HTML
        .replace(/\n{2,}/g, '\n\n') // Normalizar saltos de línea
        .trim();
    }
  }
  
  // Último recurso: título de la miniatura
  if (iframelyData.links?.thumbnail?.[0]?.title) {
    return iframelyData.links.thumbnail[0].title;
  }
  
  return "Sin descripción disponible";
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

    // Normalizamos la URL de Facebook solo para obtener la descripción
    let descriptionUrl = originalUrl;
    if (originalUrl.includes('facebook.com')) {
      descriptionUrl = normalizeFacebookUrl(originalUrl);
    }

    // Descargar video usando la URL ORIGINAL
    const downloadedURL = await snapsave(originalUrl);
    
    // Obtener descripción usando Iframely con la URL NORMALIZADA
    let description = "Sin descripción disponible";
    
    try {
      // Primero intentamos con la URL normalizada
      const iframelyResponse = await axios.get(
        `${IFRAMELY_API_URL}?url=${encodeURIComponent(descriptionUrl)}&api_key=${IFRAMELY_API_KEY}`,
        { timeout: 5000 }
      );
      
      description = extractDescription(iframelyResponse.data);
    } catch (iframelyError) {
      console.error('Error con Iframely (normalizada):', iframelyError.message);
      
      // Si falla la URL normalizada, intentamos con la original
      try {
        const fallbackResponse = await axios.get(
          `${IFRAMELY_API_URL}?url=${encodeURIComponent(originalUrl)}&api_key=${IFRAMELY_API_KEY}`,
          { timeout: 5000 }
        );
        
        description = extractDescription(fallbackResponse.data);
      } catch (fallbackError) {
        console.error('Error con Iframely (original):', fallbackError.message);
      }
    }
    
    res.json({
      download_url: downloadedURL,
      description: description,
      original_url: originalUrl,
      description_url: descriptionUrl
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