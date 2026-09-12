"""Parameterized queries and mapping between flat storage and domain records."""

from app.database import INPUT_COLUMNS, connection
from app.schemas import DomainOptions, Experiment, Inputs


def experiment_from_row(row):
    return Experiment.model_validate(
        {
            "id": row["id"],
            "inputs": {key: row[key] for key in INPUT_COLUMNS},
            "hydrogen_capacity_wt_pct": row["hydrogen_capacity_wt_pct"],
            "outcome": row["outcome"],
            "measurement": {
                "mode": row["measurement_mode"],
                "duration_minutes": row["measurement_duration_minutes"],
                "capacity_basis": row["capacity_basis"],
            },
            "source": {
                "kind": row["source_kind"],
                "label": row["source_label"],
                "reference": row["source_reference"],
                "is_demo": bool(row["is_demo"]),
            },
        }
    )


def get_experiments(path, experiment_id=None, inputs=None):
    query = "SELECT * FROM experiments"
    parameters = ()
    if experiment_id is not None:
        query += " WHERE id = ?"
        parameters = (experiment_id,)
    elif inputs is not None:
        query += " WHERE " + " AND ".join(key + " = ?" for key in INPUT_COLUMNS)
        parameters = tuple(getattr(inputs, key) for key in INPUT_COLUMNS)
    with connection(path) as db:
        return [
            experiment_from_row(row)
            for row in db.execute(query + " ORDER BY id", parameters)
        ]


def get_options(path):
    records = get_experiments(path)
    # Preserve the demo starting point when available, without copying its inputs.
    default = next(
        (r for r in records if r.id == "EXP-003"), records[0] if records else None
    )
    constraints = {}
    steps = {"concentration_wt_pct": 0.5, "milling_hours": 0.5, "pressure_bar": 0.1}
    for name, definition in Inputs.model_json_schema()["properties"].items():
        if definition["type"] == "number":
            constraints[name] = {
                "min": definition["minimum"],
                "max": definition["maximum"],
                "step": steps.get(name, 1),
            }
    return DomainOptions(
        materials=sorted({r.inputs.material for r in records}),
        additives=[
            {"value": value, "allows_loading": value != "None"}
            for value in sorted({r.inputs.additive for r in records})
        ],
        methods=[
            {"value": value, "allows_milling": value == "Ball milling"}
            for value in sorted({r.inputs.preparation_method for r in records})
        ],
        numeric_constraints=constraints,
        default_inputs=default.inputs if default else None,
    )
