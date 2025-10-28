/**
 * Transcript Parser Utility
 * Functions to parse and format transcripts
 */

/**
 * Format timestamp to seconds
 */
function timestampToSeconds(timestamp) {
  const parts = timestamp.split(':').map(Number);
  
  if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  return 0;
}

/**
 * Format seconds to timestamp
 */
function secondsToTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Clean transcript text (remove extra spaces, special characters)
 */
function cleanTranscriptText(text) {
  return text
    .replace(/\s+/g, ' ')  // Multiple spaces to single space
    .replace(/[^\w\s.,!?-]/g, '')  // Remove special chars except punctuation
    .trim();
}

/**
 * Merge similar consecutive segments
 */
function mergeSegments(segments, threshold = 5) {
  if (!segments || segments.length === 0) return [];
  
  const merged = [];
  let current = { ...segments[0] };
  
  for (let i = 1; i < segments.length; i++) {
    const timeDiff = timestampToSeconds(segments[i].timestamp) - 
                     timestampToSeconds(current.timestamp);
    
    if (timeDiff < threshold) {
      // Merge with current segment
      current.text += ' ' + segments[i].text;
    } else {
      // Push current and start new segment
      merged.push(current);
      current = { ...segments[i] };
    }
  }
  
  // Push last segment
  if (current) {
    merged.push(current);
  }
  
  return merged.map(seg => ({
    ...seg,
    text: cleanTranscriptText(seg.text)
  }));
}

/**
 * Validate transcript structure
 */
function validateTranscript(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return { valid: false, error: 'No segments provided' };
  }
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    if (!segment.timestamp || !segment.text) {
      return { valid: false, error: `Segment ${i} missing timestamp or text` };
    }
    
    if (segment.text.trim().length === 0) {
      return { valid: false, error: `Segment ${i} has empty text` };
    }
  }
  
  return { valid: true };
}

/**
 * Export for use in content script
 */
if (typeof window !== 'undefined') {
  window.TranscriptParser = {
    timestampToSeconds,
    secondsToTimestamp,
    cleanTranscriptText,
    mergeSegments,
    validateTranscript
  };
}
