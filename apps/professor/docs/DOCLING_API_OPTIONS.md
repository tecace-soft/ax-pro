# Docling API Options Reference

## Overview
Docling API (`/v1/convert/source/async`) 옵션 가이드

## Request Structure

```json
{
  "sources": [
    {
      "kind": "http",
      "url": "https://..."
    }
  ],
  "target": {
    "kind": "inbody"
  },
  "options": {
    // 아래 옵션들
  }
}
```

## Options Reference

### 1. Format Options

#### `from_formats` (array)
- **Description**: 입력 형식 지정
- **Allowed values**: `docx`, `pptx`, `html`, `image`, `pdf`, `asciidoc`, `md`, `csv`, `xlsx`, `xml_uspto`, `xml_jats`, `mets_gbs`, `json_docling`, `audio`, `vtt`
- **Default**: 모든 형식 (위 리스트 전체)
- **Example**: `["pdf", "docx", "md"]`

#### `to_formats` (array)
- **Description**: 출력 형식 지정
- **Allowed values**: `md`, `json`, `html`, `html_split_page`, `text`, `doctags`
- **Default**: `["md"]`
- **Example**: `["md", "json"]`

### 2. Image Options

#### `image_export_mode` (string)
- **Description**: 이미지 내보내기 모드
- **Allowed values**: `placeholder`, `embedded`, `referenced`
- **Default**: `embedded`

#### `include_images` (boolean)
- **Description**: 문서에서 이미지 추출 여부
- **Default**: `true`

#### `images_scale` (number)
- **Description**: 이미지 스케일 팩터
- **Default**: `2.0`
- **Example**: `2`

### 3. OCR Options

#### `do_ocr` (boolean)
- **Description**: OCR 처리 활성화
- **Default**: `true`

#### `force_ocr` (boolean)
- **Description**: 기존 텍스트를 OCR 결과로 강제 교체
- **Default**: `false`

#### `ocr_engine` (string)
- **Description**: OCR 엔진 선택
- **Allowed values**: `auto`, `easyocr`, `ocrmac`, `rapidocr`, `tesserocr`, `tesseract`
- **Default**: `easyocr`

#### `ocr_lang` (array | null)
- **Description**: OCR 언어 목록
- **Default**: `[]` (빈 배열)
- **Example**: `["en", "ko", "fr"]`

### 4. PDF Options

#### `pdf_backend` (string)
- **Description**: PDF 백엔드 선택
- **Allowed values**: `pypdfium2`, `dlparse_v1`, `dlparse_v2`, `dlparse_v4`
- **Default**: `dlparse_v4`
- **Note**: `dlparse_v4`가 가장 최신 버전

#### `pipeline` (string)
- **Description**: PDF/이미지 처리 파이프라인
- **Allowed values**: `legacy`, `standard`
- **Default**: `standard`
- **Note**: n8n에서는 `legacy` 사용 중

### 5. Table Options

#### `table_mode` (string)
- **Description**: 테이블 구조 추출 모드
- **Allowed values**: `fast`, `accurate`
- **Default**: `accurate`

#### `table_cell_matching` (boolean)
- **Description**: PDF 셀과 테이블 구조 모델 예측 매칭
- **Default**: `true`
- **Note**: `false`로 설정하면 PDF 셀 무시하고 모델 예측만 사용

#### `do_table_structure` (boolean)
- **Description**: 테이블 구조 추출 활성화
- **Default**: `true`

### 6. Page & Timeout Options

#### `page_range` (array)
- **Description**: 처리할 페이지 범위 [시작, 끝]
- **Default**: `[1, 9223372036854776000]` (모든 페이지)
- **Example**: `[1, 10]` (1-10페이지만)

#### `document_timeout` (number)
- **Description**: 문서 처리 타임아웃 (초)
- **Default**: `604800` (7일)
- **Maximum**: `604800`

#### `abort_on_error` (boolean)
- **Description**: 에러 발생 시 중단 여부
- **Default**: `false`

### 7. Markdown Options

#### `md_page_break_placeholder` (string)
- **Description**: 마크다운 출력에서 페이지 구분자
- **Default**: `""` (빈 문자열)
- **Example**: `"<!-- page-break -->"`

### 8. Advanced Enrichment Options

#### `do_code_enrichment` (boolean)
- **Description**: OCR 코드 보강 활성화
- **Default**: `false`

#### `do_formula_enrichment` (boolean)
- **Description**: 수식 OCR 활성화 (LaTeX 반환)
- **Default**: `false`

#### `do_picture_classification` (boolean)
- **Description**: 이미지 분류 활성화
- **Default**: `false`

#### `do_picture_description` (boolean)
- **Description**: 이미지 설명 생성 활성화
- **Default**: `false`

#### `picture_description_area_threshold` (number)
- **Description**: 이미지 설명 처리를 위한 최소 면적 비율
- **Default**: `0.05` (5%)

### 9. VLM Pipeline Options

#### `vlm_pipeline_model` (string | null)
- **Description**: VLM 파이프라인 모델 프리셋
- **Allowed values**: `granite_docling`, `smoldocling`, `smoldocling_vllm`, `granite_docling_vllm`
- **Default**: `null`
- **Note**: `vlm_pipeline_model_local` 또는 `vlm_pipeline_model_api`와 상호 배타적

#### `vlm_pipeline_model_local` (object | null)
- **Description**: 로컬 VLM 모델 설정 (Hugging Face)
- **Example**:
```json
{
  "repo_id": "ibm-granite/granite-docling-258M",
  "prompt": "Convert this page to docling.",
  "scale": 2.0,
  "response_format": "doctags",
  "inference_framework": "transformers",
  "transformers_model_type": "automodel-imagetexttotext",
  "extra_generation_config": {"skip_special_tokens": false},
  "temperature": 0.0
}
```

#### `vlm_pipeline_model_api` (object | null)
- **Description**: API 기반 VLM 모델 설정
- **Example**:
```json
{
  "url": "http://localhost:1234/v1/chat/completions",
  "headers": {},
  "params": {"model": "ibm-granite/granite-docling-258M-mlx"},
  "timeout": 60.0,
  "concurrency": 1,
  "prompt": "Convert this page to docling.",
  "scale": 2.0,
  "response_format": "doctags",
  "temperature": 0.0
}
```

## File Extension to Format Mapping

### Documents
- `.docx` → `docx`
- `.pptx` → `pptx`
- `.html`, `.htm` → `html`
- `.pdf` → `pdf`
- `.asciidoc`, `.adoc` → `asciidoc`
- `.md` → `md`
- `.csv` → `csv`
- `.xlsx` → `xlsx`
- `.xml` → `xml_uspto` (또는 `xml_jats`, `mets_gbs` - 파일 내용에 따라)
- `.json` → `json_docling`

### Images
- `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.tiff`, `.webp` → `image`

### Audio
- `.mp3`, `.wav`, `.ogg`, `.m4a`, `.flac` → `audio`

### Video/Subtitle
- `.vtt` → `vtt`

## Recommended Defaults for Production

```json
{
  "from_formats": ["pdf", "docx", "md", "html", "json_docling", "csv", "xlsx", "pptx"],
  "to_formats": ["md"],
  "image_export_mode": "embedded",
  "do_ocr": true,
  "force_ocr": false,
  "ocr_engine": "auto",
  "ocr_lang": ["en"],
  "pdf_backend": "dlparse_v4",
  "table_mode": "accurate",
  "table_cell_matching": true,
  "pipeline": "standard",
  "page_range": [1, 999999999],
  "document_timeout": 600,
  "abort_on_error": false,
  "do_table_structure": true,
  "include_images": true,
  "images_scale": 2.0,
  "md_page_break_placeholder": "<!-- page-break -->",
  "do_code_enrichment": false,
  "do_formula_enrichment": false,
  "do_picture_classification": false,
  "do_picture_description": false
}
```

## Performance vs Quality Trade-offs

### Fast Mode (Performance)
- `table_mode: "fast"`
- `do_ocr: false`
- `include_images: false`
- `do_table_structure: false`

### Accurate Mode (Quality)
- `table_mode: "accurate"`
- `do_ocr: true`
- `include_images: true`
- `do_table_structure: true`
- `pdf_backend: "dlparse_v4"`

## Notes

1. **n8n 현재 설정**: `pipeline: "legacy"` 사용 중
2. **from_formats**: 파일 확장자에 따라 자동으로 설정하는 것이 좋음
3. **to_formats**: 일반적으로 `["md"]`만 사용
4. **json_docling**: JSON 파일은 `json_docling` 형식으로 지정해야 함
5. **image**: 모든 이미지 형식은 `image`로 통일

