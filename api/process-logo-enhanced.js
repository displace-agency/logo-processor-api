const axios = require('axios');
const sharp = require('sharp');
const potrace = require('potrace');
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
    const vectorizationMode = req.body.mode || 'enhanced'; // 'simple' or 'enhanced'

    // Step 1: Remove background using Remove.bg
    const formData = new FormData();
    formData.append('image_file', imageBuffer, 'image.png');
    formData.append('size', 'auto');
    formData.append('format', 'png');
    formData.append('type', 'auto');

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

    // Step 2: Different approaches based on complexity
    let svg;
    
    if (vectorizationMode === 'enhanced') {
      // Enhanced mode: Better for complex logos with multiple colors
      // First, resize the image larger for better detail capture
      const enhancedBuffer = await sharp(cleanedBuffer)
        .resize(300, 300, { 
          fit: 'inside',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toBuffer();

      // Get image metadata to understand the logo better
      const metadata = await sharp(enhancedBuffer).metadata();
      
      // Apply different processing based on image characteristics
      const processedBuffer = await sharp(enhancedBuffer)
        .greyscale()
        .normalise() // Enhance contrast
        .threshold(128) // Binary threshold for cleaner edges
        .png()
        .toBuffer();

      // Use Potrace with optimized settings for complex shapes
      svg = await new Promise((resolve, reject) => {
        potrace.trace(processedBuffer, {
          color: '#D2D7EB',
          threshold: 0.5, // 0-1 range for threshold
          blackOnWhite: true,
          turdSize: 4, // Suppress small features
          alphaMax: 1.334, // Corner smoothing
          optCurve: true, // Optimize curves
          optTolerance: 0.2, // Curve optimization tolerance
          background: 'transparent'
        }, (err, svg) => {
          if (err) reject(err);
          else {
            // Clean up and resize the SVG
            let finalSvg = svg
              .replace(/<svg[^>]*>/, '<svg width="50" height="50" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">')
              .replace(/fill="[^"]*"/g, `fill="#D2D7EB"`); // Ensure color is applied
            
            resolve(finalSvg);
          }
        });
      });
    } else {
      // Simple mode: Original approach for simple logos
      const processedBuffer = await sharp(cleanedBuffer)
        .resize(200, 200, { 
          fit: 'inside',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .greyscale()
        .normalise()
        .png()
        .toBuffer();

      svg = await new Promise((resolve, reject) => {
        potrace.trace(processedBuffer, {
          color: '#D2D7EB',
          threshold: 100,
          blackOnWhite: false,
          turdSize: 2,
          optTolerance: 0.2,
          background: 'transparent'
        }, (err, svg) => {
          if (err) reject(err);
          else {
            const scaledSvg = svg.replace(
              /<svg[^>]*>/,
              '<svg width="50" height="50" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">'
            );
            resolve(scaledSvg);
          }
        });
      });
    }

    // Return the SVG
    res.status(200).json({ 
      success: true, 
      svg: svg,
      mode: vectorizationMode
    });

  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process image. Please ensure your Remove.bg API key is set correctly.' 
    });
  }
};
