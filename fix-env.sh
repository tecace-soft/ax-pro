#!/bin/bash
if [ -f "apps/professor/.env.example" ]; then
  sed -i 's/VITE_OPENAI_API_KEY=sk-proj-[^[:space:]]*/VITE_OPENAI_API_KEY=your_openai_api_key_here/' apps/professor/.env.example
fi

