import base64
import io
from pathlib import Path

from PIL import Image

import tppr_paper_utils
from tppr_paper_utils import PaperManifest

TEST_DIR = Path(__file__).parent
PDF_PATH = TEST_DIR / "2025-hsc-maths-advanced.pdf"
extracted: PaperManifest | None = None


def extract_test_paper() -> PaperManifest:
    global extracted

    if extracted is not None:
        return extracted

    with open(PDF_PATH, "rb") as pdf:
        with tppr_paper_utils.TPPRExtractor(pdf) as extractor:
            extracted = extractor.extract()
            return extracted


def assert_transparent_png(encoded: str):
    # ensures that the images found in the stimulus/question are transparent.
    image = Image.open(io.BytesIO(base64.b64decode(encoded)))
    assert image.mode == "RGBA"

    alpha = image.getchannel("A")
    assert alpha.getextrema() == (0, 255)


def test_extraction():
    data = extract_test_paper()

    assert data["metadata"] == {
        "year": 2025,
        "paper": "Mathematics Advanced",
        "sections": [
            {"name": "Section I", "marks": 10, "pages": "2-8"},
            {"name": "Section II", "marks": 90, "pages": "9-40"},
        ],
    }

    questions = data["questions"]
    assert [question["number"] for question in questions] == list(range(1, 11))

    # question 1
    q1 = questions[0]
    assert q1["type"] == "multiple_choice"
    assert q1["stimulus"]["text"] == "The probability distribution table for a discrete random variable X is shown."
    assert q1["stimulus"]["image"] is not None
    assert_transparent_png(q1["stimulus"]["image"])
    assert q1["question"] == r"What is the value of $P(X = 3)$?"
    assert q1["options"] == [
        {"label": "A", "text": "$0.2$"},
        {"label": "B", "text": "$0.4$"},
        {"label": "C", "text": "$1.2$"},
        {"label": "D", "text": "$2.0$"},
    ]

    # question 2
    q2 = questions[1]
    assert q2["type"] == "multiple_choice"
    assert q2["stimulus"]["text"] is None
    assert q2["stimulus"]["image"] is None
    assert q2["question"] == r"Which graph could represent $y = 4^{x}$?"
    assert [option["label"] for option in q2["options"]] == ["A", "B", "C", "D"]
    assert all(option["text"] == "" and option["image"] is not None for option in q2["options"])

    # question 3
    q3 = questions[2]
    assert q3["type"] == "multiple_choice"
    assert q3["stimulus"]["text"] is None
    assert q3["stimulus"]["image"] is None
    assert q3["question"] == r"What is the domain of the function $y = \sqrt{6 - x^{2}}$?"
    assert q3["options"] == [
        {"label": "A", "text": r"$(0, \sqrt{6})$"},
        {"label": "B", "text": r"$[0, \sqrt{6}]$"},
        {"label": "C", "text": r"$(-\sqrt{6}, \sqrt{6})$"},
        {"label": "D", "text": r"$[-\sqrt{6}, \sqrt{6}]$"},
    ]

    # question 4
    q4 = questions[3]
    assert all(option["text"] == "" and option["image"] is not None for option in q4["options"])

    # long stimulus text keeps paragraph breaks instead of one fat paragraph
    q7 = questions[6]
    assert "\n\n" in q7["stimulus"]["text"]
    assert q7["question"].startswith("By using the relative frequency")

    # question 9
    q9 = questions[8]
    assert q9["options"][0]["text"] == "$[6.2, 6.4)$"
    assert q9["options"][3]["text"] == "$[5.6, 5.8)$"
