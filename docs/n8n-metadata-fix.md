# n8n Workflow Metadata Fix Required

## Issue
When indexing files to Supabase `documents` table, the metadata does not include the `fileName` field, making it impossible to identify which file each chunk belongs to.

## Current Metadata Structure
```json
{
  "loc": {
    "lines": { "to": 101, "from": 98 }
  },
  "pdf": {
    "info": {
      "Creator": "PDFium",
      "Producer": "PDFium",
      "CreationDate": "D:20250911112655",
      "PDFFormatVersion": "1.7"
    },
    "totalPages": 4
  },
  "source": "blob",
  "blobType": "application/pdf"
}
```

## Required Metadata Structure
```json
{
  "fileName": "TecAce_Intro_client_202509_v.0.0.4.pdf",  // ← ADD THIS!
  "source": "supabase-storage",  // ← Change from "blob"
  "chunkIndex": 0,  // ← ADD THIS! (0, 1, 2, ...)
  "loc": {
    "lines": { "to": 101, "from": 98 }
  },
  "pdf": {
    "info": { ... }
  },
  "blobType": "application/pdf"
}
```

## What n8n Needs to Do

### 1. Receive fileName from Frontend
The frontend already sends this data to the n8n webhook:
```json
{
  "fileUrl": "https://...",
  "fileName": "TecAce_Intro_client_202509_v.0.0.4.pdf",
  "source": "supabase-storage"
}
```

### 2. Include fileName in Each Chunk's Metadata
When saving to Supabase `documents` table, include:
- `fileName`: The original filename from the request
- `source`: "supabase-storage" (not "blob")
- `chunkIndex`: Sequential number for each chunk (0, 1, 2, ...)

### 3. Example n8n Workflow Update

**Current (Wrong):**
```javascript
// In n8n Supabase node
{
  content: chunkText,
  metadata: {
    loc: { lines: { from: 1, to: 25 } },
    pdf: pdfMetadata,
    source: "blob",  // ❌ Not helpful
    blobType: "application/pdf"
  },
  embedding: vectorEmbedding
}
```

**Required (Correct):**
```javascript
// In n8n Supabase node
{
  content: chunkText,
  metadata: {
    fileName: fileName,  // ✅ From webhook input
    source: "supabase-storage",  // ✅ From webhook input
    chunkIndex: index,  // ✅ 0, 1, 2, ...
    loc: { lines: { from: 1, to: 25 } },
    pdf: pdfMetadata,
    blobType: "application/pdf"
  },
  embedding: vectorEmbedding
}
```

## Impact
Without this fix:
- ❌ Frontend cannot display which file each chunk belongs to
- ❌ Cannot determine sync status between File Library and Knowledge Index
- ❌ Cannot re-index specific files
- ❌ Shows "Unknown" for all file names

## Priority
🔴 **HIGH** - This is blocking the Knowledge Management feature from working properly.

## Testing
After the fix, verify:
1. Upload a file (e.g., "test.pdf")
2. Index it via n8n
3. Check Supabase `documents` table
4. Verify `metadata.fileName` = "test.pdf"
5. Verify `metadata.chunkIndex` = 0, 1, 2, ...
6. Frontend should display the correct file name in Knowledge Index

