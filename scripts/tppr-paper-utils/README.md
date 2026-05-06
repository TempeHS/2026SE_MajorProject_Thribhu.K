# tppr-paper-utils

utilities for extracting information from past papers and converting into a usable format (json) [which is then used in the tppr website]

## support
- [ ] hsc papers (in progress)

## usage

at its simplest:
```python
import json
import tppr_paper_utils

with open(PDF_PATH, "rb") as pdf:
    with tppr_paper_utils.TPPRExtractor(pdf) as extractor:
        extracted = extractor.extract()
        # converting to json
        json_data = json.dumps(extracted, indent=2)
        print(json_data)
```

## testing

this project uses `uv` and `pytest` for testing. to test, simply run this in the `scripts/tppr-paper-utils` directory:

```bash
uv run pytest
```
