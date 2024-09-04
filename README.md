## Overview
CreatorEvolve is an AI-powered platform designed to enhance the productivity of content creators. It offers a suite of tools including a Shorts/Reel Generator, Image Generator, Thumbnail Generator, Research Wizard, and Audio Features (Voice Cloning, Voice Dubbing, Voice Enhancer, Voice Changer). Additionally, it includes a YouTube Optimizer with features like Subtitle Generator, Description Generator, Hashtag Generator, Chapter Generator, Tag Generator, and Thumbnail Generator. The platform also provides built-in features for editing generated images and thumbnails using Inpaint or custom editing tools.

### Key Features

- **REST API**: Provides a robust API for interacting with frontend services.
- **YouTube Integration**: Google APIs for YouTube authorization, upload, and update.
- **Video Processing**: FFmpeg for adding subtitles, breaking videos into chunks, and other video operations.
- **Authentication**: JWT-based authentication with SSO sign-in/signup via Google.
- **Email Verification**: OTP-based email verification.
- **Media Handling**: AWS S3 integration for media storage.

### Technologies & Tools

- **Framework**: NestJS
- **Database**: MongoDB (via Mongoose)
- **Video Processing**: FFmpeg (local install required)
- **Queuing**: Bull for handling background jobs
- **Cloud Services**: AWS SDK for media handling, Google APIs for YouTube
- **File Handling**: Multer

### Setup and Installation

1. **Clone the Repository**:
    `git clone https://github.com/Creator-Evolve/server`
    
2. **Install Dependencies**:
    `npm ci / npm i`
    
3. **Run the Development Server**:
    `npm run dev`
    
4. **FFmpeg Configuration**:
    - Ensure you have the full version of FFmpeg installed locally to enable video processing features.
