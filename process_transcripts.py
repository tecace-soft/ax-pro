#!/usr/bin/env python3
"""
Process YouTube transcripts into classroom dialogue format for translation history
"""
import json
import re
from typing import List, Dict

def split_into_sessions(entries: List[Dict], num_sessions: int = 5) -> List[List[Dict]]:
    """Split transcript entries into multiple sessions"""
    total = len(entries)
    per_session = total // num_sessions
    sessions = []
    for i in range(num_sessions):
        start = i * per_session
        end = start + per_session if i < num_sessions - 1 else total
        sessions.append(entries[start:end])
    return sessions

def extract_dialogue_segments(entries: List[Dict], min_length: int = 20, max_length: int = 200) -> List[str]:
    """Extract natural dialogue segments from transcript entries"""
    # Combine consecutive entries into longer sentences
    segments = []
    current_segment = ""
    
    for entry in entries:
        text = entry['text'].strip()
        if not text:
            continue
            
        # Add to current segment
        if current_segment:
            current_segment += " " + text
        else:
            current_segment = text
        
        # If segment is long enough, save it
        if len(current_segment) >= min_length:
            # Try to split at natural sentence boundaries
            sentences = re.split(r'[.!?]\s+', current_segment)
            for sentence in sentences[:-1]:  # All but last
                sentence = sentence.strip()
                if min_length <= len(sentence) <= max_length:
                    segments.append(sentence)
            
            # Keep last sentence for next segment
            current_segment = sentences[-1] if sentences else ""
    
    # Add final segment if long enough
    if len(current_segment) >= min_length:
        segments.append(current_segment)
    
    return segments[:30]  # Limit to 30 segments per session

def process_video_transcripts():
    """Process all video transcripts into structured format"""
    with open('youtube_transcripts.json', 'r', encoding='utf-8') as f:
        transcripts = json.load(f)
    
    processed = {}
    
    for video_id, info in transcripts.items():
        if 'error' in info or 'entries' not in info:
            continue
        
        entries = info['entries']
        if len(entries) < 50:  # Use full transcript if less than 50 entries
            entries = json.loads(open('youtube_transcripts.json', 'r', encoding='utf-8').read())[video_id].get('entries', entries)
        
        # Split into 5 sessions
        sessions = split_into_sessions(entries, 5)
        
        # Extract dialogue segments for each session
        session_dialogues = []
        for i, session_entries in enumerate(sessions):
            dialogues = extract_dialogue_segments(session_entries)
            session_dialogues.append({
                'session': i + 1,
                'segments': dialogues
            })
        
        processed[video_id] = {
            'title': info['title'],
            'subject': info['subject'],
            'sessions': session_dialogues
        }
    
    # Save processed data
    with open('processed_transcripts.json', 'w', encoding='utf-8') as f:
        json.dump(processed, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Processed {len(processed)} videos into session-based dialogues")
    for video_id, data in processed.items():
        total_segments = sum(len(s['segments']) for s in data['sessions'])
        print(f"  {data['title']}: {total_segments} segments across {len(data['sessions'])} sessions")

if __name__ == '__main__':
    process_video_transcripts()

