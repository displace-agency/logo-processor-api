# Logo Processor API

This API removes backgrounds from logos, converts them to SVG format using Vectorizer.ai, applies a specific color (#D2D7EB), and resizes them to a maximum of 50x50 pixels.

## Setup Instructions

### 1. Get Your API Keys

#### Remove.bg API Key
1. Go to [remove.bg/users/sign_up](https://www.remove.bg/users/sign_up)
2. Create a free account
3. Go to [remove.bg/api](https://www.remove.bg/api)
4. Click "Get API Key" and copy it

#### Vectorizer.ai API Key
1. Go to [vectorizer.ai/api](https://vectorizer.ai/api)
2. Sign up for an account
3. Go to your dashboard
4. Copy your API key

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click "Add New..." → "Project"
3. Import this repository (`logo-processor-api`)
4. Add environment variables:
   - Name: `REMOVEBG_API_KEY`
   - Value: Your Remove.bg API key
   - Click "Add"
   - Name: `VECTORIZER_API_KEY`
   - Value: Your Vectorizer.ai API key
   - Click "Add"
5. Click "Deploy"

### 3. Get Your API Endpoint

After deployment, your API endpoint will be:
```
https://your-project-name.vercel.app/api/process-logo
```

### 4. Add to Webflow

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
- Converts to high-quality SVG using Vectorizer.ai
- Applies color #D2D7EB
- Resizes to max 50x50 pixels
- Maintains aspect ratio
- Handles complex logos with multiple colors and shapes

## Technologies Used

- Node.js
- Sharp (image processing)
- Vectorizer.ai (professional SVG conversion)
- Remove.bg API
- Vercel Functions

## Costs

- **Remove.bg**: 50 free images/month, then $0.20 per image
- **Vectorizer.ai**: Check their pricing at [vectorizer.ai/pricing](https://vectorizer.ai/pricing)
- **Vercel**: Free tier usually sufficient

## Troubleshooting

If you get "Failed to process image":
1. Check both API keys are set correctly in Vercel
2. Verify you haven't exceeded API limits
3. Check the Vercel function logs for detailed errors
