from __future__ import annotations

import pytest
from pydantic import ValidationError

from tppr_paper_utils.models import (
    AssetRef,
    ChoiceOption,
    ImageBlock,
    ParsedPaperAdapter,
    ParsedQuestion,
    ParsedQuestionAdapter,
    TextBlock,
)


def test_models_serialize_to_jsonable_dicts() -> None:
    question = ParsedQuestion(
        id="paper-1:q1",
        paper_id="paper-1",
        number=1,
        type="multiple_choice",
        marks=1,
        question=[TextBlock(text="What is 1 + 1?")],
        options=[
            ChoiceOption(label="A", content=[TextBlock(text="1")]),
            ChoiceOption(label="B", content=[TextBlock(text="2")]),
            ChoiceOption(
                label="C",
                content=[
                    ImageBlock(
                        asset=AssetRef(
                            url="img-c.png",
                            mime_type="image/png",
                            source_ref="img-c.png",
                        )
                    )
                ],
            ),
        ],
    )

    serialized = question.model_dump(mode="json", exclude_none=True)

    assert serialized["schema_version"] == "tppr.question.v2"
    assert serialized["options"][2]["content"][0]["kind"] == "image"
    assert "parts" in serialized


def test_question_validation_rejects_bad_content_block_kind() -> None:
    with pytest.raises(ValidationError):
        ParsedQuestionAdapter.validate_python(
            {
                "id": "paper-1:q1",
                "number": 1,
                "type": "long_answer",
                "question": [{"kind": "video", "url": "clip.mp4"}],
            }
        )


def test_question_validation_rejects_empty_multiple_choice_options() -> None:
    with pytest.raises(ValidationError):
        ParsedQuestion(
            id="paper-1:q1",
            number=1,
            type="multiple_choice",
            question=[TextBlock(text="Choose one.")],
            options=[],
        )


def test_generated_schema_contains_discriminated_content_blocks() -> None:
    schema = ParsedPaperAdapter.json_schema()
    defs = schema["$defs"]

    assert schema["properties"]["questions"]["items"]["$ref"] == "#/$defs/ParsedQuestion"
    assert "TextBlock" in defs
    assert "ImageBlock" in defs
    assert "TableBlock" in defs
    assert defs["ParsedQuestion"]["properties"]["type"]["enum"] == [
        "multiple_choice",
        "long_answer",
    ]
