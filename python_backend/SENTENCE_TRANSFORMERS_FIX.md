# Quick Fix for sentence_transformers Import Error

## Problem
The error you're seeing:
```
2025-09-01 13:17:04,180 - __main__ - ERROR - Missing required packages: sentence_transformers
```

Is caused by a compatibility issue between `sentence-transformers` 2.2.2 and newer versions of `huggingface_hub`. The `cached_download` function was deprecated and replaced with `hf_hub_download`.

## Solution Applied

The `start_server.py` has been updated with a compatibility patch that automatically fixes this issue. The patch adds the deprecated `cached_download` function back as an alias to `hf_hub_download`.

## Quick Installation Commands

If you're starting fresh, run these commands:

```bash
# Navigate to python_backend directory
cd python_backend

# Install core dependencies (with network retries if needed)
pip install fastapi==0.104.1 uvicorn[standard]==0.24.0
pip install "numpy>=1.24.0,<2.0.0"
pip install transformers==4.35.2

# For sentence-transformers, either use the older compatible version:
pip install sentence-transformers==2.2.2 "huggingface_hub<0.20"

# OR upgrade to newer compatible versions:
pip install "sentence-transformers>=2.3.0" "huggingface_hub>=0.20.0"

# Install remaining requirements
pip install -r requirements.txt
```

## Testing the Fix

After installation, test with:
```bash
python start_server.py
```

The server should now start successfully with the compatibility patch applied automatically.

## What the Fix Does

1. **Compatibility Patch**: Automatically detects if `cached_download` is missing and adds it back as an alias
2. **Graceful Fallbacks**: Optional packages like `whisper_timestamped` are handled gracefully
3. **NumPy Compatibility**: Ensures NumPy < 2.0 for TensorFlow compatibility

The fix is minimal and surgical, addressing only the specific compatibility issue without breaking existing functionality.