#!/usr/bin/env python3
"""
FastAPI Image Generation Service using Ollama
Generates images for blog posts and saves them locally
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import base64
import uuid

app = FastAPI(title="Image Generation API", version="1.0.0")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration from environment
OLLAMA_API_KEY = os.environ["OLLAMA_API_KEY"]
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "https://api.ollama.ai/v1")
IMAGES_DIR = Path(__file__).parent.parent / "public" / "images" / "generated"
TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]

# Ensure images directory exists
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

class ImageRequest(BaseModel):
    """Request model for image generation"""
    prompt: str = Field(..., description="Image generation prompt")
    title: str = Field(..., description="Title of the blog post")
    category: str = Field(..., description="Category of the post")
    keywords: list[str] = Field(..., description="Keywords for the image")
    width: Optional[int] = Field(1200, description="Image width")
    height: Optional[int] = Field(630, description="Image height")
    style: Optional[str] = Field("modern", description="Image style")

class ContactRequest(BaseModel):
    """Request model for contact form submission"""
    name: str = Field(..., description="Full name")
    email: str = Field(..., description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    message: str = Field(..., description="Message content")
    timestamp: Optional[str] = None

class ImageResponse(BaseModel):
    """Response model for generated image"""
    success: bool
    image_path: Optional[str] = None
    image_url: Optional[str] = None
    error: Optional[str] = None
    filename: Optional[str] = None

def generate_enhanced_prompt(image_request: ImageRequest) -> str:
    """Generate enhanced prompt based on style and content"""
    style_guidelines = {
        "modern": "modern tech design, clean lines, gradient colors (purple #667eea to cyan #06b6d4), minimalist, professional, high quality, 4k, digital art",
        "minimal": "minimalist design, white space, simple geometric shapes, monochrome with accent color, elegant, clean, professional",
        "colorful": "vibrant colors, dynamic composition, energetic, bold gradients, creative, eye-catching, modern",
        "dark": "dark theme, neon accents, cyberpunk style, high contrast, sleek, futuristic, professional"
    }
    
    base_prompt = f"""Professional tech blog header image for article about "{image_request.title}".
Category: {image_request.category}.
Keywords: {', '.join(image_request.keywords[:4])}."""
    
    if image_request.style in style_guidelines:
        enhanced = f"""{base_prompt}
Style requirements: {style_guidelines[image_request.style]}.
Include: code elements, tech icons, abstract visualization, modern design.
No text, no words, no watermarks, no blurry elements.
High quality, professional, suitable for SEO blog."""
    else:
        enhanced = base_prompt
    
    return enhanced

async def send_telegram_notification(message: str):
    """Send notification to Telegram bot"""
    try:
        import aiohttp
        
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "HTML"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as response:
                if response.status != 200:
                    logger.error(f"Telegram API error: {await response.text()}")
                else:
                    logger.info("Telegram notification sent successfully")
    except Exception as e:
        logger.error(f"Failed to send Telegram notification: {str(e)}")

@app.post("/api/generate-image", response_model=ImageResponse)
async def generate_image(request: ImageRequest):
    """
    Generate image using Ollama API
    """
    try:
        logger.info(f"Generating image for: {request.title}")
        
        # Generate enhanced prompt
        enhanced_prompt = generate_enhanced_prompt(request)
        logger.info(f"Enhanced prompt: {enhanced_prompt[:100]}...")
        
        # Call Ollama API Image Generation
        # Note: Ollama might use different endpoint/payload structure
        # This is a template - adjust based on actual Ollama API docs
        import aiohttp
        
        headers = {
            "Authorization": f"Bearer {OLLAMA_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_title = ''.join(c for c in request.title if c.isalnum() or c in (' ', '-', '_')).rstrip()[:30]
        filename = f"{safe_title}_{timestamp}_{uuid.uuid4().hex[:8]}.jpg"
        filepath = IMAGES_DIR / filename
        
        # Try multiple approaches since Ollama API structure might vary
        payload_options = [
            {
                "model": "llava-llama3",  # or any image generation model
                "prompt": enhanced_prompt,
                "size": f"{request.width}x{request.height}",
                "quality": "high",
                "n": 1
            },
            {
                "model": "llava",
                "prompt": enhanced_prompt,
                "stream": False
            }
        ]
        
        image_url = None
        for payload in payload_options:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{OLLAMA_API_URL}/images/generations", 
                        json=payload, 
                        headers=headers
                    ) as response:
                        if response.status == 200:
                            response_data = await response.json()
                            # Try different response structures
                            image_url = (
                                response_data.get("data", [{}])[0].get("url") or
                                response_data.get("url") or
                                response_data.get("image_url")
                            )
                            if image_url:
                                break
            except Exception as e:
                logger.warning(f"Payload attempt failed: {str(e)}")
                continue
        
        if not image_url:
            # Try direct image generation endpoint (if different)
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{OLLAMA_API_URL}/generate",
                    json={"model": "llava", "prompt": enhanced_prompt},
                    headers=headers
                ) as response:
                    if response.status == 200:
                        response_data = await response.json()
                        # Ollama might return base64 encoded image
                        if "image" in response_data:
                            # Save base64 image
                            image_data = base64.b64decode(response_data["image"])
                            with open(filepath, 'wb') as f:
                                f.write(image_data)
                            
                            relative_path = f"/images/generated/{filename}"
                            
                            return ImageResponse(
                                success=True,
                                image_path=str(filepath),
                                image_url=relative_path,
                                filename=filename
                            )
        
        if not image_url:
            raise HTTPException(status_code=500, detail="Failed to generate image with Ollama")
        
        # Download and save image from URL
        async with aiohttp.ClientSession() as session:
            async with session.get(image_url) as response:
                if response.status != 200:
                    raise HTTPException(status_code=500, detail="Failed to download generated image")
                
                # Save to file
                content = await response.read()
                with open(filepath, 'wb') as f:
                    f.write(content)
        
        # Return relative path for web access
        relative_path = f"/images/generated/{filename}"
        
        logger.info(f"Image saved successfully: {filepath}")
        
        return ImageResponse(
            success=True,
            image_path=str(filepath),
            image_url=relative_path,
            filename=filename
        )
    
    except Exception as e:
        logger.error(f"Error generating image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

@app.post("/api/contact-notification")
async def contact_notification(request: ContactRequest):
    """
    Handle contact form submission and send to Telegram
    """
    try:
        # Add timestamp if not provided
        if not request.timestamp:
            request.timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Format message for Telegram
        message = f"""🔔 <b>צור קשר חדש!</b>

👤 <b>שם:</b> {request.name}
📧 <b>אימייל:</b> {request.email}
📱 <b>טלפון:</b> {request.phone or 'לא צוין'}
⏰ <b>זמן:</b> {request.timestamp}

💬 <b>הודעה:</b>
{request.message}

<a href="mailto:{request.email}">שלח אימייל</a> | <a href="https://wa.me/{request.phone.replace('-', '').replace(' ', '') if request.phone else ''}">וואטסאפ</a>
"""
        
        # Send to Telegram
        await send_telegram_notification(message)
        
        logger.info(f"Contact notification sent for: {request.name}")
        
        return {"success": True, "message": "Notification sent successfully"}
    
    except Exception as e:
        logger.error(f"Error sending contact notification: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")

@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "image-generation-api",
        "timestamp": datetime.now().isoformat(),
        "images_dir_exists": IMAGES_DIR.exists(),
        "api_key_configured": OLLAMA_API_KEY != "your-ollama-api-key",
        "telegram_configured": TELEGRAM_BOT_TOKEN != "" and TELEGRAM_CHAT_ID != ""
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Image Generation API with Ollama",
        "version": "1.0.0",
        "endpoints": {
            "generate_image": "POST /api/generate-image",
            "contact_notification": "POST /api/contact-notification",
            "health": "GET /api/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Image Generation API on http://0.0.0.0:8000")
    logger.info(f"Images directory: {IMAGES_DIR}")
    uvicorn.run(app, host="127.0.0.1", port=8000)
