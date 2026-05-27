from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from tppr_paper_utils.models import ParsedPaper, ParsedQuestion
from tppr_paper_utils.parsers.mistral import MistralParser


class ParserProvider(ABC):
    """
    Just like an OCRProvider, a ParserProvider converts the output
    of an OCRProvider into the correct json schema.
    """

    @abstractmethod
    def parse_paper(
        self,
        ocr_output: Any,
        *,
        paper_id: str | None = None,
    ) -> ParsedPaper:
        raise NotImplementedError

    @abstractmethod
    def parse_questions(
        self,
        ocr_output: Any,
        *,
        paper_id: str | None = None,
    ) -> list[ParsedQuestion]:
        raise NotImplementedError

    def parse(
        self,
        ocr_output: Any,
        *,
        paper_id: str | None = None,
    ) -> list[dict[str, Any]]:
        return [
            question.model_dump(mode="json", exclude_none=True)
            for question in self.parse_questions(ocr_output, paper_id=paper_id)
        ]


__all__ = ["MistralParser", "ParserProvider"]
