from python_backend.services.multimodal_summarizer import TranscriptSummarizer
import asyncio
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s')
logger = logging.getLogger(__name__)

async def test_summarizer():
    logger.info("Testing TranscriptSummarizer initialization...")
    summarizer = TranscriptSummarizer()
    
    if summarizer.is_ready():
        logger.info("TranscriptSummarizer initialized successfully!")
    else:
        logger.error("TranscriptSummarizer initialization failed.")
    
    return summarizer.is_ready()

if __name__ == "__main__":
    result = asyncio.run(test_summarizer())
    print(f"Test result: {'Success' if result else 'Failed'}") 