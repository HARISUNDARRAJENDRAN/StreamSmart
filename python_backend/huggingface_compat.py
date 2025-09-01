"""
Compatibility patch for sentence-transformers with newer huggingface_hub versions.
The cached_download function was deprecated and replaced with hf_hub_download.
"""

def apply_huggingface_compatibility_patch():
    """
    Apply compatibility patch for sentence-transformers to work with newer huggingface_hub versions.
    This adds the deprecated cached_download function back as an alias to hf_hub_download.
    """
    try:
        # Check if cached_download is already available
        from huggingface_hub import cached_download
        print("✅ cached_download already available")
        return True
    except ImportError:
        try:
            # Add cached_download as an alias to hf_hub_download
            import huggingface_hub
            from huggingface_hub import hf_hub_download
            
            # Add the cached_download function back for compatibility
            huggingface_hub.cached_download = hf_hub_download
            
            # Also make it available for direct import
            import sys
            sys.modules['huggingface_hub'].cached_download = hf_hub_download
            
            print("✅ Applied huggingface_hub compatibility patch")
            return True
        except Exception as e:
            print(f"❌ Failed to apply compatibility patch: {e}")
            return False

if __name__ == "__main__":
    apply_huggingface_compatibility_patch()