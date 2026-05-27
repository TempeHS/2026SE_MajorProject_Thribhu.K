from __future__ import annotations

from pathlib import Path

import pytest

TEST_DIR = Path(__file__).parent
PDF_FIXTURES = [
    TEST_DIR / "2020-hsc-mathematics-advanced.pdf",
    TEST_DIR / "2024-hsc-maths-ext-1.pdf",
    TEST_DIR / "2025-hsc-maths-advanced.pdf",
]


@pytest.fixture(params=PDF_FIXTURES, ids=lambda path: path.name)
def pdf_fixture(request: pytest.FixtureRequest) -> Path:
    path = request.param
    if not path.exists():
        pytest.skip(f"PDF fixture is missing: {path.name}")
    return path
