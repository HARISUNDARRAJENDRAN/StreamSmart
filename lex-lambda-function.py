"""
Amazon Lex Lambda Function for StreamSmart RAG Chatbot
This function acts as the fulfillment handler for Lex, forwarding queries to the backend API.

Deploy this as a Lambda function and configure it as the fulfillment for your Lex bot.
"""

import json
import os
import urllib.request
import urllib.parse
import urllib.error

# Environment variable - set this to your ALB DNS or backend URL
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://your-alb-dns.amazonaws.com')

def lambda_handler(event, context):
    """
    Main handler for Lex bot requests
    
    Event structure:
    - sessionState.intent.name: Intent name (e.g., "RAGQueryIntent")
    - sessionState.intent.slots: User input slots
    - sessionAttributes: Session state data
    """
    
    try:
        # Extract user query from Lex event
        intent_name = event['sessionState']['intent']['name']
        slots = event['sessionState']['intent']['slots']
        session_attributes = event.get('sessionAttributes', {})
        
        # Get the query from slots
        query_slot = slots.get('query', {})
        if not query_slot or 'value' not in query_slot:
            return build_response(
                event,
                "I didn't catch that. Could you please rephrase your question?",
                'Failed'
            )
        
        query = query_slot['value']['interpretedValue']
        
        # Get userId from session attributes or use a default
        user_id = session_attributes.get('userId', 'anonymous')
        
        print(f"Processing query for user {user_id}: {query}")
        
        # Call backend RAG endpoint
        response_text, sources = call_backend_rag(query, user_id)
        
        # Format response with sources if available
        if sources:
            source_text = "\n\nSources:\n" + "\n".join([
                f"- {source['videoTitle']} (Score: {source.get('score', 'N/A')})"
                for source in sources[:3]  # Show top 3 sources
            ])
            response_text += source_text
        
        return build_response(event, response_text, 'Fulfilled')
        
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return build_response(
            event,
            "I encountered an error processing your request. Please try again.",
            'Failed'
        )


def call_backend_rag(query, user_id):
    """
    Call the backend RAG API endpoint
    
    Args:
        query: User's question
        user_id: User identifier
        
    Returns:
        tuple: (answer_text, sources_list)
    """
    
    # Prepare request
    url = f"{BACKEND_URL}/rag-answer"
    data = json.dumps({
        'userId': user_id,
        'question': query,
        'videoIds': None  # Search across all videos
    }).encode('utf-8')
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    # Make request
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            # Extract answer and sources
            answer = result.get('answer', 'I could not find relevant information.')
            sources = result.get('sources', [])
            
            return answer, sources
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"Backend returned error {e.code}: {error_body}")
        
        # Fallback response
        return "I'm having trouble accessing the knowledge base. Please try again later.", []
        
    except urllib.error.URLError as e:
        print(f"Network error: {str(e)}")
        return "I'm unable to connect to the backend service right now.", []
        
    except Exception as e:
        print(f"Unexpected error calling backend: {str(e)}")
        return "An unexpected error occurred. Please try again.", []


def build_response(event, message, fulfillment_state):
    """
    Build a Lex response
    
    Args:
        event: Original Lex event
        message: Response message to user
        fulfillment_state: 'Fulfilled' or 'Failed'
        
    Returns:
        dict: Lex response structure
    """
    
    intent = event['sessionState']['intent']
    session_attributes = event.get('sessionAttributes', {})
    
    return {
        'sessionState': {
            'sessionAttributes': session_attributes,
            'dialogAction': {
                'type': 'Close'
            },
            'intent': {
                'name': intent['name'],
                'state': fulfillment_state
            }
        },
        'messages': [
            {
                'contentType': 'PlainText',
                'content': message
            }
        ]
    }


# Alternative handler for streaming responses (if needed)
def lambda_handler_streaming(event, context):
    """
    Alternative handler that supports streaming responses
    Use this if your backend supports Server-Sent Events or WebSocket
    """
    
    # Similar structure but with response streaming
    # Implementation depends on your specific requirements
    pass


# Test function for local development
if __name__ == "__main__":
    # Test event structure
    test_event = {
        'sessionState': {
            'intent': {
                'name': 'RAGQueryIntent',
                'slots': {
                    'query': {
                        'value': {
                            'interpretedValue': 'What is machine learning?'
                        }
                    }
                }
            }
        },
        'sessionAttributes': {
            'userId': 'test-user-123'
        }
    }
    
    # Override BACKEND_URL for testing
    os.environ['BACKEND_URL'] = 'http://localhost:8000'
    
    # Test the handler
    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))
