with open('python_backend/services/multimodal_summarizer.py', 'r') as f:
    content = f.read()
content = content.replace(
    'genai.configure(api_key=api_key)\n            self.gemini_model = genai.GenerativeModel(\'gemini-1.5-flash-latest\') # Using a known versatile model\n            logger.info("Gemini API configured and model initialized successfully.")\n        self._ready = True',
    'genai.configure(api_key=api_key)\n            self.gemini_model = genai.GenerativeModel(\'gemini-1.5-flash-latest\') # Using a known versatile model\n            logger.info("Gemini API configured and model initialized successfully.")\n            self._ready = True'
)
with open('python_backend/services/multimodal_summarizer.py', 'w') as f:
    f.write(content)
print('File fixed successfully') 