from __future__ import annotations

import pdfplumber

Rect = tuple[float, float, float, float]


def rect_intersects(a: Rect, b: Rect) -> bool:
    return a[0] <= b[2] and a[2] >= b[0] and a[1] <= b[3] and a[3] >= b[1]


def rect_intersection(a: Rect, b: Rect) -> Rect:
    return (
        max(a[0], b[0]),
        max(a[1], b[1]),
        min(a[2], b[2]),
        min(a[3], b[3]),
    )


def union_rects(rects: list[Rect]) -> Rect:
    return (
        min(rect[0] for rect in rects),
        min(rect[1] for rect in rects),
        max(rect[2] for rect in rects),
        max(rect[3] for rect in rects),
    )


def expand_rect(
    rect: Rect,
    x_padding: float,
    y_padding: float,
    page: pdfplumber.page.Page,
) -> Rect:
    return (
        max(0, rect[0] - x_padding),
        max(0, rect[1] - y_padding),
        min(page.width, rect[2] + x_padding),
        min(page.height, rect[3] + y_padding),
    )


def word_center_inside(word: dict, rect: Rect) -> bool:
    x = (word["x0"] + word["x1"]) / 2
    y = (word["top"] + word["bottom"]) / 2
    return rect[0] <= x <= rect[2] and rect[1] <= y <= rect[3]


def group_words_by_line(words: list[dict], tolerance: float = 4) -> list[list[dict]]:
    lines = []
    for word in sorted(words, key=lambda item: (item["top"], item["x0"])):
        for line in lines:
            if abs(line[0]["top"] - word["top"]) <= tolerance:
                line.append(word)
                break
        else:
            lines.append([word])

    return [sorted(line, key=lambda item: item["x0"]) for line in lines]


def words_on_line(
    words: list[dict], top: float, tolerance: float = 3
) -> list[dict]:
    return sorted(
        [word for word in words if abs(word["top"] - top) <= tolerance],
        key=lambda word: word["x0"],
    )
