#!/usr/bin/env python3
"""
Dependency verification script following the problem statement guidelines
Tests compatibility and verifies NumPy < 2.0 for TensorFlow 2.15 compatibility
"""

import sys

def apply_compatibility_patches():
    """Apply compatibility patches for dependencies"""
    try:
        # Apply huggingface_hub compatibility patch for sentence-transformers
        from huggingface_hub import cached_download
        print("✅ cached_download already available")
    except ImportError:
        try:
            import huggingface_hub
            from huggingface_hub import hf_hub_download
            huggingface_hub.cached_download = hf_hub_download
            import sys
            sys.modules['huggingface_hub'].cached_download = hf_hub_download
            print("✅ Applied huggingface_hub compatibility patch")
        except Exception as e:
            print(f"❌ Could not apply huggingface_hub patch: {e}")

def test_numpy_version():
    """Test NumPy version is < 2.0 as required by TensorFlow 2.15"""
    try:
        import numpy
        version = numpy.__version__
        print(f"✅ NumPy version: {version}")
        
        if version.startswith('2.'):
            print("❌ WARNING: NumPy 2.x detected! This will cause issues with TensorFlow 2.15")
            print("   Solution: pip install \"numpy<2\"")
            return False
        else:
            print("✅ NumPy version compatible with TensorFlow 2.15")
            return True
    except ImportError:
        print("❌ NumPy not found")
        return False

def test_core_imports():
    """Test core package imports"""
    tests = [
        ("transformers", "Transformers"),
        ("sentence_transformers", "Sentence Transformers"),
        ("whisper_timestamped", "Whisper Timestamped"),
        ("torch", "PyTorch"),
        ("PIL", "Pillow"),
    ]
    
    all_passed = True
    for module, name in tests:
        try:
            __import__(module)
            print(f"✅ {name} - OK")
        except ImportError:
            print(f"❌ {name} - MISSING")
            all_passed = False
    
    return all_passed

def test_tensorflow_compatibility():
    """Test TensorFlow and ml-dtypes compatibility"""
    try:
        import tensorflow as tf
        print(f"✅ TensorFlow: {tf.__version__}")
        
        try:
            import ml_dtypes
            print(f"✅ ml-dtypes: {ml_dtypes.__version__}")
        except ImportError:
            print("⚠️  ml-dtypes not found (optional)")
        
        return True
    except ImportError:
        print("⚠️  TensorFlow not available (optional)")
        return True

def main():
    """Run all compatibility tests"""
    print("🔍 StreamSmart Dependency Compatibility Check")
    print("=" * 50)
    
    # Apply compatibility patches first
    print("\n0. Applying compatibility patches:")
    apply_compatibility_patches()
    
    results = []
    
    print("\n1. Testing NumPy version compatibility:")
    results.append(test_numpy_version())
    
    print("\n2. Testing core package imports:")
    results.append(test_core_imports())
    
    print("\n3. Testing TensorFlow compatibility:")
    results.append(test_tensorflow_compatibility())
    
    print("\n" + "=" * 50)
    if all(results):
        print("✅ All tests passed! Dependencies are compatible.")
        print("📝 NumPy < 2.0 constraint is working correctly.")
        return 0
    else:
        print("❌ Some tests failed. Check the output above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())