from __future__ import annotations

import os

import pytest

from tppr_paper_utils import PaperExtractor
from tppr_paper_utils.parsers.mistral import MistralParser
from tppr_paper_utils.providers import OCROptions
from tppr_paper_utils.providers.mistral import MistralOCRProvider


def block_text(blocks) -> str:
    return "\n\n".join(block.text for block in blocks if block.kind == "text")


def parse_text(markdown: str):
    return MistralParser(paper_id="paper-1").parse_paper(markdown)


def test_multiple_choice_with_image_stimulus() -> None:
    paper = parse_text(
        """
9 The diagram shows the graph of  $y = f'(x)$ .

![img-13.jpeg](img-13.jpeg)

Given  $f(1) = 6$ , which interval includes the best estimate for  $f(1.1)$ ?

A. [6.2, 6.4)
B. [6.0, 6.2)
C. [5.8, 6.0)
D. [5.6, 5.8)
"""
    )

    question = paper.questions[0]

    assert question.number == 9
    assert question.type == "multiple_choice"
    assert block_text(question.stimulus).startswith("The diagram shows")
    assert question.stimulus[1].kind == "image"
    assert question.stimulus[1].asset.url == "img-13.jpeg"
    assert block_text(question.question).startswith("Given")
    assert [option.label for option in question.options] == ["A", "B", "C", "D"]
    assert block_text(question.options[0].content) == "[6.2, 6.4)"


def test_multiple_choice_with_markdown_table_stimulus() -> None:
    paper = parse_text(
        """
1 The probability distribution table for a discrete random variable $X$ is shown.

|  x | P(X=x)  |
| --- | --- |
|  1 | 0.4  |
|  2 | 0.2  |
|  3 |   |

What is the value of $P(X=3)$?

A. 0.2
B. 0.4
C. 1.2
D. 2.0
"""
    )

    question = paper.questions[0]

    assert question.type == "multiple_choice"
    assert question.stimulus[0].kind == "text"
    assert question.stimulus[1].kind == "table"
    assert "<table>" in question.stimulus[1].html
    assert question.stimulus[1].asset.url.startswith("data:text/html;base64,")
    assert block_text(question.question) == "What is the value of $P(X=3)$?"
    assert [block_text(option.content) for option in question.options] == [
        "0.2",
        "0.4",
        "1.2",
        "2.0",
    ]


def test_long_answer_questions_split_from_noisy_page() -> None:
    paper = parse_text(
        """
Do NOT write in this area.

# Question 12 (3 marks)

Find the equation of the tangent to $y = 5x^3 - \\frac{2}{x^2} - 9$ at the point $(1, -6)$.

3

# Question 13 (2 marks)

The numbers, 75, $p, q, 2025$, form a geometric sequence.

2

Find the values of $p$ and $q$.

Office Use Only - Do NOT write anything, or make any marks below this line.

7450310437
"""
    )

    q12, q13 = paper.questions

    assert q12.number == 12
    assert q12.marks == 3
    assert block_text(q12.stimulus) == ""
    assert block_text(q12.question).startswith("Find the equation")

    assert q13.number == 13
    assert q13.marks == 2
    assert block_text(q13.stimulus).startswith("The numbers, 75")
    assert block_text(q13.question) == "Find the values of $p$ and $q$."
    assert "\n2\n" not in block_text(q13.stimulus)


def test_multi_page_long_answer_continuation_and_parts() -> None:
    page_12 = """
# Question 14 (6 marks)

In a research study, participants were asked to record the number of minutes they spent watching television and the number of minutes they spent exercising each day over a period of 3 months. The averages for each participant were recorded and graphed.

![img-17.jpeg](img-17.jpeg)

(a) Describe the bivariate dataset in terms of its form and direction.

Form: ...

Direction: ...

# Question 14 continues on page 13

Office Use Only - Do NOT write anything, or make any marks below this line.

4619310431
"""
    page_13 = """
Question 14 (continued)

The equation of the least-squares regression line for this dataset is

$$
y = 64.3 - 0.7x.
$$

(b) Interpret the values of the slope and $y$-intercept of the regression line in the context of this dataset.

(c) Jo spends an average of 42 minutes per day watching television.

Use the equation of the regression line to determine how many minutes on average Jo is expected to exercise each day.

(d) Explain why it is NOT appropriate to extrapolate the regression line to predict the average number of minutes of exercise per day for someone who watches an average of 2 hours of television per day.

End of Question 14

Office Use Only - Do NOT write anything, or make any marks below this line.
6368310434
"""

    paper = MistralParser(paper_id="paper-1").parse_paper(
        {
            "pages": [
                {"page_number": 12, "markdown": page_12},
                {"page_number": 13, "markdown": page_13},
            ]
        }
    )

    question = paper.questions[0]

    assert question.number == 14
    assert question.pages == [12, 13]
    assert len(question.parts) == 4
    assert "research study" in block_text(question.stimulus)
    assert any(block.kind == "image" for block in question.stimulus)
    assert "least-squares regression line" in block_text(question.stimulus)
    assert question.parts[0].label == "a"
    assert block_text(question.parts[0].question).startswith("Describe")
    assert question.parts[2].label == "c"
    assert block_text(question.parts[2].stimulus).startswith("Jo spends")
    assert block_text(question.parts[2].question).startswith("Use the equation")
    assert question.parts[3].label == "d"


def test_supports_three_or_more_sequential_choice_labels() -> None:
    paper = parse_text(
        """
1 Pick the true statement.

A. one
B. two
C. three
"""
    )

    question = paper.questions[0]

    assert question.type == "multiple_choice"
    assert [option.label for option in question.options] == ["A", "B", "C"]


def test_multiple_choice_numeric_options_are_not_removed_as_mark_lines() -> None:
    paper = parse_text(
        """
10 The graph of $y = f(x)$, with all its stationary points, is shown.

![img-14.jpeg](img-14.jpeg)

How many stationary points does the graph of $y = f(e^{x})$ have?

A. 0
B. 1
C. 2
D. 3

© 2025 NSW Education Standards Authority
"""
    )

    question = paper.questions[0]

    assert question.number == 10
    assert block_text(question.question).startswith("How many stationary points")
    assert [block_text(option.content) for option in question.options] == [
        "0",
        "1",
        "2",
        "3",
    ]


def test_next_page_starting_new_question_is_not_a_continuation_page() -> None:
    page_6 = """
7 A ten-sided die has faces numbered 1 to 10.

The die is constructed so that the probability of obtaining the number 1 is greater than the probability of obtaining any of the other numbers. The numbers 2 to 10 are equally likely to occur.

When the die is rolled 153 times, a 1 is obtained 72 times.

By using the relative frequency of rolling a 1, which of the following is the best estimate for the probability of rolling a 10?

A.  $\\frac{1}{17}$
B.  $\\frac{1}{11}$
C.  $\\frac{1}{10}$
D.  $\\frac{1}{9}$

8 The minimum daily temperature, in degrees, of a town each year follows a normal distribution with its mean equal to its standard deviation. The minimum daily temperature was recorded over one year.

What percentage of the recorded minimum daily temperatures was above zero degrees?

A.  $16\\%$
B.  $50\\%$
C.  $68\\%$
D.  $84\\%$

- 6 -
"""
    page_7 = """
9 The diagram shows the graph of $y = f'(x)$.

![img-13.jpeg](img-13.jpeg)

Given $f(1) = 6$, which interval includes the best estimate for $f(1.1)$?

A. [6.2, 6.4)
B. [6.0, 6.2)
C. [5.8, 6.0)
D. [5.6, 5.8)

- 7 -
"""

    paper = MistralParser(paper_id="paper-1").parse_paper(
        {
            "pages": [
                {"page_number": 6, "markdown": page_6},
                {"page_number": 7, "markdown": page_7},
            ]
        }
    )

    q7, q8, q9 = paper.questions

    assert q7.pages == [6]
    assert q8.pages == [6]
    assert q9.pages == [7]
    assert [block_text(option.content) for option in q8.options] == [
        "$16\\%$",
        "$50\\%$",
        "$68\\%$",
        "$84\\%$",
    ]


def parse_pdf_fixture(path, provider):
    with open(path, "rb") as pdf:
        with PaperExtractor(pdf, filename=path.name) as extractor:
            extracted = extractor.extract(
                ocr_client=provider,
                options=OCROptions(include_images=True, include_tables=True),
            )

    return MistralParser(paper_id=path.stem).parse_paper(extracted)


@pytest.mark.skipif(
    os.getenv("RUN_PDF_OCR_TESTS") != "1" or not os.getenv("MISTRAL_API_KEY"),
    reason="PDF OCR tests require RUN_PDF_OCR_TESTS=1 and MISTRAL_API_KEY.",
)
def test_pdf_corpus_uses_common_parser_interface(pdf_fixture) -> None:
    paper = parse_pdf_fixture(pdf_fixture, MistralOCRProvider.from_env())

    assert paper.schema_version == "tppr.paper.v2"
    assert paper.questions
    assert all(question.schema_version == "tppr.question.v2" for question in paper.questions)
