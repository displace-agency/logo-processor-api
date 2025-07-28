const axios = require('axios');
const sharp = require('sharp');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if Remove.bg API key is set
    if (!process.env.REMOVEBG_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Remove.bg API key is not configured.' 
      });
    }

    // Get the image data
    const imageBuffer = Buffer.from(req.body.image.split(',')[1], 'base64');

    // Remove background using Remove.bg
    const formData = new FormData();
    formData.append('image_file', imageBuffer, 'image.png');
    formData.append('size', 'auto');
    formData.append('format', 'png');

    const removeBgResponse = await axios({
      method: 'post',
      url: 'https://api.remove.bg/v1.0/removebg',
      data: formData,
      headers: {
        ...formData.getHeaders(),
        'X-Api-Key': process.env.REMOVEBG_API_KEY,
      },
      responseType: 'arraybuffer'
    });

    const cleanedBuffer = Buffer.from(removeBgResponse.data);

    // Process and resize the image
    const processedBuffer = await sharp(cleanedBuffer)
      .resize(50, 50, { 
        fit: 'inside',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .flatten({ background: '#D2D7EB' }) // Apply the color as background
      .png()
      .toBuffer();

    // Convert to base64 for display
    const base64Image = processedBuffer.toString('base64');
    
    // Create a simple SVG with embedded image (temporary solution)
    const svg = `<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
      <image href="data:image/png;base64,${base64Image}" width="50" height="50" />
    </svg>`;

    res.status(200).json({ 
      success: true, 
      svg: svg
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    
    let errorMessage = 'Failed to process image.';
    if (error.response?.status === 402) {
      errorMessage = 'Remove.bg credits exhausted. Please check your account.';
    } else if (error.response?.status === 403) {
      errorMessage = 'Remove.bg API key is invalid.';
    } else if (error.response?.data?.errors) {
      errorMessage = error.response.data.errors[0]?.title || errorMessage;
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage
    });
  }
};
