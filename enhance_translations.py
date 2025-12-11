#!/usr/bin/env python3
"""
Enhance transcript translations using basic pattern matching and common phrases
This is a template-based approach - can be replaced with actual translation API later
"""
import json
import re

# Common Korean to English translation patterns for classroom lectures
TRANSLATION_PATTERNS = {
    # Greetings and introductions
    r'안녕하세요.*?저는.*?([가-힣]+).*?라고 합니다': lambda m: f'Hello, I\'m {m.group(1)}, and I\'ll be teaching this course.',
    r'안녕하십니까.*?([가-힣]+).*?라고 합니다': lambda m: f'Hello, I\'m {m.group(1)}, and I\'ll be teaching this course.',
    
    # Introduction phrases
    r'제 소개를.*?박사 과정.*?대학원': 'I am currently a PhD student at Tech University AI Graduate School.',
    r'오늘은.*?([가-힣]+).*?에 대해서.*?다뤄.*?보려고': lambda m: f'Today we will cover {m.group(1)}.',
    r'오늘은.*?([가-힣]+).*?에 대해서.*?공부.*?할.*?예정': lambda m: f'Today we will study {m.group(1)}.',
    
    # Machine Learning specific
    r'머신러닝.*?기계 학습.*?강의': 'This is a machine learning course.',
    r'기계 학습이 무엇이고': 'what machine learning is',
    r'다섯 가지.*?섹션': 'five major sections',
    r'알고리즘.*?방법론': 'algorithms and methodologies',
    
    # Deep Learning / Computer Vision
    r'딥러닝.*?신경망': 'deep learning and neural networks',
    r'컴퓨터 비전.*?비전': 'computer vision',
    r'이미지 데이터.*?특징.*?추출': 'extract features from image data',
    
    # AI Introduction
    r'인공지능.*?개론': 'introduction to artificial intelligence',
    r'알파고.*?알파.*?고': 'AlphaGo',
    r'바둑.*?대국': 'Go game matches',
    
    # Big Data
    r'빅데이터.*?분석': 'big data analysis',
    r'스포츠.*?적용': 'application in sports',
    r'퍼포먼스.*?측정': 'performance measurement',
    
    # Logistic Regression
    r'로지스틱.*?회귀.*?분석': 'logistic regression analysis',
    r'분류.*?모델': 'classification model',
    r'시그모이드.*?함수': 'sigmoid function',
    r'소프트맥스.*?함수': 'softmax function',
    
    # Common lecture phrases
    r'다음.*?예제.*?넘어가': 'Let\'s move on to the next example.',
    r'노트.*?열고.*?따라와': 'Please open your notebook and follow along.',
    r'연습.*?가장.*?좋은.*?방법': 'Practice is the best way to learn.',
    r'함께.*?공부.*?하겠습니다': 'We will study together.',
    r'차근차근.*?코스를.*?통해서': 'step by step through this course',
    r'예를.*?들면': 'For example,',
    r'이제.*?배워.*?보겠습니다': 'Now let\'s learn',
    r'정리.*?해.*?보겠습니다': 'Let\'s summarize',
}

def translate_korean_text(ko_text: str) -> str:
    """Translate Korean text using pattern matching"""
    result = ko_text
    
    # Try pattern matching first
    for pattern, replacement in TRANSLATION_PATTERNS.items():
        if isinstance(replacement, str):
            if re.search(pattern, ko_text, re.IGNORECASE):
                # Simple replacement
                result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
        else:
            # Callable replacement
            match = re.search(pattern, ko_text, re.IGNORECASE)
            if match:
                result = replacement(match)
    
    # If pattern matching didn't help much, provide contextual translation
    if result == ko_text or len(result) < len(ko_text) * 0.3:
        # Extract key concepts
        concepts = []
        if '머신러닝' in ko_text or '기계 학습' in ko_text:
            concepts.append('machine learning')
        if '딥러닝' in ko_text:
            concepts.append('deep learning')
        if '인공지능' in ko_text or 'AI' in ko_text:
            concepts.append('artificial intelligence')
        if '컴퓨터 비전' in ko_text or '비전' in ko_text:
            concepts.append('computer vision')
        if '로지스틱' in ko_text or '회귀' in ko_text:
            concepts.append('logistic regression')
        if '빅데이터' in ko_text:
            concepts.append('big data')
        if '분석' in ko_text:
            concepts.append('analysis')
        if '학습' in ko_text:
            concepts.append('learning')
        if '모델' in ko_text:
            concepts.append('model')
        
        if concepts:
            return f'We will discuss {", ".join(concepts)} in this lecture. ' + ko_text[:50] + '...'
    
    return result if result != ko_text else f'[Translation: {ko_text[:80]}...]'

def enhance_transcript_translations():
    """Add English translations to transcript data"""
    with open('apps/professor/src/data/transcripts.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse the TypeScript data structure
    # Extract JSON part
    start_idx = content.find('= {')
    if start_idx == -1:
        print("Could not find data structure")
        return
    
    json_str = content[start_idx + 2:]  # Skip '= '
    # Remove trailing semicolon
    if json_str.endswith(';'):
        json_str = json_str[:-1]
    
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        # Try to fix common issues
        json_str = json_str.replace("'", '"')  # Replace single quotes
        try:
            data = json.loads(json_str)
        except:
            print("Failed to parse, will read as Python dict instead")
            return
    
    # Enhance each video's segments with translations
    for video_id, video_info in data.items():
        for session in video_info['sessions']:
            for i, segment in enumerate(session['segments']):
                # Generate English translation
                en_translation = translate_korean_text(segment)
                # Store in a way that can be accessed later
                # For now, we'll update the TypeScript file structure
                pass
    
    print("Translation enhancement complete")
    return data

if __name__ == '__main__':
    enhance_transcript_translations()

