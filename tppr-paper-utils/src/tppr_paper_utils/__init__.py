from __future__ import annotations

import base64
import copy
import hashlib
import json
import mimetypes
import re
import uuid
from pathlib import Path
from typing import Any, BinaryIO, TypeAlias
from urllib.parse import urlparse

from tppr_paper_utils.models import (
    AssetRef,
    ChoiceOption,
    ContentBlock,
    ImageBlock,
    ParsedPaper,
    ParsedPaperAdapter,
    ParsedQuestion,
    ParsedQuestionAdapter,
    QuestionPart,
    QuestionType,
    TableBlock,
    TextBlock,
    to_jsonable,
)
from tppr_paper_utils.providers import OCRInput, OCROptions, OCRProvider, OCRResult

PaperManifest: TypeAlias = dict[str, Any]


class PaperExtractionError(RuntimeError):
    pass


def _slug_part(value: Any) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text or "unknown"


def _decode_data_url(value: str) -> tuple[str, bytes]:
    match = re.match(r"^data:([^;,]+)?(;base64)?,(.*)$", value, re.DOTALL)
    if not match:
        raise PaperExtractionError("Invalid data URL asset")

    content_type = match.group(1) or "application/octet-stream"
    is_base64 = bool(match.group(2))
    payload = match.group(3)

    if is_base64:
        return content_type, base64.b64decode(payload)

    return content_type, payload.encode("utf-8")


def _extension_for_content_type(content_type: str) -> str:
    extension = mimetypes.guess_extension(content_type)
    if extension:
        return extension

    fallback_extensions = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "text/html": ".html",
        "text/markdown": ".md",
        "application/json": ".json",
    }
    return fallback_extensions.get(content_type, ".bin")


class ExtractedPaper(dict):
    """JSON-serializable extracted paper payload."""

    def __init__(
        self,
        metadata: dict[str, Any] | None = None,
        questions: list[dict[str, Any]] | None = None,
        ocr: dict[str, Any] | None = None,
    ) -> None:
        payload: PaperManifest = {
            "metadata": metadata or {},
            "questions": questions or [],
        }

        if ocr is not None:
            payload["ocr"] = ocr

        super().__init__(payload)

    @property
    def metadata(self) -> dict[str, Any]:
        return self["metadata"]

    @property
    def questions(self) -> list[dict[str, Any]]:
        return self["questions"]

    @property
    def ocr(self) -> dict[str, Any] | None:
        return self.get("ocr")

    @classmethod
    def from_ocr_result(cls, result: OCRResult) -> "ExtractedPaper":
        return cls(
            ocr={
                "provider": result.provider,
                "text": result.text,
                "pages": [
                    {
                        "page_number": page.page_number,
                        "text": page.text,
                        "markdown": page.markdown,
                        "confidence": page.confidence,
                        "width": page.width,
                        "height": page.height,
                        "raw": page.raw,
                    }
                    for page in result.pages
                ],
                "raw": result.raw,
            }
        )

    def to_dict(self) -> PaperManifest:
        return dict(self)

    def to_json(self, **kwargs: Any) -> str:
        return json.dumps(self.to_dict(), **kwargs)

    def toJson(self, **kwargs: Any) -> str:
        return self.to_json(**kwargs)

    def parse_and_convert(
        self,
        *,
        paper_id: str | None = None,
        subject: str | None = None,
        difficulty: str | None = None,
        year: str | int | None = None,
        output_dir: str | Path | None = None,
        seaweedfs: Any | None = None,
        parser: Any | None = None,
    ) -> dict[str, Any]:
        from tppr_paper_utils.parsers import MistralParser

        manifest_uuid = paper_id or str(uuid.uuid4())
        parser = parser or MistralParser(paper_id=manifest_uuid)
        if hasattr(parser, "parse_paper"):
            parsed_paper = parser.parse_paper(self, paper_id=manifest_uuid)
            parsed_paper_json = to_jsonable(parsed_paper)
            parsed_metadata = parsed_paper_json.get("metadata") or {}
            parsed_questions = parsed_paper_json.get("questions") or []
        else:
            parsed_metadata = {}
            parsed_questions = to_jsonable(parser.parse(self, paper_id=manifest_uuid))

        if parsed_metadata:
            self["metadata"] = {**parsed_metadata, **self.metadata}

        self["questions"] = parsed_questions

        base_parts = self._storage_base_parts(
            subject=subject,
            difficulty=difficulty,
            year=year,
        )
        questions = [
            self._convert_question_assets(copy.deepcopy(question), base_parts)
            for question in parsed_questions
        ]
        files = [
            file_entry
            for converted in questions
            for file_entry in converted.pop("_files")
        ]
        manifest = {
            "uuid": manifest_uuid,
            "metadata": self.metadata,
        }
        files.append(
            {
                "storage_path": f"/{'/'.join(base_parts)}/manifest.json",
                "content_type": "application/json",
                "data": json.dumps(manifest, indent=2).encode("utf-8"),
            }
        )

        written_files = self._write_converted_files(
            files,
            output_dir=Path(output_dir) if output_dir is not None else None,
            seaweedfs=seaweedfs,
        )

        converted = {
            "metadata": self.metadata,
            "uuid": manifest["uuid"],
            "questions": questions,
            "files": self._file_manifest(files),
            "seaweedfs_files": files,
        }

        if written_files:
            converted["written_files"] = written_files

        self["questions"] = questions
        self["converted"] = {
            "uuid": converted["uuid"],
            "metadata": converted["metadata"],
            "questions": converted["questions"],
            "files": converted["files"],
        }
        return converted

    def _storage_base_parts(
        self,
        *,
        subject: str | None,
        difficulty: str | None,
        year: str | int | None,
    ) -> list[str]:
        inferred_subject, inferred_difficulty = self._paper_path_parts(
            subject=subject,
            difficulty=difficulty,
        )
        resolved_year = year or self.metadata.get("year") or "unknown-year"
        parts = [inferred_subject]

        if inferred_difficulty:
            parts.append(inferred_difficulty)

        parts.append(str(resolved_year))
        return [_slug_part(part) for part in parts]

    def _paper_path_parts(
        self,
        *,
        subject: str | None,
        difficulty: str | None,
    ) -> tuple[str, str | None]:
        resolved_subject = subject or self.metadata.get("subject")
        resolved_difficulty = difficulty or self.metadata.get("difficulty")

        if resolved_subject:
            return str(resolved_subject), (
                str(resolved_difficulty) if resolved_difficulty else None
            )

        return str(self.metadata.get("paper") or "unknown-subject").strip(), (
            str(resolved_difficulty) if resolved_difficulty else None
        )

    def _convert_question_assets(
        self,
        question: dict[str, Any],
        base_parts: list[str],
    ) -> dict[str, Any]:
        question_index = str(
            question.get("questionIndex") or question.get("number") or "unknown"
        )
        question_dir = "/".join([*base_parts, f"q{_slug_part(question_index)}"])
        files: list[dict[str, Any]] = []
        seen_assets: dict[str, str] = {}

        def convert_asset(asset_url: str) -> str:
            if not asset_url.startswith("data:"):
                return asset_url

            if asset_url in seen_assets:
                return seen_assets[asset_url]

            content_type, data = _decode_data_url(asset_url)
            digest = hashlib.sha256(data).hexdigest()[:12]
            extension = _extension_for_content_type(content_type)
            storage_path = f"/{question_dir}/asset-{len(seen_assets) + 1}-{digest}{extension}"
            seen_assets[asset_url] = storage_path
            files.append(
                {
                    "storage_path": storage_path,
                    "content_type": content_type,
                    "data": data,
                }
            )
            return storage_path

        self._rewrite_asset_urls(question, convert_asset)
        question_json = json.dumps(question, indent=2).encode("utf-8")
        files.append(
            {
                "storage_path": f"/{question_dir}/question.json",
                "content_type": "application/json",
                "data": question_json,
            }
        )
        question["_files"] = files
        return question

    def _rewrite_asset_urls(self, value: Any, converter: Any) -> None:
        if isinstance(value, dict):
            asset_url = value.get("assetURL")
            if isinstance(asset_url, str):
                value["assetURL"] = converter(asset_url)

            image = value.get("image")
            if isinstance(image, str):
                value["image"] = converter(image)

            asset = value.get("asset")
            if isinstance(asset, dict):
                asset_url = asset.get("url")
                if isinstance(asset_url, str):
                    asset["url"] = converter(asset_url)

            asset_urls = value.get("assetURLs")
            if isinstance(asset_urls, list):
                value["assetURLs"] = [
                    converter(item) if isinstance(item, str) else item
                    for item in asset_urls
                ]

            images = value.get("images")
            if isinstance(images, list):
                value["images"] = [
                    converter(item) if isinstance(item, str) else item
                    for item in images
                ]

            for child in value.values():
                self._rewrite_asset_urls(child, converter)
            return

        if isinstance(value, list):
            for child in value:
                self._rewrite_asset_urls(child, converter)

    def _write_converted_files(
        self,
        files: list[dict[str, Any]],
        *,
        output_dir: Path | None,
        seaweedfs: Any | None,
    ) -> list[dict[str, Any]]:
        written: list[dict[str, Any]] = []

        for file_entry in files:
            if output_dir is not None:
                relative_path = file_entry["storage_path"].lstrip("/")
                path = output_dir / relative_path
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(file_entry["data"])
                written.append(
                    {
                        "storage_path": file_entry["storage_path"],
                        "path": str(path),
                        "content_type": file_entry["content_type"],
                        "size_bytes": len(file_entry["data"]),
                    }
                )

            if seaweedfs is not None:
                result = seaweedfs.write(
                    file_entry["storage_path"],
                    file_entry["data"],
                    file_entry["content_type"],
                )
                if hasattr(result, "as_dict"):
                    written.append(result.as_dict())
                else:
                    written.append(
                        {
                            "storage_path": file_entry["storage_path"],
                            "content_type": file_entry["content_type"],
                            "size_bytes": len(file_entry["data"]),
                        }
                    )

        return written

    def _file_manifest(self, files: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {
                "storage_path": file_entry["storage_path"],
                "content_type": file_entry["content_type"],
                "size_bytes": len(file_entry["data"]),
            }
            for file_entry in files
        ]


class PaperExtractor:
    def __init__(
        self,
        data: OCRInput | OCRResult | str | bytes | Path | BinaryIO,
        *,
        mime_type: str | None = None,
        filename: str | None = None,
        ocr_provider: OCRProvider | None = None,
        close_source: bool = False,
    ) -> None:
        self.data = data
        self.mime_type = mime_type
        self.filename = filename
        self.ocr_provider = ocr_provider
        self.close_source = close_source

    def extract(
        self,
        ocr_client: OCRProvider | None = None,
        options: OCROptions | None = None,
    ) -> ExtractedPaper:
        if isinstance(self.data, OCRResult):
            return ExtractedPaper.from_ocr_result(self.data)

        provider = ocr_client or self.ocr_provider
        if provider is None:
            raise PaperExtractionError(
                "No OCR provider provided. TPPR-Paper-Utils provides Mistral as an example"
            )

        if not hasattr(provider, "extract"):
            raise PaperExtractionError(
                "ocr_client must implement extract(source, options)"
            )

        source = self._to_ocr_input()
        result = provider.extract(source, options)
        if result is None:
            raise PaperExtractionError("OCR provider returned no result")

        return ExtractedPaper.from_ocr_result(result)

    def close(self) -> None:
        if self.close_source and hasattr(self.data, "close"):
            self.data.close()

    def __enter__(self) -> "PaperExtractor":
        return self

    def __exit__(self, exc_type: Any, exc_value: Any, traceback: Any) -> None:
        self.close()

    def _to_ocr_input(self) -> OCRInput:
        if isinstance(self.data, OCRInput):
            return self.data

        if isinstance(self.data, (bytes, bytearray, memoryview)):
            return OCRInput(
                type="bytes",
                value=bytes(self.data),
                mime_type=self._mime_type(),
                filename=self.filename,
            )

        if isinstance(self.data, Path):
            return OCRInput(
                type="file_path",
                value=self.data,
                mime_type=self._mime_type(str(self.data)),
                filename=self.filename or self.data.name,
            )

        if isinstance(self.data, str):
            if self._is_url(self.data):
                return OCRInput(
                    type="url",
                    value=self.data,
                    mime_type=self._mime_type(self.data),
                    filename=self.filename,
                )

            path = Path(self.data)
            return OCRInput(
                type="file_path",
                value=path,
                mime_type=self._mime_type(str(path)),
                filename=self.filename or path.name,
            )

        if hasattr(self.data, "read"):
            filename = self.filename or self._file_name(self.data)
            return OCRInput(
                type="bytes",
                value=self._read_file(self.data),
                mime_type=self._mime_type(filename),
                filename=filename,
            )

        raise PaperExtractionError(
            f"Unsupported paper input: {type(self.data).__name__}"
        )

    def _mime_type(self, guess_source: str | None = None) -> str | None:
        if self.mime_type:
            return self.mime_type

        if guess_source:
            guessed, _ = mimetypes.guess_type(guess_source)
            if guessed:
                return guessed

        if self.filename:
            guessed, _ = mimetypes.guess_type(self.filename)
            if guessed:
                return guessed

        return "application/pdf"

    def _file_name(self, file_obj: BinaryIO) -> str | None:
        name = getattr(file_obj, "name", None)
        if isinstance(name, str) and name:
            return Path(name).name

        return None

    def _read_file(self, file_obj: BinaryIO) -> bytes:
        position = None
        if hasattr(file_obj, "tell") and hasattr(file_obj, "seek"):
            try:
                position = file_obj.tell()
                file_obj.seek(0)
            except OSError:
                position = None

        content = file_obj.read()

        if position is not None:
            try:
                file_obj.seek(position)
            except OSError:
                pass

        if isinstance(content, str):
            return content.encode("utf-8")

        return bytes(content)

    def _is_url(self, value: str) -> bool:
        parsed = urlparse(value)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def main() -> None:
    import argparse

    try:
        import dotenv
    except ImportError:
        dotenv = None

    from tppr_paper_utils.providers.mistral import MistralOCRProvider

    if dotenv is not None:
        dotenv.load_dotenv()

    parser = argparse.ArgumentParser(
        description=(
            "Converts a past paper into the TPPR question file structure."
        )
    )
    parser.add_argument("input", help="Path to the input paper file")
    parser.add_argument("output", help="Directory to write converted question files")
    parser.add_argument(
        "--paper-id",
        default="",
        help="Original PDF ID/hash to store in each question",
    )
    parser.add_argument("--subject", help="Subject path segment")
    parser.add_argument("--difficulty", help="Optional difficulty path segment")
    parser.add_argument("--year", help="Paper year path segment")
    args = parser.parse_args()

    output_dir = Path(args.output)
    with open(args.input, "rb") as file:
        with PaperExtractor(file) as extractor:
            paper = extractor.extract(
                ocr_client=MistralOCRProvider.from_env(),
                options=OCROptions(include_images=True),
            )
            converted = paper.parse_and_convert(
                paper_id=args.paper_id,
                subject=args.subject,
                difficulty=args.difficulty,
                year=args.year,
                output_dir=output_dir,
            )

    manifest_file = next(
        (
            file_entry
            for file_entry in converted["files"]
            if file_entry["storage_path"].endswith("/manifest.json")
        ),
        None,
    )
    if manifest_file is not None:
        print(f"Wrote manifest to {manifest_file['storage_path']}")

    print(f"Successfully converted paper into {output_dir}")


__all__ = [
    "AssetRef",
    "ChoiceOption",
    "ContentBlock",
    "ExtractedPaper",
    "ImageBlock",
    "PaperExtractionError",
    "PaperExtractor",
    "PaperManifest",
    "ParsedPaper",
    "ParsedPaperAdapter",
    "ParsedQuestion",
    "ParsedQuestionAdapter",
    "QuestionPart",
    "QuestionType",
    "TableBlock",
    "TextBlock",
]
