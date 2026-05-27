# WARNING:
#
# This entire python script/module was generated fully with AI (i cant do allat LMAO).
# Unlike certain parts of tppr-paper-utils, this should not be marked.

from __future__ import annotations

import base64
import html
import mimetypes
import re
from dataclasses import dataclass, field
from typing import Any

from tppr_paper_utils.models import (
    AssetRef,
    ChoiceOption,
    ContentBlock,
    ImageBlock,
    ParsedPaper,
    ParsedQuestion,
    QuestionPart,
    TableBlock,
    TextBlock,
)
from tppr_paper_utils.providers import OCRPage, OCRResult

QuestionSchema = dict[str, Any]


@dataclass(frozen=True)
class _ParsedPage:
    page_number: int
    markdown: str
    raw: dict[str, Any]


@dataclass(frozen=True)
class _Asset:
    url: str
    mime_type: str | None = None
    source_ref: str | None = None
    page: int | None = None
    html: str | None = None

    def ref(self) -> AssetRef:
        return AssetRef(
            url=self.url,
            mime_type=self.mime_type,
            source_ref=self.source_ref,
            page=self.page,
        )


@dataclass(frozen=True)
class _QuestionBlock:
    index: str
    markdown: str
    pages: list[int] = field(default_factory=list)


@dataclass(frozen=True)
class _PartBlock:
    label: str
    markdown: str


class MistralParser:
    """
    Converts Mistral OCR markdown into typed TPPR v2 paper models.
    """

    _page_marker_re = re.compile(r"^__TPPR_PAGE_(?P<page>\d+)__$")
    _question_heading_re = re.compile(
        r"^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*Question\s+"
        r"(?P<index>\d{1,3})\s*(?P<rest>\(\d{1,2}\s+marks?\))?\s*(?:\*\*)?\s*$",
        re.IGNORECASE,
    )
    _question_continued_re = re.compile(
        r"^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*Question\s+"
        r"(?P<index>\d{1,3})\s*\(continued\)\s*(?:\*\*)?\s*$",
        re.IGNORECASE,
    )
    _numbered_question_re = re.compile(
        r"^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(?P<index>\d{1,3})"
        r"(?:\s*[\).:-]\s+|\s+)(?P<rest>\S.*?)(?:\*\*)?\s*$"
    )
    _bare_question_number_re = re.compile(r"^\s*(?P<index>\d{1,2})\s*$")
    _part_re = re.compile(r"^\s*(?:#{1,6}\s*)?(?:\*\*)?\(([a-z])\)\s*(.*)$")
    _asset_re = re.compile(r"!\[[^\]]*\]\(([^)]+)\)|\[[^\]]+\]\(([^)]+)\)")
    _mark_re = re.compile(r"\(?\b(\d{1,2})\s+marks?\b\)?", re.IGNORECASE)
    _option_re = re.compile(r"(?m)^\s*(?:[-*]\s*)?(?:\(?([A-Z])\)|([A-Z])[\).])\s+")
    _option_line_re = re.compile(
        r"^\s*(?:[-*]\s*)?(?:\(?([A-Z])\)|([A-Z])[\).])\s*(.*)$"
    )
    _inline_option_re = re.compile(r"(?<![A-Za-z0-9])([A-Z])[\).]\s+")
    _image_choice_cue_re = re.compile(
        r"\bWhich\b.*\b(?:graph|diagram|sketch|curve)\b|\bWhich of the following\b",
        re.IGNORECASE | re.DOTALL,
    )
    _question_cue_re = re.compile(
        r"^(?:What|Which|Why|How|When|Where|Who|Calculate|Determine|Find|Show|"
        r"Prove|Evaluate|Explain|Sketch|Draw|Hence|Use|Using|By using|State|Write|"
        r"Solve|Describe|Justify|Deduce|Consider|Simplify|Interpret)\b",
        re.IGNORECASE,
    )
    _section_re = re.compile(
        r"Section\s+(?P<name>[IVX]+)\s*[-\u2013]\s*"
        r"(?P<marks>\d+)\s+marks?\s*\(pages\s*(?P<pages>\d+\s*[-\u2013]\s*\d+)\)",
        re.IGNORECASE,
    )

    def __init__(
        self,
        *,
        paper_id: str = "",
        default_marks: int = 1,
        boilerplate_patterns: list[str] | None = None,
    ) -> None:
        self.paper_id = paper_id
        self.default_marks = default_marks
        self.boilerplate_patterns = [
            re.compile(pattern, re.IGNORECASE) for pattern in boilerplate_patterns or []
        ]

    def parse(
        self,
        ocr_output: OCRResult | dict[str, Any] | str,
        *,
        paper_id: str | None = None,
    ) -> list[QuestionSchema]:
        return [
            question.model_dump(mode="json", exclude_none=True)
            for question in self.parse_questions(ocr_output, paper_id=paper_id)
        ]

    def parse_questions(
        self,
        ocr_output: OCRResult | dict[str, Any] | str,
        *,
        paper_id: str | None = None,
    ) -> list[ParsedQuestion]:
        pages = self._coerce_pages(ocr_output)
        asset_map: dict[str, _Asset] = {}
        page_markdown: list[str] = []

        for page in pages:
            page_assets = self._asset_map_for_page(page)
            for asset_id, asset in page_assets.items():
                asset_map[self._scoped_asset_ref(page.page_number, asset_id)] = asset
                asset_map.setdefault(asset_id, asset)

            cleaned = self._clean_page_markdown(page.markdown)
            if cleaned and page_assets:
                cleaned = self._scope_page_asset_refs(
                    cleaned,
                    page_number=page.page_number,
                    asset_ids=set(page_assets),
                )
            if cleaned:
                page_markdown.append(f"__TPPR_PAGE_{page.page_number}__\n{cleaned}")

        markdown = "\n\n".join(page_markdown)
        return [
            self._question_from_block(block, asset_map, paper_id or self.paper_id)
            for block in self._split_questions(markdown)
        ]

    def parse_paper(
        self,
        ocr_output: OCRResult | dict[str, Any] | str,
        *,
        paper_id: str | None = None,
    ) -> ParsedPaper:
        return ParsedPaper(
            metadata=self.parse_metadata(ocr_output),
            questions=self.parse_questions(ocr_output, paper_id=paper_id),
        )

    def parse_metadata(
        self, ocr_output: OCRResult | dict[str, Any] | str
    ) -> dict[str, Any]:
        pages = self._coerce_pages(ocr_output)
        text = "\n".join(page.markdown for page in pages[:2] if page.markdown)
        text = text.replace("\u2013", "-")
        metadata: dict[str, Any] = {}

        year_match = re.search(r"\b(20\d{2})\b", text)
        if year_match:
            metadata["year"] = int(year_match.group(1))

        paper = self._infer_paper_title(text)
        if paper:
            metadata["paper"] = paper

        sections: list[dict[str, Any]] = []
        for match in self._section_re.finditer(text):
            sections.append(
                {
                    "name": f"Section {match.group('name').upper()}",
                    "marks": int(match.group("marks")),
                    "pages": re.sub(r"\s+", "", match.group("pages")).replace(
                        "\u2013", "-"
                    ),
                }
            )

        if sections:
            metadata["sections"] = sections

        return metadata

    def _infer_paper_title(self, text: str) -> str | None:
        lines = [self._clean_text(line) for line in text.splitlines()]
        lines = [line for line in lines if line]

        start_index = 0
        for index, line in enumerate(lines):
            if "EXAMINATION" in line.upper():
                start_index = index + 1
                break

        stop_words = ("GENERAL", "INSTRUCTIONS", "TOTAL MARKS", "SECTION ")
        candidates: list[str] = []
        for line in lines[start_index:]:
            upper = line.upper()
            if upper.startswith(stop_words):
                break
            if self._looks_like_metadata_noise(line):
                continue
            candidates.append(line)

        return max(candidates, key=len) if candidates else None

    def _looks_like_metadata_noise(self, line: str) -> bool:
        upper = line.upper()
        if re.fullmatch(r"\d+", line):
            return True
        if re.fullmatch(r"20\d{2}", line):
            return True
        if any(token in upper for token in ("CENTRE NUMBER", "STUDENT NUMBER")):
            return True
        return "EDUCATION STANDARDS AUTHORITY" in upper

    def _coerce_pages(
        self, ocr_output: OCRResult | dict[str, Any] | str
    ) -> list[_ParsedPage]:
        if isinstance(ocr_output, str):
            return [_ParsedPage(page_number=1, markdown=ocr_output, raw={})]

        if isinstance(ocr_output, OCRResult):
            return [
                _ParsedPage(
                    page_number=page.page_number,
                    markdown=page.markdown or page.text,
                    raw=page.raw,
                )
                for page in ocr_output.pages
            ]

        if "ocr" in ocr_output and isinstance(ocr_output["ocr"], dict):
            return self._coerce_pages(ocr_output["ocr"])

        pages = ocr_output.get("pages")
        raw_pages = []
        raw = ocr_output.get("raw")
        if isinstance(raw, dict) and isinstance(raw.get("pages"), list):
            raw_pages = raw["pages"]

        if isinstance(pages, list):
            parsed_pages: list[_ParsedPage] = []
            for index, page in enumerate(pages):
                if isinstance(page, OCRPage):
                    parsed_pages.append(
                        _ParsedPage(
                            page_number=page.page_number,
                            markdown=page.markdown or page.text,
                            raw=page.raw,
                        )
                    )
                    continue

                if isinstance(page, dict):
                    page_raw = page.get("raw")
                    if not isinstance(page_raw, dict):
                        page_raw = raw_pages[index] if index < len(raw_pages) else page

                    parsed_pages.append(
                        _ParsedPage(
                            page_number=int(
                                page.get("page_number", page.get("index", index) + 1)
                            ),
                            markdown=str(
                                page.get("markdown") or page.get("text") or ""
                            ),
                            raw=page_raw,
                        )
                    )

            return parsed_pages

        text = ocr_output.get("markdown") or ocr_output.get("text")
        if isinstance(text, str):
            return [_ParsedPage(page_number=1, markdown=text, raw=ocr_output)]

        return []

    def _asset_map_for_page(self, page: _ParsedPage) -> dict[str, _Asset]:
        assets: dict[str, _Asset] = {}

        for image in self._as_list(page.raw.get("images")):
            image_id = self._string_value(image.get("id"))
            image_base64 = self._image_base64(image)
            if image_id and image_base64:
                assets[image_id] = _Asset(
                    url=self._data_url(image_id, image_base64),
                    mime_type=self._mime_type_for_ref(image_id) or "image/jpeg",
                    source_ref=image_id,
                    page=page.page_number,
                )

        for table in self._as_list(page.raw.get("tables")):
            table_id = self._string_value(table.get("id"))
            content = self._string_value(table.get("content"))
            if table_id and content:
                html_content = self._table_html(table, content)
                assets[table_id] = _Asset(
                    url=self._html_data_url(html_content),
                    mime_type="text/html",
                    source_ref=table_id,
                    page=page.page_number,
                    html=html_content,
                )

        return assets

    def _image_base64(self, image: dict[str, Any]) -> str | None:
        for key in ("image_base64", "imageBase64", "base64", "data", "content"):
            value = self._string_value(image.get(key))
            if value:
                return value
        return None

    def _scoped_asset_ref(self, page_number: int, asset_id: str) -> str:
        return f"__page_{page_number}__/{asset_id}"

    def _scope_page_asset_refs(
        self,
        markdown: str,
        *,
        page_number: int,
        asset_ids: set[str],
    ) -> str:
        def replace(match: re.Match[str]) -> str:
            ref = match.group(1) or match.group(2)
            if ref not in asset_ids:
                return match.group(0)
            scoped_ref = self._scoped_asset_ref(page_number, ref)
            return re.sub(r"\([^)]+\)$", f"({scoped_ref})", match.group(0), count=1)

        return self._asset_re.sub(replace, markdown)

    def _split_questions(self, markdown: str) -> list[_QuestionBlock]:
        blocks: list[_QuestionBlock] = []
        current_index: str | None = None
        current_lines: list[str] = []
        current_pages: list[int] = []
        current_page: int | None = None
        expected_next = 1
        lines = markdown.replace("\r\n", "\n").replace("\r", "\n").split("\n")

        for line_index, raw_line in enumerate(lines):
            line = raw_line.rstrip()
            page_match = self._page_marker_re.match(line)
            if page_match:
                current_page = int(page_match.group("page"))
                continue

            if self._question_continued_re.match(line):
                continue

            question_start = self._question_start(line, expected_next)
            if question_start is None:
                question_start = self._bare_question_start(
                    line,
                    expected_next,
                    current_index=current_index,
                    current_markdown="\n".join(current_lines),
                    next_line=self._next_nonempty_line(lines, line_index + 1),
                )

            if question_start is not None:
                if current_index is not None:
                    blocks.append(
                        _QuestionBlock(
                            index=current_index,
                            markdown="\n".join(current_lines).strip(),
                            pages=current_pages.copy(),
                        )
                    )

                current_index, rest = question_start
                current_lines = [rest.strip()] if rest.strip() else []
                current_pages = [current_page] if current_page is not None else []
                expected_next = int(current_index) + 1
                continue

            if current_index is not None:
                if (
                    line.strip()
                    and current_page is not None
                    and current_page not in current_pages
                ):
                    current_pages.append(current_page)
                current_lines.append(line)

        if current_index is not None:
            blocks.append(
                _QuestionBlock(
                    index=current_index,
                    markdown="\n".join(current_lines).strip(),
                    pages=current_pages.copy(),
                )
            )

        return [block for block in blocks if block.markdown]

    def _question_start(self, line: str, expected_next: int) -> tuple[str, str] | None:
        heading_match = self._question_heading_re.match(line)
        if heading_match:
            return heading_match.group("index"), heading_match.group("rest") or ""

        numbered_match = self._numbered_question_re.match(line)
        if not numbered_match:
            return None

        index = int(numbered_match.group("index"))
        if expected_next != 1 and (index < expected_next or index > expected_next + 5):
            return None
        if index <= 10 and not self._looks_like_question_opening(
            numbered_match.group("rest")
        ):
            return None

        return str(index), numbered_match.group("rest")

    def _bare_question_start(
        self,
        line: str,
        expected_next: int,
        *,
        current_index: str | None,
        current_markdown: str,
        next_line: str,
    ) -> tuple[str, str] | None:
        bare_match = self._bare_question_number_re.match(line)
        if not bare_match:
            return None

        index = int(bare_match.group("index"))
        if index != expected_next or index > 10:
            return None

        if current_index is not None and not self._has_complete_options(
            current_markdown
        ):
            return None

        if next_line and self._looks_like_question_opening(next_line):
            return str(index), ""

        return None

    def _next_nonempty_line(self, lines: list[str], start: int) -> str:
        for line in lines[start:]:
            stripped = line.strip()
            if stripped and not self._page_marker_re.match(stripped):
                return stripped
        return ""

    def _looks_like_question_opening(self, text: str) -> bool:
        text = self._clean_text(text)
        if not text:
            return False
        if self._question_cue_re.match(text):
            return True
        first = text[0]
        return first.isalpha() and first.upper() == first

    def _has_complete_options(self, markdown: str) -> bool:
        labels = self._option_labels(markdown)
        return len(labels) >= 3 and self._is_sequential_labels(labels)

    def _question_from_block(
        self,
        block: _QuestionBlock,
        asset_map: dict[str, _Asset],
        paper_id: str,
    ) -> ParsedQuestion:
        question_type = self._question_type(block.markdown)
        markdown = (
            self._remove_standalone_numeric_lines(block.markdown)
            if question_type == "long_answer"
            else block.markdown
        )
        marks = self._marks(block.markdown, question_type)

        if question_type == "multiple_choice":
            stem_markdown, options = self._multiple_choice_components(
                markdown,
                asset_map,
            )
            root_stimulus, root_question = self._stimulus_question_blocks(
                stem_markdown,
                asset_map,
            )
            return ParsedQuestion(
                id=self._question_id(paper_id, block.index),
                paper_id=paper_id,
                number=int(block.index),
                type="multiple_choice",
                marks=marks,
                pages=block.pages,
                stimulus=root_stimulus,
                question=root_question,
                options=options,
            )

        preamble, raw_parts = self._split_long_answer_parts(markdown)
        root_stimulus = (
            self._blocks_from_markdown(preamble, asset_map) if preamble else []
        )

        if len(raw_parts) == 1 and raw_parts[0].label == "":
            stimulus, question = self._stimulus_question_blocks(
                raw_parts[0].markdown,
                asset_map,
            )
            return ParsedQuestion(
                id=self._question_id(paper_id, block.index),
                paper_id=paper_id,
                number=int(block.index),
                type="long_answer",
                marks=marks,
                pages=block.pages,
                stimulus=root_stimulus or stimulus,
                question=question,
            )

        parts = [
            self._part_from_markdown(part, asset_map)
            for part in raw_parts
            if part.markdown.strip()
        ]
        return ParsedQuestion(
            id=self._question_id(paper_id, block.index),
            paper_id=paper_id,
            number=int(block.index),
            type="long_answer",
            marks=marks,
            pages=block.pages,
            stimulus=root_stimulus,
            question=[],
            parts=parts,
        )

    def _question_id(self, paper_id: str, index: str) -> str:
        prefix = paper_id or "paper"
        return f"{prefix}:q{index}"

    def _question_type(self, markdown: str) -> str:
        normalized = self._normalize_inline_options(markdown)
        labels = self._option_labels(normalized)
        if len(labels) >= 3 and self._is_sequential_labels(labels):
            return "multiple_choice"
        if self._looks_like_image_choice(normalized):
            return "multiple_choice"
        return "long_answer"

    def _option_labels(self, markdown: str) -> list[str]:
        labels: list[str] = []
        for match in self._option_re.finditer(markdown):
            label = match.group(1) or match.group(2)
            if label and label not in labels:
                labels.append(label)
        return labels

    def _is_sequential_labels(self, labels: list[str]) -> bool:
        if not labels:
            return False
        expected = [chr(ord("A") + index) for index in range(len(labels))]
        return labels == expected

    def _looks_like_image_choice(self, markdown: str) -> bool:
        text = self._clean_text(self._asset_re.sub("", markdown))
        return bool(
            self._image_choice_cue_re.search(text)
            and len(self._asset_refs(markdown)) >= 3
        )

    def _marks(self, markdown: str, question_type: str) -> int:
        if question_type == "multiple_choice":
            return self.default_marks

        matches = list(self._mark_re.finditer(markdown))
        if not matches:
            return 0
        if matches[0].start() < 80:
            return int(matches[0].group(1))
        if len(matches) > 1:
            return sum(int(match.group(1)) for match in matches)
        return int(matches[0].group(1))

    def _split_long_answer_parts(
        self, markdown: str
    ) -> tuple[str | None, list[_PartBlock]]:
        parts: list[_PartBlock] = []
        current_label = ""
        current_lines: list[str] = []
        found_part = False
        preamble: str | None = None

        for line in markdown.split("\n"):
            match = self._part_re.match(line)
            if match:
                found_part = True
                candidate = "\n".join(current_lines).strip()
                if candidate:
                    if preamble is None and current_label == "":
                        preamble = candidate
                    else:
                        part_markdown, trailing_stimulus = (
                            self._part_markdown_and_trailing(candidate)
                        )
                        if part_markdown:
                            parts.append(
                                _PartBlock(label=current_label, markdown=part_markdown)
                            )
                        if trailing_stimulus:
                            preamble = self._append_markdown(
                                preamble, trailing_stimulus
                            )
                current_label = match.group(1)
                rest = match.group(2).strip()
                current_lines = [rest] if rest else []
                continue

            current_lines.append(line)

        candidate = "\n".join(current_lines).strip()
        if candidate:
            parts.append(_PartBlock(label=current_label, markdown=candidate))

        if not found_part:
            return None, [_PartBlock(label="", markdown=markdown.strip())]

        return preamble, [part for part in parts if part.markdown.strip()]

    def _part_markdown_and_trailing(self, markdown: str) -> tuple[str, str | None]:
        paragraphs = [paragraph.strip() for paragraph in markdown.split("\n\n")]
        paragraphs = [paragraph for paragraph in paragraphs if paragraph]
        if len(paragraphs) < 2:
            return markdown, None

        if not (self._question_cue_re.match(paragraphs[0]) or "?" in paragraphs[0]):
            return markdown, None

        trailing = [
            paragraph
            for paragraph in paragraphs[1:]
            if not self._looks_like_answer_scaffold(paragraph)
        ]
        if not trailing:
            return paragraphs[0], None

        return paragraphs[0], "\n\n".join(trailing)

    def _append_markdown(self, first: str | None, second: str) -> str:
        if not first:
            return second
        return f"{first.strip()}\n\n{second.strip()}"

    def _looks_like_answer_scaffold(self, text: str) -> bool:
        cleaned = self._clean_text(text)
        return bool(
            re.fullmatch(r"(?:Form|Direction)\s*:\s*\.{0,5}", cleaned, re.IGNORECASE)
        )

    def _part_from_markdown(
        self,
        part: _PartBlock,
        asset_map: dict[str, _Asset],
    ) -> QuestionPart:
        stimulus, question = self._stimulus_question_blocks(part.markdown, asset_map)
        return QuestionPart(
            label=part.label or None,
            stimulus=stimulus,
            question=question or self._blocks_from_markdown(part.markdown, asset_map),
        )

    def _stimulus_question_blocks(
        self,
        markdown: str,
        asset_map: dict[str, _Asset],
    ) -> tuple[list[ContentBlock], list[ContentBlock]]:
        refs = self._asset_refs(markdown)
        plain_text = self._clean_text(
            self._asset_re.sub("", self._strip_markdown_tables(markdown))
        )
        stimulus_text, question_text = self._split_stimulus_question(plain_text)
        question_blocks = self._blocks_from_markdown(question_text, asset_map)

        if stimulus_text:
            split_markdown = self._markdown_before_text(markdown, question_text)
            stimulus_blocks = self._blocks_from_markdown(split_markdown, asset_map)
            if stimulus_blocks:
                return stimulus_blocks, question_blocks

        stimulus_blocks: list[ContentBlock] = []
        if refs:
            without_question = self._markdown_before_text(markdown, question_text)
            stimulus_blocks = self._blocks_from_markdown(without_question, asset_map)

        if stimulus_text and not stimulus_blocks:
            stimulus_blocks = [TextBlock(text=stimulus_text)]

        return stimulus_blocks, question_blocks

    def _split_stimulus_question(self, text: str) -> tuple[str | None, str]:
        paragraphs = [paragraph.strip() for paragraph in text.split("\n\n")]
        paragraphs = [paragraph for paragraph in paragraphs if paragraph]

        if len(paragraphs) < 2:
            lines = [line.strip() for line in text.split("\n") if line.strip()]
            for index, line in enumerate(lines):
                if self._question_cue_re.match(line) or "?" in line:
                    stimulus = "\n".join(lines[:index]).strip() or None
                    question = "\n".join(lines[index:]).strip()
                    return stimulus, question
            return None, text

        for index, paragraph in enumerate(paragraphs):
            if self._question_cue_re.match(paragraph) or "?" in paragraph:
                stimulus = "\n\n".join(paragraphs[:index]).strip() or None
                question = "\n\n".join(paragraphs[index:]).strip()
                return stimulus, question

        return None, text

    def _markdown_before_text(self, markdown: str, text: str) -> str:
        if not text:
            return markdown
        first_line = next(
            (line.strip() for line in text.splitlines() if line.strip()), ""
        )
        if not first_line:
            return markdown

        for pattern in (
            re.escape(first_line),
            re.escape(first_line).replace(r"\ ", r"\s+"),
        ):
            match = re.search(pattern, markdown)
            if match:
                return markdown[: match.start()].strip()
        return markdown

    def _blocks_from_markdown(
        self,
        markdown: str | None,
        asset_map: dict[str, _Asset],
    ) -> list[ContentBlock]:
        if not markdown:
            return []

        blocks: list[ContentBlock] = []
        text_buffer: list[str] = []
        lines = markdown.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        index = 0

        def flush_text() -> None:
            text = "\n".join(text_buffer)
            text_buffer.clear()
            if text:
                blocks.extend(self._blocks_from_text_with_assets(text, asset_map))

        while index < len(lines):
            if self._is_markdown_table_start(lines, index):
                flush_text()
                table_lines: list[str] = []
                while index < len(lines) and "|" in lines[index]:
                    table_lines.append(lines[index])
                    index += 1
                html_content = self._markdown_table_to_html(table_lines)
                blocks.append(
                    TableBlock(
                        html=html_content,
                        asset=AssetRef(
                            url=self._html_data_url(html_content),
                            mime_type="text/html",
                            source_ref="markdown-table",
                        ),
                    )
                )
                continue

            text_buffer.append(lines[index])
            index += 1

        flush_text()
        return blocks

    def _blocks_from_text_with_assets(
        self,
        markdown: str,
        asset_map: dict[str, _Asset],
    ) -> list[ContentBlock]:
        blocks: list[ContentBlock] = []
        position = 0
        for match in self._asset_re.finditer(markdown):
            prefix = self._clean_text(markdown[position : match.start()])
            if prefix:
                blocks.append(TextBlock(text=prefix))

            ref = match.group(1) or match.group(2)
            if ref:
                asset = self._resolve_asset_ref(ref, asset_map)
                if asset.html:
                    blocks.append(TableBlock(html=asset.html, asset=asset.ref()))
                else:
                    blocks.append(ImageBlock(asset=asset.ref()))
            position = match.end()

        suffix = self._clean_text(markdown[position:])
        if suffix:
            blocks.append(TextBlock(text=suffix))

        return blocks

    def _multiple_choice_components(
        self,
        markdown: str,
        asset_map: dict[str, _Asset],
    ) -> tuple[str, list[ChoiceOption]]:
        markdown = self._normalize_inline_options(markdown)
        stem_lines: list[str] = []
        option_blocks: list[tuple[str, list[str]]] = []
        current_label: str | None = None
        current_lines: list[str] = []

        for line in markdown.split("\n"):
            match = self._option_line_re.match(line)
            label = (match.group(1) or match.group(2)) if match else None
            if match and label:
                if current_label is not None:
                    option_blocks.append((current_label, current_lines))
                current_label = label
                rest = match.group(3).strip()
                current_lines = [rest] if rest else []
                continue

            if current_label is None:
                stem_lines.append(line)
            else:
                current_lines.append(line)

        if current_label is not None:
            option_blocks.append((current_label, current_lines))

        labels = [label for label, _ in option_blocks]
        if len(labels) < 2 or not self._is_sequential_labels(labels):
            return self._image_choice_components(markdown, asset_map)

        options: list[ChoiceOption] = []
        for label, lines in option_blocks:
            option_markdown = "\n".join(lines).strip()
            content = self._blocks_from_markdown(option_markdown, asset_map)
            if not content:
                content = [TextBlock(text=" ")]
            options.append(ChoiceOption(label=label, content=content))

        return "\n".join(stem_lines).strip(), options

    def _image_choice_components(
        self,
        markdown: str,
        asset_map: dict[str, _Asset],
    ) -> tuple[str, list[ChoiceOption]]:
        refs = self._asset_refs(markdown)
        if len(refs) < 3:
            return markdown, []

        answer_refs = refs[-4:] if len(refs) >= 4 else refs
        labels = [chr(ord("A") + index) for index in range(len(answer_refs))]
        options = [
            ChoiceOption(
                label=label,
                content=[
                    ImageBlock(asset=self._resolve_asset_ref(ref, asset_map).ref())
                ],
            )
            for label, ref in zip(labels, answer_refs)
        ]
        return self._remove_asset_refs(markdown, set(answer_refs)), options

    def _asset_refs(self, markdown: str) -> list[str]:
        refs: list[str] = []
        for match in self._asset_re.finditer(markdown):
            ref = match.group(1) or match.group(2)
            if ref:
                refs.append(ref)
        return refs

    def _remove_asset_refs(self, markdown: str, refs: set[str]) -> str:
        def replace(match: re.Match[str]) -> str:
            ref = match.group(1) or match.group(2)
            return "" if ref in refs else match.group(0)

        cleaned = self._asset_re.sub(replace, markdown)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return cleaned.strip()

    def _resolve_asset_ref(
        self,
        ref: str,
        asset_map: dict[str, _Asset],
    ) -> _Asset:
        if ref in asset_map:
            return asset_map[ref]

        mime_type = self._mime_type_for_ref(ref)
        if ref.startswith("data:"):
            mime_type = ref.split(";", 1)[0].removeprefix("data:") or mime_type

        return _Asset(
            url=ref,
            mime_type=mime_type,
            source_ref=ref,
        )

    def _normalize_inline_options(self, markdown: str) -> str:
        return self._inline_option_re.sub(r"\n\1. ", markdown)

    def _clean_page_markdown(self, markdown: str) -> str:
        if "Answer Booklet" in markdown and "Question " not in markdown:
            return ""
        if "extra writing space" in markdown.lower() and "Question " not in markdown:
            return ""
        if "reference sheet" in markdown.lower() and "Question " not in markdown:
            return ""

        cleaned_lines: list[str] = []
        for raw_line in markdown.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
            line = raw_line.strip()
            if self._is_noise_line(line):
                continue
            cleaned_lines.append(raw_line.rstrip())

        cleaned = "\n".join(cleaned_lines)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return cleaned.strip()

    def _is_noise_line(self, line: str) -> bool:
        if not line:
            return False

        normalized = line.replace("\u2013", "-")
        if re.fullmatch(r"-\s*\d+\s*-", normalized):
            return True
        if re.fullmatch(r"\d{10}", normalized):
            return True
        if re.fullmatch(r"[.\s]{8,}", normalized):
            return True
        if re.fullmatch(
            r"Question\s+\d+\s+continues\s+on\s+page\s+\d+", normalized, re.IGNORECASE
        ):
            return True
        if re.fullmatch(r"End of Question\s+\d+", normalized, re.IGNORECASE):
            return True
        if re.fullmatch(
            r"Questions\s+\d+\s*[-\u2013]\s*\d+\s+are worth .*", line, re.IGNORECASE
        ):
            return True

        boilerplate_patterns = (
            r"office use only",
            r"do\s+not\s+write",
            r"please turn over",
            r"end of paper",
            r"extra writing space",
            r"clearly indicate which question",
            r"copyright|Â©",
        )
        if any(
            re.search(pattern, normalized, re.IGNORECASE)
            for pattern in boilerplate_patterns
        ):
            return True
        if any(pattern.search(normalized) for pattern in self.boilerplate_patterns):
            return True
        if "\u00a9" in normalized:
            return True
        if "education standards authority" in normalized.lower():
            return True

        reversed_tokens = {"aera", "siht", "ni", "etirw", "ton", "od"}
        return normalized.strip(".").lower() in reversed_tokens

    def _remove_standalone_numeric_lines(self, markdown: str) -> str:
        return re.sub(r"(?m)^\s*\d{1,2}\s*$", "", markdown)

    def _clean_text(self, markdown: str) -> str:
        text = markdown.replace("\x00", "")
        text = re.sub(r"(?m)^\s*#{1,6}\s*", "", text)
        text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
        text = re.sub(r"__([^_]+)__", r"\1", text)
        text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", text)
        text = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", text)
        text = re.sub(r"(?m)^\s*\.{8,}\s*$", "", text)
        text = re.sub(
            r"(?im)^\s*Question\s+\d+\s+continues\s+on\s+page\s+\d+\s*$",
            "",
            text,
        )
        text = re.sub(r"[^\S\n]+", " ", text)
        text = re.sub(r" *\n *", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = self._mark_re.sub("", text)
        return text.strip()

    def _strip_markdown_tables(self, markdown: str) -> str:
        lines = markdown.splitlines()
        kept: list[str] = []
        index = 0
        while index < len(lines):
            if self._is_markdown_table_start(lines, index):
                while index < len(lines) and "|" in lines[index]:
                    index += 1
                continue
            kept.append(lines[index])
            index += 1
        return "\n".join(kept)

    def _is_markdown_table_start(self, lines: list[str], index: int) -> bool:
        if index + 1 >= len(lines):
            return False
        if "|" not in lines[index] or "|" not in lines[index + 1]:
            return False
        return bool(
            re.fullmatch(
                r"\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*", lines[index + 1]
            )
        )

    def _markdown_table_to_html(self, lines: list[str]) -> str:
        rows = [self._split_table_row(line) for line in lines if "|" in line]
        if len(rows) < 2:
            return f"<pre>{html.escape(chr(10).join(lines))}</pre>"

        headers = rows[0]
        body = rows[2:]
        header_html = "".join(f"<th>{html.escape(cell)}</th>" for cell in headers)
        body_html = "".join(
            "<tr>" + "".join(f"<td>{html.escape(cell)}</td>" for cell in row) + "</tr>"
            for row in body
        )
        return f"<table><thead><tr>{header_html}</tr></thead><tbody>{body_html}</tbody></table>"

    def _split_table_row(self, line: str) -> list[str]:
        stripped = line.strip()
        if stripped.startswith("|"):
            stripped = stripped[1:]
        if stripped.endswith("|"):
            stripped = stripped[:-1]
        return [cell.strip() for cell in stripped.split("|")]

    def _data_url(self, image_id: str, image_base64: str) -> str:
        if image_base64.startswith("data:"):
            return image_base64

        mime_type = self._mime_type_for_ref(image_id) or "image/jpeg"
        return f"data:{mime_type};base64,{image_base64}"

    def _table_html(self, table: dict[str, Any], content: str) -> str:
        table_format = (
            self._string_value(table.get("format_"))
            or self._string_value(table.get("format"))
            or "html"
        )
        if table_format == "html":
            return content
        if table_format == "markdown":
            return self._markdown_table_to_html(content.splitlines())
        return f"<pre>{html.escape(content)}</pre>"

    def _html_data_url(self, html_content: str) -> str:
        encoded = base64.b64encode(html_content.encode("utf-8")).decode("ascii")
        return f"data:text/html;base64,{encoded}"

    def _mime_type_for_ref(self, ref: str) -> str | None:
        mime_type, _ = mimetypes.guess_type(ref)
        return mime_type

    def _as_list(self, value: Any) -> list[dict[str, Any]]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, dict)]

    def _string_value(self, value: Any) -> str | None:
        if isinstance(value, str) and value:
            return value
        return None
