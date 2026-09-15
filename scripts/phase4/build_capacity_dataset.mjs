import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import parquet from "parquetjs-lite";
import { readCsv, stringifyCsv } from "./csv.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const datasetDir = path.join(repoRoot, "data", "phase4_dataset");
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--output-dir")) {
  throw new Error("Usage: node build_capacity_dataset.mjs [--output-dir DIRECTORY]");
}
const processedDir = args.length ? path.resolve(args[1]) : path.join(datasetDir, "processed");

const sources = readCsv(path.join(datasetDir, "sources.csv"));
const samples = readCsv(path.join(datasetDir, "samples.csv"));
const measurements = readCsv(path.join(datasetDir, "measurements.csv"));
const sourceById = new Map(sources.map((row) => [row.source_id, row]));
const sampleById = new Map(samples.map((row) => [row.sample_id, row]));

const columns = [
  "measurement_id",
  "sample_id",
  "source_id",
  "paper_id",
  "experiment_group_id",
  "catalyst_system_group",
  "base_material",
  "material_class",
  "catalyst_additive",
  "catalyst_family",
  "catalyst_composition",
  "catalyst_components",
  "catalyst_elements",
  "support_material",
  "catalyst_loading_wt_pct",
  "preparation_method",
  "milling_time_h",
  "milling_speed_rpm",
  "ball_to_powder_ratio",
  "mgh2_particle_size_raw",
  "catalyst_particle_size_raw",
  "measurement_mode",
  "experimental_method",
  "temperature_c",
  "pressure_bar",
  "pressure_relation",
  "duration_seconds",
  "hydrogen_capacity_wt_pct",
  "capacity_basis",
  "value_qualifier",
  "extraction_type",
  "source_pdf_page",
  "source_locator"
];

const rows = measurements
  .filter((measurement) => measurement.include_in_default_training === "true")
  .map((measurement) => {
    const sample = sampleById.get(measurement.sample_id);
    const source = sourceById.get(measurement.source_id);
    if (!sample || !source) throw new Error(`Broken foreign key for ${measurement.measurement_id}`);
    if (source.dataset_scope !== "core_mgh2" || source.included_in_capacity_training !== "true") {
      throw new Error(`Ineligible source reached training data: ${measurement.source_id}`);
    }
    return {
      measurement_id: measurement.measurement_id,
      sample_id: sample.sample_id,
      source_id: source.source_id,
      paper_id: source.paper_id,
      experiment_group_id: sample.experiment_group_id,
      catalyst_system_group: sample.catalyst_system_group,
      base_material: sample.base_material,
      material_class: sample.material_class,
      catalyst_additive: sample.catalyst_additive_raw,
      catalyst_family: sample.catalyst_family,
      catalyst_composition: sample.catalyst_composition,
      catalyst_components: sample.catalyst_components,
      catalyst_elements: sample.catalyst_elements,
      support_material: sample.support_material,
      catalyst_loading_wt_pct: sample.additive_loading_wt_pct,
      preparation_method: sample.preparation_method,
      milling_time_h: sample.milling_time_h,
      milling_speed_rpm: sample.milling_speed_rpm,
      ball_to_powder_ratio: sample.ball_to_powder_ratio,
      mgh2_particle_size_raw: sample.mgh2_particle_size_raw,
      catalyst_particle_size_raw: sample.catalyst_particle_size_raw,
      measurement_mode: measurement.measurement_mode,
      experimental_method: measurement.experiment_type,
      temperature_c: measurement.temperature_c,
      pressure_bar: measurement.pressure_bar,
      pressure_relation: measurement.pressure_relation,
      duration_seconds: measurement.duration_seconds,
      hydrogen_capacity_wt_pct: measurement.hydrogen_capacity_wt_pct,
      capacity_basis: measurement.capacity_basis,
      value_qualifier: measurement.value_qualifier,
      extraction_type: measurement.extraction_type,
      source_pdf_page: measurement.source_pdf_page,
      source_locator: measurement.source_locator
    };
  })
  .sort((left, right) => left.measurement_id.localeCompare(right.measurement_id));

for (const row of rows) {
  for (const field of ["temperature_c", "duration_seconds", "hydrogen_capacity_wt_pct"]) {
    const value = Number(row[field]);
    if (row[field] === "" || !Number.isFinite(value) || value < 0) {
      throw new Error(`${row.measurement_id} has invalid required numeric field ${field}`);
    }
  }
}

fs.mkdirSync(processedDir, { recursive: true });
const csvPath = path.join(processedDir, "capacity_training.csv");
const parquetPath = path.join(processedDir, "capacity_training.parquet");
fs.writeFileSync(csvPath, stringifyCsv(rows, columns), "utf8");

const numericFields = new Set([
  "catalyst_loading_wt_pct",
  "milling_time_h",
  "milling_speed_rpm",
  "temperature_c",
  "pressure_bar",
  "duration_seconds",
  "hydrogen_capacity_wt_pct",
  "source_pdf_page"
]);
const parquetSchema = new parquet.ParquetSchema(Object.fromEntries(columns.map((column) => [
  column,
  numericFields.has(column) ? { type: "DOUBLE", optional: true } : { type: "UTF8", optional: true }
])));

const writer = await parquet.ParquetWriter.openFile(parquetSchema, parquetPath);
for (const row of rows) {
  const typed = {};
  for (const column of columns) {
    const value = row[column];
    if (value === "" || value === null || value === undefined) continue;
    typed[column] = numericFields.has(column) ? Number(value) : value;
  }
  await writer.appendRow(typed);
}
await writer.close();

console.log(`Wrote ${rows.length} rows x ${columns.length} columns`);
console.log(path.relative(repoRoot, csvPath));
console.log(path.relative(repoRoot, parquetPath));
