# Logo Processor API

This API removes backgrounds from logos, converts them to SVG format, applies a specific color (#D2D7EB), and resizes them to a maximum of 50x50 pixels.

## Setup Instructions

### 1. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click "Add New..." → "Project"
3. Import this repository (`logo-processor-api`)
4. Add environment variable:
   - Name: `REMOVEBG_API_KEY`
   - Value: Your Remove.bg API key (get it from [remove.bg/api](https://www.remove.bg/api))
5. Click "Deploy"

### 2. Get Your API Endpoint

After deployment, your API endpoint will be:
```
https://your-project-name.vercel.app/api/process-logo
```

### 3. Add to Webflow

Copy the embed code from the `webflow-embed.html` file in this repository and:
1. Replace `YOUR_VERCEL_URL_HERE` with your actual Vercel URL
2. Add it to your Webflow site using an Embed element

## API Usage

**Endpoint:** `POST /api/process-logo`

**Request Body:**
```json
{
  "image": "data:image/png;base64,..." // Base64 encoded image
}
```

**Response:**
```json
{
  "success": true,
  "svg": "<svg>...</svg>" // Processed SVG
}
```

## Features

- Removes background using Remove.bg API
- Converts to SVG format
- Applies color #D2D7EB
- Resizes to max 50x50 pixels
- Maintains aspect ratio

## Technologies Used

- Node.js
- Sharp (image processing)
- Potrace (SVG conversion)
- Remove.bg API
- Vercel Functions
