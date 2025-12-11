#!/usr/bin/env python3
"""
Extract transcripts from YouTube videos for translation history mock data
"""
import json
from youtube_transcript_api import YouTubeTranscriptApi

# Selected 5 unique lectures (avoiding deep learning 3-hour course)
videos = [
    {
        'id': 'CgSvahZkJmc',
        'title': '머신러닝 입문강의',
        'subject': 'machine-learning'
    },
    {
        'id': 'Adi0Iasehj8',
        'title': '딥러닝 강의 1편 - 컴퓨터 비전',
        'subject': 'computer-vision'
    },
    {
        'id': 'Q07Cy5McV5U',
        'title': '인공지능 개론',
        'subject': 'machine-learning'
    },
    {
        'id': '_NHmpQdB_u4',
        'title': 'Big Data Analysis in Sports',
        'subject': 'machine-learning'
    },
    {
        'id': 'bfHKPsrwupI',
        'title': '로지스틱 회귀분석',
        'subject': 'machine-learning'
    }
]

transcripts = {}
api = YouTubeTranscriptApi()

for video in videos:
    try:
        print(f"Extracting transcript for: {video['title']} ({video['id']})")
        # Try Korean first, then English
        transcript_list = None
        for lang in ['ko', 'en', 'en-US', 'en-GB']:
            try:
                transcript_list = api.fetch(video['id'], [lang])
                print(f"  Found transcript in language: {lang}")
                break
            except:
                continue
        
        if not transcript_list:
            raise Exception("No transcript found in available languages")
        
        # Get snippets from the fetched transcript
        snippets = transcript_list.snippets
        raw_data = transcript_list.to_raw_data()
        
        # Combine all transcript entries into full text
        full_text = ' '.join([entry['text'] for entry in raw_data])
        
        transcripts[video['id']] = {
            'title': video['title'],
            'subject': video['subject'],
            'language': transcript_list.language_code,
            'full_transcript': full_text,
            'entries': raw_data[:50]  # First 50 entries as samples
        }
        print(f"✓ Successfully extracted {len(raw_data)} entries")
    except Exception as e:
        print(f"✗ Error extracting {video['title']}: {str(e)}")
        transcripts[video['id']] = {
            'title': video['title'],
            'subject': video['subject'],
            'error': str(e)
        }

# Save to JSON file
with open('youtube_transcripts.json', 'w', encoding='utf-8') as f:
    json.dump(transcripts, f, ensure_ascii=False, indent=2)

print(f"\n✓ Saved transcripts to youtube_transcripts.json")
print(f"✓ Extracted {len([v for v in transcripts.values() if 'full_transcript' in v])} successful transcripts")

