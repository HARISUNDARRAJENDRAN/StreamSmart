
user -> DashBoard ->creates playlists -> Loads up the video 

Section A: Data Ingestion & Storage Pipeline (Knowledge Base
Preparation)

This pipeline runs asynchronously to create the external knowledge
source that will ground the system’s responses, ensuring accuracy and
currency.

1. Raw YouTube Transcripts: Source Data. Unstructured text content
extracted from video transcripts using yt-dlp; this forms the factual basis of the
knowledge base.
2. Amazon S3: Staging/Storage. Provides durable and scalable cloud
storage for the raw transcript files.
3. AWS Titan Embeddings: Vectorization. The machine learning model
responsible for converting the raw text into dense, numerical arrays
(vectors) that capture the semantic meaning.
4. Embedded Vectors: Numerical Representation. The output of the
embedding process; these are the units stored for efficient semantic
searching.
5. Index Vectors: Storage Action. The process of writing the newly
created vectors into the vector database.
6. Amazon OpenSearch Service: Vector Database. Indexes and stores the
vectors, enabling fast and efficient similarity (vector) searches.
7. Search OpenSearch Index: Retrieval Preparation. Represents the
capability to quickly locate relevant document chunks within the
vector database

Section B: Live Query Flow (The RAG Execution)
This real-time flow is executed every time a user requests information,
synthesizing an answer from the prepared knowledge base.

### User Interface & Initiation
1. User types/speaks Query: Input. The user initiates the system with a
question or command.
2. Amazon Lex: Interface/Trigger. Captures the user input, interprets the intent, and initiates the RAG workflow by invoking the backend Lambda function.


### Lambda & LLM Core
1. AWS Lambda: Orchestration Core. The serverless function that manages and coordinates the entire RAG business logic.
2. Embed Query: Query Vectorization. The user’s question is converted
into a vector, enabling a mathematical comparison with the stored document vectors.
3. Retrieve & Rank Documents: Retrieval Step. The query vector is searched against the OpenSearch index to fetch the most semantically relevant source document chunks (context).
4. Build Prompt with Citations: Prompt Engineering. The function combines the original query, the retrieved context, and specific LLM instructions into a detailed prompt, ensuring the final answer is cited and grounded.
5. Call External LLM : Generation Step. The augmented prompt is sent to the Large Language Model to synthesize a factual and coherent answer.
6. The Large Language Model that performs the final text generation.

Section C: AWS Service Mapping (Implementation Details)

Backend integration now uses managed AWS services to keep the RAG loop reliable and scalable:

1. Transcript Storage on Amazon S3
    - Bucket: Configure `AWS_RAG_S3_BUCKET` in `.env`.
    - Each processed video transcript is uploaded under `transcripts/{userId}/{videoId}.txt`.
    - Versioned storage protects against accidental overwrites and allows re-indexing.

2. Embeddings via Amazon Bedrock (Titan)
    - Model: `amazon.titan-embed-text-v2` (override with `AWS_RAG_EMBED_MODEL`).
    - The FastAPI backend calls Bedrock Runtime to convert each transcript chunk into a dense vector.
    - Vector dimensionality is detected automatically when the first chunk is embedded.

3. Vector Indexing in Amazon OpenSearch Service
    - Endpoint is supplied with `AWS_RAG_OPENSEARCH_ENDPOINT`; index defaults to `streamsmart-rag-chunks`.
    - The backend creates an HNSW-based `knn_vector` mapping that stores: user id, video id, source URL, chunk text, and the Titan vector.
    - Every chunk is written with document id format `{userId}:{videoId}:{chunkNumber}` allowing idempotent reprocessing.

4. Retrieval Flow
    - User questions are embedded through Titan again and searched with a k-nearest-neighbours query against OpenSearch.
    - Results are filtered by the authenticated user and optional video id filters before building the prompt context.

5. Answer Generation through Amazon Bedrock Text
    - Model: `amazon.titan-text-express-v1` (override with `AWS_RAG_LLM_MODEL`).
    - The backend assembles a grounded prompt with numbered `[Source N]` snippets and generates a citation-aware response.
    - Responses and source metadata are returned to the frontend, while error handling falls back to legacy flows when AWS is unavailable.

6. Required Environment Variables
    - `AWS_REGION`: Region hosting Bedrock and OpenSearch.
    - `AWS_RAG_S3_BUCKET`: S3 bucket for transcript artifacts.
    - `AWS_RAG_OPENSEARCH_ENDPOINT`: Domain endpoint without protocol.
    - `AWS_RAG_OPENSEARCH_INDEX`: (Optional) Override for the vector index name.
    - `AWS_RAG_EMBED_MODEL`: (Optional) Bedrock embedding model id.
    - `AWS_RAG_LLM_MODEL`: (Optional) Bedrock text generation model id.

With these values in place, `/process-videos` now uploads transcripts to S3, indexes Titan embeddings into OpenSearch, and `/rag-answer` serves responses solely from the managed AWS stack. If configuration is missing, the system reverts to the legacy Gemini-based fallback so development environments remain usable.