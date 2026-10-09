"""Point persistence at a throwaway directory before the app (and its store) is imported."""

import os
import tempfile

os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="citypulse-test-")
os.environ.pop("GEMINI_API_KEY", None)
