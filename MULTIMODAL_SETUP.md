# Multi-Modal Summarizer Setup Guide

This guide will help you set up the enhanced multi-modal summarizer that combines audio transcription (Whisper), visual understanding (CLIP), and advanced summarization (FLAN-T5) for StreamSmart.

## Overview

The multi-modal summarizer consists of:

1. **Stage 1**: Audio transcription using OpenAI's Whisper model
2. **Stage 2**: Visual feature extraction using CLIP model  
3. **Stage 3**: Multi-modal feature fusion using neural networks
4. **Stage 4**: Enhanced summarization using FLAN-T5

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │───▶│  Python Backend │───▶│   ML Models     │
│  (Frontend)     │    │   (FastAPI)     │    │ Whisper + CLIP  │
└─────────────────┘    └─────────────────┘    │   + FLAN-T5     │
                                              └─────────────────┘
```

## Prerequisites

- Python 3.8+ with pip
- CUDA-compatible GPU (recommended) or CPU
- Node.js 18+ for the frontend
- 8GB+ RAM (16GB+ recommended for GPU)
- FFmpeg installed on your system

## Installation

### 1. Install System Dependencies

#### Windows:
```bash
# Install FFmpeg
winget install FFmpeg

# Install Python (if not already installed)
winget install Python.Python.3.11
```

#### Linux/MacOS:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg python3 python3-pip

# MacOS
brew install ffmpeg python@3.11
```

### 2. Set Up Python Backend

```bash
# Navigate to the python backend directory
cd python_backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/MacOS:
source venv/bin/activate

# Run automated setup (recommended)
python setup.py

# OR install manually if setup.py fails:
pip install -r requirements.txt

# If you encounter dependency conflicts, try:
pip install -r requirements-alternative.txt
pip install git+https://github.com/openai/CLIP.git

# Copy environment configuration
cp env_example.txt .env
```

### 3. Configure Environment Variables

Edit the `.env` file in the `python_backend` directory:

```env
# Model configurations
WHISPER_MODEL_SIZE=base
CLIP_MODEL_NAME=ViT-B/32
FLAN_T5_MODEL_NAME=google/flan-t5-large

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000

# Processing configurations
MAX_VIDEO_DURATION=7200
FRAME_EXTRACTION_INTERVAL=30
MAX_CONCURRENT_REQUESTS=3

# Cache settings
CACHE_DIR=./cache
TEMP_DIR=./temp

# Logging
LOG_LEVEL=INFO
```

### 4. Update Next.js Environment

Add the following to your `.env.local` file in the root directory:

```env
# Multi-modal backend URL
ML_BACKEND_URL=http://localhost:8000
```

## Running the Application

### 1. Start the Python Backend

```bash
cd python_backend
python start_server.py
```

The backend will start on `http://localhost:8000`. You should see:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2. Start the Next.js Frontend

In a new terminal:
```bash
npm run dev
```

## Model Downloads

The first time you run the application, the following models will be downloaded automatically:

- **Whisper Base Model**: ~244MB
- **CLIP ViT-B/32**: ~605MB  
- **FLAN-T5 Large**: ~3GB

Ensure you have sufficient disk space and a stable internet connection for the initial setup.

## Usage

### Basic Usage

1. Upload a video or add a YouTube URL to a playlist
2. The system will automatically detect if the ML backend is available
3. If available, it will process the video using multi-modal analysis
4. Enhanced summaries and mind maps will include visual insights

### API Endpoints

The Python backend provides these endpoints:

- `GET /health` - Check backend status
- `POST /process-video` - Full multi-modal processing
- `POST /extract-transcript` - Audio transcription only
- `POST /extract-visual-features` - Visual analysis only

### Integration Points

The multi-modal features integrate with:

- **Mind Maps**: Enhanced with visual and temporal insights
- **Video Summaries**: Include visual analysis and timestamp highlights
- **Q&A System**: Uses richer context from multi-modal analysis

## Performance Optimization

### GPU Acceleration

If you have a CUDA-compatible GPU:

```bash
# Install PyTorch with CUDA support
pip uninstall torch torchvision torchaudio
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### Model Size Optimization

For lower-end systems, use smaller models:

```env
WHISPER_MODEL_SIZE=tiny
FLAN_T5_MODEL_NAME=google/flan-t5-base
```

### Processing Limits

Configure processing limits based on your system:

```env
MAX_VIDEO_DURATION=3600  # 1 hour max
FRAME_EXTRACTION_INTERVAL=60  # Extract fewer frames
MAX_CONCURRENT_REQUESTS=1  # Process one video at a time
```

## Troubleshooting

### Common Issues

1. **Dependency conflicts during installation**:
   - Error: "Cannot install torch>=2.0.0 and clip-by-openai because these package versions have conflicting dependencies"
   - Solution: Use the alternative requirements: `pip install -r requirements-alternative.txt`
   - Then install CLIP manually: `pip install git+https://github.com/openai/CLIP.git`
   - Or run the automated setup: `python setup.py`

2. **Backend not starting**:
   - Check Python dependencies: `pip list`
   - Verify FFmpeg installation: `ffmpeg -version`
   - Check port availability: `netstat -an | findstr 8000`

2. **Out of memory errors**:
   - Reduce model sizes (see optimization section)
   - Increase system RAM or virtual memory
   - Process shorter videos

3. **Slow processing**:
   - Enable GPU acceleration
   - Reduce frame extraction frequency
   - Use smaller model variants

4. **Model download failures**:
   - Check internet connection
   - Verify disk space
   - Try manual model download:
     ```python
     import whisper
     import clip
     from transformers import T5Tokenizer, T5ForConditionalGeneration
     
     whisper.load_model("base")
     clip.load("ViT-B/32")
     T5Tokenizer.from_pretrained("google/flan-t5-large")
     T5ForConditionalGeneration.from_pretrained("google/flan-t5-large")
     ```

### Debug Mode

Enable verbose logging:

```env
LOG_LEVEL=DEBUG
```

Check logs in the `python_backend/logs/` directory.

### Fallback Mode

If the ML backend is unavailable, the system automatically falls back to the existing Gemini-based processing. No features are lost, but enhanced multi-modal insights won't be available.

## Fine-tuning (Advanced)

### FLAN-T5 Fine-tuning

To fine-tune the FLAN-T5 model for your specific domain:

1. Prepare training data in the format:
   ```json
   {
     "input": "multi-modal context + visual insights + transcript",
     "target": "ideal summary with visual understanding"
   }
   ```

2. Use the training script:
   ```bash
   python fine_tune_flan_t5.py --data_path training_data.json --output_dir ./fine_tuned_model
   ```

3. Update the model configuration:
   ```env
   FLAN_T5_MODEL_NAME=./fine_tuned_model
   ```

### Custom Models

You can replace any of the models by updating the configuration:

```env
WHISPER_MODEL_SIZE=large-v2  # For better transcription
CLIP_MODEL_NAME=ViT-L/14     # For better visual understanding
```

## Monitoring and Logs

### Health Monitoring

Check backend health:
```bash
curl http://localhost:8000/health
```

### Performance Metrics

The system provides processing statistics:
- Transcription accuracy scores
- Visual-text alignment scores  
- Processing time metrics
- Memory usage statistics

### Log Analysis

Key log locations:
- Backend logs: `python_backend/logs/`
- Processing errors: Check console output
- Model loading: Monitor first startup

## Security Considerations

1. **API Access**: The backend runs locally by default
2. **File Handling**: Temporary files are cleaned up automatically
3. **Resource Limits**: Configure appropriate limits for your system
4. **Data Privacy**: All processing happens locally

## Contributing

To contribute to the multi-modal features:

1. Follow the existing code structure
2. Add tests for new functionality
3. Update documentation
4. Ensure compatibility with fallback modes

## Support

For issues related to:
- **Model Performance**: Check hardware requirements
- **Integration**: Verify environment variables
- **Processing Errors**: Check logs and system resources

The system is designed to be robust with automatic fallbacks, ensuring StreamSmart continues to work even if the ML backend encounters issues. 