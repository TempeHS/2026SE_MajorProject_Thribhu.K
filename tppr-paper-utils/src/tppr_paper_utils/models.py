from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, model_validator

QuestionType = Literal["multiple_choice", "long_answer"]


class TPPRModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AssetRef(TPPRModel):
    url: str
    mime_type: str | None = None
    source_ref: str | None = None
    page: int | None = Field(default=None, ge=1)


class TextBlock(TPPRModel):
    kind: Literal["text"] = "text"
    text: str = Field(min_length=1)


class ImageBlock(TPPRModel):
    kind: Literal["image"] = "image"
    asset: AssetRef


class TableBlock(TPPRModel):
    kind: Literal["table"] = "table"
    html: str = Field(min_length=1)
    asset: AssetRef | None = None


ContentBlock = Annotated[
    TextBlock | ImageBlock | TableBlock,
    Field(discriminator="kind"),
]


class ChoiceOption(TPPRModel):
    label: str = Field(pattern=r"^[A-Z]+$")
    content: list[ContentBlock] = Field(min_length=1)


class QuestionPart(TPPRModel):
    label: str | None = Field(default=None, pattern=r"^[a-z]+$")
    stimulus: list[ContentBlock] = Field(default_factory=list)
    question: list[ContentBlock] = Field(min_length=1)
    marks: int | None = Field(default=None, ge=0)


class ParsedQuestion(TPPRModel):
    schema_version: Literal["tppr.question.v2"] = "tppr.question.v2"
    id: str
    paper_id: str = ""
    number: int = Field(ge=1)
    type: QuestionType
    marks: int = Field(default=0, ge=0)
    pages: list[int] = Field(default_factory=list)
    stimulus: list[ContentBlock] = Field(default_factory=list)
    question: list[ContentBlock] = Field(default_factory=list)
    parts: list[QuestionPart] = Field(default_factory=list)
    options: list[ChoiceOption] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_question_shape(self) -> "ParsedQuestion":
        if self.type == "multiple_choice" and len(self.options) < 2:
            raise ValueError("multiple_choice questions require at least two options")
        if not self.question and not self.parts:
            raise ValueError("questions require root question content or parts")
        return self


class ParsedPaper(TPPRModel):
    schema_version: Literal["tppr.paper.v2"] = "tppr.paper.v2"
    metadata: dict[str, Any] = Field(default_factory=dict)
    questions: list[ParsedQuestion] = Field(default_factory=list)


ParsedQuestionAdapter = TypeAdapter(ParsedQuestion)
ParsedPaperAdapter = TypeAdapter(ParsedPaper)


def to_jsonable(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json", exclude_none=True)
    if isinstance(value, list):
        return [to_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {key: to_jsonable(item) for key, item in value.items()}
    return value
