# Quick Start Guide - Multi-Modal Summarizer

## 🚨 If you encountered dependency conflicts, follow this guide:

### Step 1: Navigate to the Python Backend
```bash
cd python_backend
```

### Step 2: Set Up Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Linux/MacOS:
source venv/bin/activate
```

### Step 3: Install Dependencies (Choose One Method)

#### Method A: Automated Setup (Recommended)
```bash
python setup.py
```

#### Method B: Alternative Requirements
```bash
pip install -r requirements-alternative.txt
pip install git+https://github.com/openai/CLIP.git
```

#### Method C: Manual Step-by-Step (If all else fails)
```bash
# Core packages
pip install torch==1.13.1 torchvision==0.14.1 torchaudio==0.13.1
pip install transformers==4.35.0 sentence-transformers==2.2.2
pip install fastapi==0.104.1 uvicorn==0.24.0

# Audio/Video processing
pip install openai-whisper opencv-python==4.8.1.78 
pip install yt-dlp librosa soundfile moviepy pillow

# CLIP model
pip install git+https://github.com/openai/CLIP.git

# Additional utilities
pip install numpy pandas scikit-learn python-dotenv pydantic
```

### Step 4: Test Installation
```bash
python quick_test.py --imports-only
```

### Step 5: Configure Environment
```bash
cp env_example.txt .env
# Edit .env file if needed
```

### Step 6: Start the Server
```bash
python start_server.py
```

### Step 7: Update Next.js Environment
Add to your `.env.local` file in the root directory:
```env
ML_BACKEND_URL=http://localhost:8000
```

### Step 8: Start Next.js
```bash
# In the root directory
npm run dev
```

## 🎉 You're Ready!

The multi-modal summarizer will now enhance your StreamSmart experience with:
- **Audio transcription** using Whisper
- **Visual understanding** using CLIP  
- **Enhanced summaries** using FLAN-T5
- **Improved mind maps** with visual insights

## 🔧 Troubleshooting

### If models fail to load:
- Check available disk space (need ~4GB for models)
- Ensure stable internet connection for initial downloads
- Try smaller models by editing `.env`:
  ```env
  WHISPER_MODEL_SIZE=tiny
  FLAN_T5_MODEL_NAME=google/flan-t5-base
  ```

### If processing is slow:
- Enable GPU if available
- Reduce frame extraction interval in `.env`:
  ```env
  FRAME_EXTRACTION_INTERVAL=60
  ```

### If backend is unreachable:
The system will automatically fall back to existing Gemini-based processing. No functionality is lost!

## 📞 Need Help?

1. Check logs in `python_backend/logs/`
2. Run diagnostics: `python quick_test.py --comprehensive`
3. Review the full setup guide: `MULTIMODAL_SETUP.md` 