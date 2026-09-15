"""Protect the published Phase 5 output without fitting a replacement model."""

import subprocess
import sys
from pathlib import Path


def test_frozen_phase5_inference_fixture():
    # Package and standalone artifact aliases are intentionally isolated, as in
    # deployed application processes and the existing package-import test.
    subprocess.run([sys.executable, str(Path(__file__).resolve().parents[2]
                                       / "scripts/release/inference_smoke.py")], check=True)
