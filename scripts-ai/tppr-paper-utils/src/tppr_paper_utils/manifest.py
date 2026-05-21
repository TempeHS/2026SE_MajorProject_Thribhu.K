from __future__ import annotations

from typing import Literal, NotRequired, TypedDict


class SectionManifest(TypedDict):
    name: str
    marks: int
    pages: str


class PaperMetadataManifest(TypedDict, total=False):
    year: int
    paper: str
    sections: list[SectionManifest]


class StimulusManifest(TypedDict):
    text: str | None
    image: str | None


class QuestionOptionManifest(TypedDict):
    label: str
    text: str
    image: NotRequired[str]


class MultipleChoiceQuestionManifest(TypedDict):
    number: int
    type: Literal["multiple_choice"]
    stimulus: StimulusManifest
    question: str
    options: list[QuestionOptionManifest]
    page: int


class PaperManifest(TypedDict):
    metadata: PaperMetadataManifest
    questions: list[MultipleChoiceQuestionManifest]
