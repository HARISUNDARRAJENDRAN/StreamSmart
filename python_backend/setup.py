#!/usr/bin/env python3
"""
Setup script for StreamSmart Multi-Modal Backend
Handles dependency installation with fallbacks for common conflicts
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, capture_output=True):
    """Run a shell command and return the result"""
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=capture_output,
            text=True,
            check=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

def install_dependencies():
    """Install dependencies with fallback strategies"""
    print("🚀 Setting up StreamSmart Multi-Modal Backend...")
    
    # Try main requirements first
    print("\n📦 Attempting to install main requirements...")
    success, output = run_command("pip install -r requirements.txt")
    
    if success:
        print("✅ Main requirements installed successfully!")
        return True
    
    print("❌ Main requirements failed. Trying alternative approach...")
    print(f"Error: {output}")
    
    # Try alternative requirements
    print("\n📦 Attempting alternative requirements...")
    success, output = run_command("pip install -r requirements-alternative.txt")
    
    if not success:
        print("❌ Alternative requirements also failed.")
        print(f"Error: {output}")
        print("\n🔧 Trying manual installation...")
        return manual_installation()
    
    # Install CLIP manually
    print("\n🔗 Installing CLIP manually...")
    success, output = run_command("pip install git+https://github.com/openai/CLIP.git")
    
    if success:
        print("✅ Alternative setup completed successfully!")
        return True
    else:
        print("❌ CLIP installation failed. Trying manual approach...")
        return manual_installation()

def manual_installation():
    """Manual step-by-step installation following compatibility guidelines"""
    print("\n🛠️  Manual Installation Process")
    print("=" * 50)
    
    # First, ensure NumPy < 2.0 for TensorFlow compatibility
    print("📦 Installing compatible NumPy (< 2.0 for TensorFlow 2.15)...")
    success, output = run_command("pip install \"numpy<2\"")
    if not success:
        print(f"❌ Failed to install NumPy constraint")
        print(f"Error: {output}")
        return False
    
    # Core packages with compatible versions
    core_packages = [
        "torch==2.3.1",
        "torchvision==0.18.1", 
        "torchaudio==2.3.1",
        "tensorflow==2.15.*",
        "ml-dtypes<0.5",
        "transformers==4.35.2",
        "sentence-transformers==2.2.2",
        "fastapi==0.104.1",
        "uvicorn[standard]==0.24.0",
        "opencv-python==4.8.1.78",
        "pillow",
    ]
    
    print("Installing core packages...")
    for package in core_packages:
        print(f"Installing {package}...")
        success, output = run_command(f"pip install {package}")
        if not success:
            print(f"❌ Failed to install {package}")
            print(f"Error: {output}")
            print("\nPlease install manually with:")
            print(f"pip install {package}")
            return False
    
    # Try whisper-timestamped (required)
    print("\nInstalling Whisper with timestamps...")
    success, output = run_command("pip install whisper-timestamped")
    if not success:
        print("❌ whisper-timestamped installation failed")
        print("Trying regular whisper as fallback...")
        success, output = run_command("pip install openai-whisper")
        if not success:
            print("❌ Whisper installation failed")
            return False
    
    # Try CLIP
    print("\nInstalling CLIP...")
    success, output = run_command("pip install git+https://github.com/openai/CLIP.git")
    if not success:
        print("⚠️  CLIP installation failed. You may need to install it manually later.")
    
    # Additional packages
    additional_packages = [
        "yt-dlp",
        "librosa", 
        "soundfile",
        "moviepy",
        "python-dotenv",
        "pydantic",
        "pandas",
        "scikit-learn"
    ]
    
    print("\nInstalling additional packages...")
    for package in additional_packages:
        success, output = run_command(f"pip install {package}")
        if not success:
            print(f"⚠️  {package} installation failed - may not be critical")
    
    print("✅ Manual installation completed!")
    return True

def verify_installation():
    """Verify that key packages are installed"""
    print("\n🔍 Verifying installation...")
    
    required_imports = [
        ("torch", "PyTorch"),
        ("transformers", "Transformers"),
        ("fastapi", "FastAPI"),
        ("cv2", "OpenCV"),
        ("numpy", "NumPy"),
    ]
    
    all_good = True
    
    for module, name in required_imports:
        try:
            __import__(module)
            print(f"✅ {name} - OK")
        except ImportError:
            print(f"❌ {name} - MISSING")
            all_good = False
    
    # Check optional imports
    optional_imports = [
        ("clip", "CLIP"),
        ("whisper", "Whisper"),
        ("whisper_timestamped", "Whisper Timestamped"),
    ]
    
    for module, name in optional_imports:
        try:
            __import__(module)
            print(f"✅ {name} - OK")
        except ImportError:
            print(f"⚠️  {name} - MISSING (optional)")
    
    # Check NumPy version to ensure < 2.0 for TensorFlow compatibility
    try:
        import numpy
        numpy_version = numpy.__version__
        print(f"✅ NumPy version: {numpy_version}")
        if numpy_version.startswith('2.'):
            print("⚠️  WARNING: NumPy 2.x detected. This may cause issues with TensorFlow 2.15")
            print("Consider downgrading: pip install \"numpy<2\"")
        else:
            print("✅ NumPy version compatible with TensorFlow 2.15")
    except ImportError:
        print("❌ NumPy check failed")
    
    return all_good

def create_directories():
    """Create necessary directories"""
    print("\n📁 Creating directories...")
    directories = ['cache', 'temp', 'logs', 'models']
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ Created {directory}/")

def check_system_requirements():
    """Check system requirements"""
    print("\n🔧 Checking system requirements...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}")
    
    # Check FFmpeg
    success, _ = run_command("ffmpeg -version")
    if success:
        print("✅ FFmpeg found")
    else:
        print("❌ FFmpeg not found - please install FFmpeg")
        print("Windows: winget install FFmpeg")
        print("Mac: brew install ffmpeg")  
        print("Ubuntu: sudo apt install ffmpeg")
        return False
    
    return True

def main():
    """Main setup function"""
    print("=" * 60)
    print("   StreamSmart Multi-Modal Backend Setup")
    print("=" * 60)
    
    if not check_system_requirements():
        print("\n❌ System requirements not met. Please fix and try again.")
        return False
    
    if not install_dependencies():
        print("\n❌ Dependency installation failed.")
        print("\n💡 Manual steps to try:")
        print("1. Create a fresh virtual environment")
        print("2. Install PyTorch manually: pip install torch==1.13.1")
        print("3. Install other packages one by one")
        print("4. Install CLIP: pip install git+https://github.com/openai/CLIP.git")
        return False
    
    create_directories()
    
    if verify_installation():
        print("\n🎉 Setup completed successfully!")
        print("\nNext steps:")
        print("1. Copy env_example.txt to .env and configure")
        print("2. Run: python quick_test.py --imports-only")
        print("3. Start server: python start_server.py")
        return True
    else:
        print("\n⚠️  Setup completed with some missing packages.")
        print("The system may still work with reduced functionality.")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 