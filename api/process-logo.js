const axios = require('axios');
const sharp = require('sharp');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // Enable CORS for your Webflow domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the image data from the request
    const imageBuffer = Buffer.from(req.body.image.split(',')[1], 'base64');

    // Step 1: Remove background using Remove.bg
    const removeBgFormData = new FormData();
    removeBgFormData.append('image_file', imageBuffer, 'image.png');
    removeBgFormData.append('size', 'auto');
    removeBgFormData.append('format', 'png');

    const removeBgResponse = await axios({
      method: 'post',
      url: 'https://api.remove.bg/v1.0/removebg',
      data: removeBgFormData,
      headers: {
        ...removeBgFormData.getHeaders(),
        'X-Api-Key': process.env.REMOVEBG_API_KEY,
      },
      responseType: 'arraybuffer'
    });

    const cleanedBuffer = Buffer.from(removeBgResponse.data);

    // Step 2: Resize image to max 50px before vectorization (saves API credits)
    const resizedBuffer = await sharp(cleanedBuffer)
      .resize(50, 50, { 
        fit: 'inside',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();

    // Step 3: Convert to SVG using Vectorizer.ai
    const vectorizerFormData = new FormData();
    vectorizerFormData.append('image', resizedBuffer, 'logo.png');
    
    // Vectorizer.ai settings for best logo results
    vectorizerFormData.append('mode', 'production');
    vectorizerFormData.append('output.file_format', 'svg');
    vectorizerFormData.append('output.size.unit', 'px');
    vectorizerFormData.append('output.size.width', '50');
    vectorizerFormData.append('output.size.height', '50');
    vectorizerFormData.append('processing.max_colors', '2'); // Limit colors for cleaner result
    vectorizerFormData.append('processing.min_area', '5'); // Remove tiny details
    vectorizerFormData.append('processing.simplify', '3'); // Simplify paths
    vectorizerFormData.append('processing.anti_aliased', 'auto');

    const vectorizerResponse = await axios({
      method: 'post',
      url: 'https://api.vectorizer.ai/v1/convert',
      data: vectorizerFormData,
      headers: {
        ...vectorizerFormData.getHeaders(),
        'Authorization': `Bearer ${process.env.VECTORIZER_API_KEY}`,
      },
      responseType: 'text'
    });

    let svg = vectorizerResponse.data;

    // Step 4: Apply the target color (#D2D7EB) to all paths
    svg = svg
      .replace(/fill="[^"]*"/g, `fill="#D2D7EB"`)
      .replace(/stroke="[^"]*"/g, `stroke="#D2D7EB"`)
      .replace(/style="[^"]*"/g, '') // Remove inline styles that might override
      .replace(/<svg([^>]*)>/, '<svg$1 fill="#D2D7EB">'); // Add default fill

    // Ensure proper dimensions
    if (!svg.includes('width="50"')) {
      svg = svg.replace(/<svg([^>]*)>/, '<svg$1 width="50" height="50" viewBox="0 0 50 50" preserveAspectRatio="xMidYMid meet">');
    }

    // Return the SVG
    res.status(200).json({ 
      success: true, 
      svg: svg
    });

  } catch (error) {
    console.error('Processing error:', error.response?.data || error.message);
    
    // Detailed error messages
    let errorMessage = 'Failed to process image.';
    if (error.response?.status === 401) {
      errorMessage = 'API authentication failed. Please check your API keys.';
    } else if (error.response?.status === 429) {
      errorMessage = 'API rate limit exceeded. Please try again later.';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage
    });
  }
};
