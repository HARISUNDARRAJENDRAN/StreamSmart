class TranscriptSummarizer:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"TranscriptSummarizer initialized. Device check: {self.device}.")
        self._ready = False
        self.gemini_model = None
        try:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.error("GEMINI_API_KEY environment variable not found.")
                raise ValueError("GEMINI_API_KEY not set.")
            
            genai.configure(api_key=api_key)
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash-latest')
            logger.info("Gemini API configured and model initialized successfully.")
            self._ready = True
        except ValueError as ve:
            logger.error(f"ValueError during Gemini initialization (e.g., API key missing or invalid): {ve}", exc_info=True)
        except Exception as e:
            logger.error(f"Error initializing Gemini API: {e}", exc_info=True) 