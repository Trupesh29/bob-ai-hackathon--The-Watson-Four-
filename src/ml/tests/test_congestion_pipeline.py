"""
PortFlow AI — ML pipeline tests.

Tests cover:
  1. Dataset builder is deterministic (same seed → same rows)
  2. Feature columns are stable (match ALL_FEATURE_NAMES)
  3. Forbidden leakage columns are rejected
  4. Chronological splits do not overlap
  5. Saved pipeline reloads and predicts valid labels
  6. Probabilities are between 0 and 1
  7. Predicted labels are valid ("LOW", "MEDIUM", "HIGH")

All tests use the synthetic dataset (seed=2026) and do NOT require
a PostgreSQL database or backend to be running.

Synthetic data disclaimer: these tests validate pipeline mechanics only.
No real-world accuracy is implied.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Ensure src/ is on path
_SRC = Path(__file__).resolve().parent.parent.parent  # src/
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from data.generator import SyntheticDataset  # type: ignore[import]
from ml.congestion_dataset import (
    CongestionDatasetBuilder,
    CongestionWindowRow,
    FORBIDDEN_COLUMNS,
    _risk_label,
    build_default_dataset,
)
from ml.congestion_features import (
    ALL_FEATURE_NAMES,
    NUMERIC_FEATURES,
    CATEGORICAL_FEATURES,
    VALID_LABELS,
    chronological_split,
    rows_to_arrays,
)

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def rows():
    """Build the default dataset once per test module."""
    return build_default_dataset()


@pytest.fixture(scope="module")
def split_rows(rows):
    return chronological_split(rows)


# ---------------------------------------------------------------------------
# 1. Dataset builder is deterministic
# ---------------------------------------------------------------------------

def test_dataset_deterministic():
    """Same seed must always produce identical row count and first row."""
    rows_a = build_default_dataset()
    rows_b = build_default_dataset()
    assert len(rows_a) == len(rows_b), "Row count must be identical across runs"
    for a, b in zip(rows_a[:5], rows_b[:5]):
        assert a.window_start == b.window_start
        assert a.arrivals_in_window == b.arrivals_in_window
        assert a.risk_label == b.risk_label


def test_dataset_nonempty(rows):
    """Dataset must contain rows (synthetic data is not empty)."""
    assert len(rows) > 0, "Dataset must not be empty"


def test_dataset_has_all_scenarios(rows):
    """All 5 scenario names must appear in the dataset."""
    expected = {"baseline", "arrival_surge", "crane_outage", "berth_closure", "handling_slowdown"}
    found = {r.scenario for r in rows}
    assert expected <= found, f"Missing scenarios: {expected - found}"


# ---------------------------------------------------------------------------
# 2. Feature columns are stable
# ---------------------------------------------------------------------------

def test_feature_names_stable():
    """ALL_FEATURE_NAMES must not change between imports."""
    # Re-import to confirm stability
    from ml.congestion_features import ALL_FEATURE_NAMES as names
    assert names == ALL_FEATURE_NAMES
    assert len(names) > 0


def test_feature_extraction_keys(rows):
    """rows_to_arrays must return dicts with exactly ALL_FEATURE_NAMES as keys."""
    X_dicts, y = rows_to_arrays(rows[:10])
    assert len(X_dicts) == min(10, len(rows))
    for d in X_dicts:
        assert set(d.keys()) == set(ALL_FEATURE_NAMES), (
            f"Feature dict keys mismatch. "
            f"Extra: {set(d.keys()) - set(ALL_FEATURE_NAMES)}, "
            f"Missing: {set(ALL_FEATURE_NAMES) - set(d.keys())}"
        )


def test_labels_are_valid(rows):
    """All labels in the dataset must be in VALID_LABELS."""
    _, y = rows_to_arrays(rows)
    invalid = [lbl for lbl in y if lbl not in VALID_LABELS]
    assert not invalid, f"Invalid labels found: {invalid}"


# ---------------------------------------------------------------------------
# 3. Forbidden leakage columns are rejected
# ---------------------------------------------------------------------------

def test_forbidden_columns_not_in_features():
    """No FORBIDDEN_COLUMN must appear in ALL_FEATURE_NAMES."""
    overlap = set(ALL_FEATURE_NAMES) & FORBIDDEN_COLUMNS
    assert not overlap, (
        f"Leakage violation: forbidden columns in features: {overlap}"
    )


def test_leakage_guard_raises_on_forbidden_feature():
    """rows_to_arrays must raise ValueError if a forbidden column is requested."""
    # Manually inject a forbidden column into a row dict
    import pytest
    from ml.congestion_features import FORBIDDEN_COLUMNS

    # Temporarily patch ALL_FEATURE_NAMES to include a forbidden column
    import ml.congestion_features as feats
    original = feats.ALL_FEATURE_NAMES[:]
    feats.ALL_FEATURE_NAMES = original + ["waiting_minutes"]
    try:
        ds = SyntheticDataset(seed=2026).generate()
        row_objects = CongestionDatasetBuilder(ds).build()[:1]
        with pytest.raises(ValueError, match="Leakage guard"):
            rows_to_arrays(row_objects)
    finally:
        feats.ALL_FEATURE_NAMES = original


# ---------------------------------------------------------------------------
# 4. Chronological splits do not overlap
# ---------------------------------------------------------------------------

def test_splits_no_time_overlap(split_rows):
    """Train/val/test splits must not share any time windows."""
    train, val, test = split_rows
    if not train or not val or not test:
        pytest.skip("Split produced empty partition — dataset too small")

    train_starts = {r.window_start for r in train}
    val_starts = {r.window_start for r in val}
    test_starts = {r.window_start for r in test}

    tv_overlap = train_starts & val_starts
    vt_overlap = val_starts & test_starts
    tt_overlap = train_starts & test_starts

    assert not tv_overlap, f"Train/val overlap: {tv_overlap}"
    assert not vt_overlap, f"Val/test overlap: {vt_overlap}"
    assert not tt_overlap, f"Train/test overlap: {tt_overlap}"


def test_splits_chronological_order(split_rows):
    """Max train time must precede min val time; max val must precede min test."""
    train, val, test = split_rows
    if not train or not val or not test:
        pytest.skip("Split produced empty partition — dataset too small")

    max_train = max(r.window_end for r in train)
    min_val = min(r.window_start for r in val)
    max_val = max(r.window_end for r in val)
    min_test = min(r.window_start for r in test)

    assert max_train <= min_val, (
        f"Train bleeds into val: train_max={max_train} > val_min={min_val}"
    )
    assert max_val <= min_test, (
        f"Val bleeds into test: val_max={max_val} > test_min={min_test}"
    )


def test_split_sizes_sum_to_total(rows, split_rows):
    """Train + val + test rows must equal total rows."""
    train, val, test = split_rows
    assert len(train) + len(val) + len(test) == len(rows)


# ---------------------------------------------------------------------------
# 5. Saved pipeline reloads
# ---------------------------------------------------------------------------

def test_pipeline_artefact_exists():
    """The saved pipeline file must exist after training."""
    pipeline_path = ARTIFACTS_DIR / "congestion_pipeline.joblib"
    if not pipeline_path.exists():
        pytest.skip(
            "Pipeline artefact not found — run: python -m ml.congestion_train"
        )
    import joblib
    pipeline = joblib.load(pipeline_path)
    assert pipeline is not None


def test_metadata_json_exists_and_valid():
    """metadata.json must exist and contain required keys."""
    meta_path = ARTIFACTS_DIR / "metadata.json"
    if not meta_path.exists():
        pytest.skip("metadata.json not found — run: python -m ml.congestion_train")
    with open(meta_path) as f:
        meta = json.load(f)
    required_keys = {
        "model_version", "data_source", "feature_names",
        "label_classes", "metrics", "limitations",
    }
    missing = required_keys - set(meta.keys())
    assert not missing, f"metadata.json missing keys: {missing}"
    assert meta["data_source"] == "synthetic", "data_source must be 'synthetic'"
    assert meta["feature_names"] == ALL_FEATURE_NAMES


# ---------------------------------------------------------------------------
# 6 & 7. Probabilities in [0,1] and predicted labels are valid
# ---------------------------------------------------------------------------

def test_pipeline_predictions_valid():
    """Pipeline must return valid labels with probabilities in [0, 1]."""
    pipeline_path = ARTIFACTS_DIR / "congestion_pipeline.joblib"
    if not pipeline_path.exists():
        pytest.skip("Pipeline not found — run: python -m ml.congestion_train")

    import joblib
    import pandas as pd

    pipeline = joblib.load(pipeline_path)
    rows = build_default_dataset()
    X_dicts, _ = rows_to_arrays(rows[:20])
    X = pd.DataFrame(X_dicts, columns=ALL_FEATURE_NAMES)

    labels = pipeline.predict(X)
    probas = pipeline.predict_proba(X)

    for lbl in labels:
        assert lbl in VALID_LABELS, f"Predicted label '{lbl}' not in VALID_LABELS"

    for row_p in probas:
        for p in row_p:
            assert 0.0 <= p <= 1.0, f"Probability {p} out of [0, 1]"
        assert abs(sum(row_p) - 1.0) < 1e-6, f"Probabilities do not sum to 1: {sum(row_p)}"
