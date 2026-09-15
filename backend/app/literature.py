"""Read-only canonical evidence. Unknown conditions never act as wildcards."""

import csv
from pathlib import Path
from app.scientific_schemas import LiteratureObservation, ScientificInputs

DATASET = Path(__file__).resolve().parents[2] / "data" / "phase4_dataset"


def read_table(path, identifier):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if len({row[identifier] for row in rows}) != len(rows):
        raise ValueError("Duplicate canonical identifier")
    return {row[identifier]: row for row in rows}


def number(row, field):
    return float(row[field]) if row[field] else None


class LiteratureIndex:
    def __init__(self, dataset=DATASET):
        sources = read_table(dataset / "sources.csv", "source_id")
        samples = read_table(dataset / "samples.csv", "sample_id")
        measurements = read_table(dataset / "measurements.csv", "measurement_id")
        self.items = []
        for record in measurements.values():
            source = sources[record["source_id"]]
            sample = samples[record["sample_id"]]
            if sample["source_id"] != record["source_id"]:
                raise ValueError("Canonical source/sample mismatch")
            if source["dataset_scope"] != "core_mgh2":
                continue
            if (source["full_text_verified"] != "true"
                    or source["source_type"] != "primary_experimental_article"
                    or record["measurement_mode"] not in ("absorption", "desorption")
                    or record["cycle_number"]):
                raise ValueError("Unexpected evidence in core capacity table")
            temperature = number(record, "temperature_c")
            pressure = number(record, "pressure_bar")
            inputs = ScientificInputs(
                sample_id=sample["sample_id"], base_material=sample["base_material"],
                measurement_mode=record["measurement_mode"], temperature_c=temperature,
                temperature_reported=record["temperature_raw"] if temperature is None else None,
                duration_seconds=number(record, "duration_seconds"),
                catalyst_loading_wt_pct=number(sample, "additive_loading_wt_pct"),
                catalyst_family=sample["catalyst_family"], catalyst_elements=sample["catalyst_elements"],
                catalyst_components=sample["catalyst_components"], support_material=sample["support_material"] or None,
                pressure_bar=pressure, pressure_relation=(record["pressure_relation"] or "=") if pressure is not None else None,
                preparation_method=sample["preparation_method"] or None,
            )
            self.items.append(LiteratureObservation(
                measurement_id=record["measurement_id"], sample_label=sample["sample_label"], inputs=inputs,
                **{field: number(record, field) for field in (
                    "hydrogen_capacity_wt_pct", "capacity_lower_wt_pct", "capacity_upper_wt_pct", "reported_uncertainty_wt_pct",
                )},
                **{field: record[field] for field in (
                    "value_qualifier", "capacity_basis", "temperature_raw", "pressure_raw", "duration_raw",
                )},
                sample_note=sample["sample_note"],
                preparation={field: sample[field] for field in (
                    "preparation_method", "milling_time_h", "milling_speed_rpm", "ball_to_powder_ratio",
                    "milling_atmosphere", "catalyst_synthesis_method", "catalyst_pretreatment",
                    "mgh2_particle_size_raw", "catalyst_particle_size_raw",
                )},
                source={
                    **{field: source[field] for field in ("source_id", "paper_id", "title", "doi", "year")},
                    **{field: record[field] for field in ("source_pdf_page", "source_locator", "extraction_type", "extraction_note")},
                },
            ))
        if not self.items:
            raise ValueError("No verified core literature observations")
        self.samples = {item.inputs.sample_id for item in self.items}

    def match(self, inputs):
        # A sample ID carries preparation/identity information that estimator features do not.
        if inputs.sample_id is None:
            return []
        return [item for item in self.items if item.inputs == inputs]
