import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import parquet from "parquetjs-lite";
import { readCsv } from "./csv.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const datasetDir = path.join(repoRoot, "data", "phase4_dataset");
const processedDir = path.join(datasetDir, "processed");
const acquisitionDir = path.join(repoRoot, "data", "phase4_data_sources", "acquisition");
const tables = {
  sources: readCsv(path.join(datasetDir, "sources.csv")),
  samples: readCsv(path.join(datasetDir, "samples.csv")),
  measurements: readCsv(path.join(datasetDir, "measurements.csv")),
  activation: readCsv(path.join(datasetDir, "activation_energies.csv")),
  cycling: readCsv(path.join(datasetDir, "cycling.csv")),
  thermal: readCsv(path.join(datasetDir, "thermal_events.csv"))
};

let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}

for (const [tableName, rows] of Object.entries(tables)) {
  for (const [rowIndex, row] of rows.entries()) {
    for (const [field, value] of Object.entries(row)) {
      check(
        value === "" || value.trim().length > 0,
        `${tableName} CSV row ${rowIndex + 2} field ${field} must not contain only whitespace`
      );
    }
  }
}

function unique(rows, field) {
  const values = rows.map((row) => row[field]);
  check(values.every(Boolean), `${field} must be populated`);
  check(new Set(values).size === values.length, `${field} must be unique`);
}

unique(tables.sources, "source_id");
unique(tables.samples, "sample_id");
unique(tables.measurements, "measurement_id");
unique(tables.activation, "activation_id");
unique(tables.cycling, "cycling_id");
unique(tables.thermal, "thermal_event_id");

const sources = new Map(tables.sources.map((row) => [row.source_id, row]));
const samples = new Map(tables.samples.map((row) => [row.sample_id, row]));
for (const sample of tables.samples) check(sources.has(sample.source_id), `${sample.sample_id} source FK`);
for (const [tableName, rows] of Object.entries({ measurements: tables.measurements, activation: tables.activation, cycling: tables.cycling, thermal: tables.thermal })) {
  for (const row of rows) {
    check(samples.has(row.sample_id), `${tableName} ${row.sample_id} sample FK`);
    check(sources.has(row.source_id), `${tableName} ${row.source_id} source FK`);
    check(samples.get(row.sample_id)?.source_id === row.source_id, `${tableName} sample/source agreement`);
    check(Boolean(row.source_pdf_page), `${tableName} ${row[Object.keys(row)[0]]} page provenance`);
    check(Boolean(row.source_locator), `${tableName} ${row[Object.keys(row)[0]]} locator provenance`);
    check(Boolean(row.extraction_type), `${tableName} ${row[Object.keys(row)[0]]} extraction provenance`);
  }
}

check(tables.sources.length === 18, "18 verified primary sources expected");
check(tables.sources.every((row) => row.source_type === "primary_experimental_article"), "primary sources only");
check(tables.sources.every((row) => row.full_text_verified === "true" && row.readable === "true"), "all sources verified/readable");
check(tables.sources.every((row) => row.doi && row.title && row.local_pdf_path && row.sha256 && row.page_count), "source provenance populated");

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--source-root")) {
  throw new Error("Usage: node validate_phase4_dataset.mjs [--source-root DIRECTORY]");
}
const sourceRoot = args.length ? path.resolve(args[1]) : null;
for (const source of tables.sources) {
  check(/^[a-f0-9]{64}$/.test(source.sha256), `${source.paper_id} source hash recorded`);
  if (!sourceRoot) continue;
  const pdfPath = path.resolve(sourceRoot, source.local_pdf_path);
  const relative = path.relative(sourceRoot, pdfPath);
  check(!relative.startsWith("..") && !path.isAbsolute(relative), "source path stays inside source root");
  check(fs.existsSync(pdfPath), `${source.paper_id} local PDF exists`);
  const bytes = fs.readFileSync(pdfPath);
  check(bytes.subarray(0, 5).toString() === "%PDF-", `${source.paper_id} PDF signature`);
  check(bytes.subarray(Math.max(0, bytes.length - 2048)).toString("latin1").includes("%%EOF"), `${source.paper_id} PDF EOF`);
  check(crypto.createHash("sha256").update(bytes).digest("hex") === source.sha256, `${source.paper_id} PDF checksum`);
}

const free17 = tables.sources.find((row) => row.paper_id === "FREE-17");
check(Boolean(free17), "FREE-17 source row exists");
check(free17.doi.toLowerCase() === "10.1016/s1003-6326(24)66565-9", "FREE-17 DOI identity");
check(free17.title === "Vermiform Ni@CNT derived from one-pot calcination of Ni-MOF precursor for improving hydrogen storage of MgH2", "FREE-17 title identity");
check(free17.page_count === "16", "FREE-17 page count");
check(free17.local_pdf_path === "data/phase4_data_sources/core_primary/carbon_supported/FREE-17__2024__Ni_at_CNT.pdf", "FREE-17 canonical path");
check(!fs.existsSync(path.join(repoRoot, "FREE-17__2024__Ni_at_CNT.pdf")), "no root FREE-17 duplicate");

const acquisitionRows = readCsv(path.join(acquisitionDir, "acquisition_log.csv"));
const free17Acquisition = acquisitionRows.find((row) => row.paper_id === "FREE-17");
check(Boolean(free17Acquisition), "FREE-17 acquisition row exists");
check(free17Acquisition.doi.toLowerCase() === free17.doi.toLowerCase(), "FREE-17 acquisition DOI matches dataset source");
check(free17Acquisition.local_filename === free17.local_pdf_path, "FREE-17 acquisition path matches canonical source");
check(free17Acquisition.primary_experimental === "true", "FREE-17 acquisition marks primary experiment");
check(free17Acquisition.downloaded === "true" && free17Acquisition.full_text_verified === "true", "FREE-17 acquisition marks verified local full text");
check(/original.+failed/i.test(free17Acquisition.notes) && /legitimate/i.test(free17Acquisition.notes), "FREE-17 acquisition preserves failed-route and legitimate-obtainment provenance");

const missingQueue = fs.readFileSync(path.join(acquisitionDir, "papers_no_pdf.txt"), "utf8");
check(!/FREE-17|10\.1016\/s1003-6326\(24\)66565-9/i.test(missingQueue), "FREE-17 absent from missing-paper queue");
check((missingQueue.match(/^https?:\/\//gm) ?? []).length === 33, "missing-paper queue has 33 unique unresolved URLs");

const verification = JSON.parse(fs.readFileSync(path.join(acquisitionDir, "verification_report.json"), "utf8"));
const free17Verification = verification.pdfs.find((row) => row.paper_id === "FREE-17");
check(Boolean(free17Verification), "FREE-17 verification-report record exists");
check(free17Verification.local_filename === free17.local_pdf_path, "FREE-17 verification-report path matches canonical source");
check(free17Verification.pages === 16 && free17Verification.opens === true, "FREE-17 verification-report readability and page count");
check(free17Verification.sha256 === free17.sha256, "FREE-17 verification-report checksum matches dataset source");
check(verification.core_articles === 16 && verification.available_scholarly_articles === 21 && verification.missing_doi_papers === 31, "acquisition summary counts reflect FREE-17 availability");

for (const measurement of tables.measurements) {
  if (measurement.hydrogen_capacity_wt_pct) {
    const value = Number(measurement.hydrogen_capacity_wt_pct);
    check(Number.isFinite(value) && value >= 0, `${measurement.measurement_id} nonnegative finite capacity`);
  }
  for (const field of ["temperature_c", "pressure_bar", "duration_seconds"]) {
    if (measurement[field] !== "") check(Number.isFinite(Number(measurement[field])) && Number(measurement[field]) >= 0, `${measurement.measurement_id} valid ${field}`);
  }
}
for (const row of tables.activation) check(Number.isFinite(Number(row.activation_energy_kj_mol)) && Number(row.activation_energy_kj_mol) >= 0, `${row.activation_id} valid activation energy`);
for (const row of tables.cycling) {
  if (row.hydrogen_capacity_wt_pct) check(Number(row.hydrogen_capacity_wt_pct) >= 0, `${row.cycling_id} valid capacity`);
  if (row.capacity_retention_pct) check(Number(row.capacity_retention_pct) >= 0, `${row.cycling_id} valid retention`);
}

const processedCsvPath = path.join(processedDir, "capacity_training.csv");
const processedParquetPath = path.join(processedDir, "capacity_training.parquet");
const processed = readCsv(processedCsvPath);
unique(processed, "measurement_id");
const eligibleIds = tables.measurements.filter((row) => row.include_in_default_training === "true").map((row) => row.measurement_id).sort();
check(JSON.stringify(processed.map((row) => row.measurement_id)) === JSON.stringify(eligibleIds), "processed rows exactly match canonical eligibility flags");
check(processed.every((row) => sources.get(row.source_id)?.dataset_scope === "core_mgh2"), "processed data uses core sources only");
check(processed.every((row) => Number.isFinite(Number(row.hydrogen_capacity_wt_pct)) && Number(row.hydrogen_capacity_wt_pct) >= 0), "processed targets finite and nonnegative");
check(processed.every((row) => row.measurement_mode === "absorption" || row.measurement_mode === "desorption"), "processed modes are ordinary absorption/desorption");
check(processed.every((row) => row.temperature_c && row.duration_seconds), "processed rows have numeric temperature and duration");
check(processed.every((row) => !tables.cycling.some((cycle) => cycle.cycling_id === row.measurement_id)), "cycling excluded from processed data");
check(processed.every((row) => row.source_id && row.paper_id && row.sample_id && row.source_pdf_page && row.source_locator), "processed provenance populated");
check(processed.every((row) => tables.measurements.some((measurement) => measurement.measurement_id === row.measurement_id && measurement.sample_id === row.sample_id && measurement.source_id === row.source_id)), "processed rows resolve to canonical measurements");
const forbiddenPattern = /synthetic|demo|seed_data|phase[_ -]?3/i;
check(processed.every((row) => !Object.values(row).some((value) => forbiddenPattern.test(String(value)))), "no Phase 3 synthetic/demo content");
check(!Object.keys(processed[0]).some((field) => /train|test|split|fold/i.test(field)), "no split/fold baked into dataset");

const duplicateKey = (row) => [row.sample_id, row.measurement_mode, row.temperature_c, row.pressure_bar, row.pressure_relation, row.duration_seconds, row.hydrogen_capacity_wt_pct].join("|");
check(new Set(processed.map(duplicateKey)).size === processed.length, "no exact duplicate processed observations");

const numericFields = new Set(["catalyst_loading_wt_pct", "milling_time_h", "milling_speed_rpm", "temperature_c", "pressure_bar", "duration_seconds", "hydrogen_capacity_wt_pct", "source_pdf_page"]);
const parquetReader = await parquet.ParquetReader.openFile(processedParquetPath);
const cursor = parquetReader.getCursor();
const parquetRows = [];
let parquetRow;
while ((parquetRow = await cursor.next())) parquetRows.push(parquetRow);
await parquetReader.close();
check(parquetRows.length === processed.length, "CSV and Parquet row counts match");
for (let index = 0; index < processed.length; index += 1) {
  for (const field of Object.keys(processed[index])) {
    const csvValue = processed[index][field];
    const parquetValue = parquetRows[index][field];
    if (csvValue === "") check(parquetValue === null || parquetValue === undefined, `Parquet null equivalence ${index}:${field}`);
    else if (numericFields.has(field)) check(Number(csvValue) === parquetValue, `Parquet numeric equivalence ${index}:${field}`);
    else check(csvValue === parquetValue, `Parquet text equivalence ${index}:${field}`);
  }
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "h2-triad-dataset-"));
try {
  const baselineHashes = [sha256(processedCsvPath), sha256(processedParquetPath)];
  const build = () => spawnSync(process.execPath, [path.join(scriptDir, "build_capacity_dataset.mjs"), "--output-dir", temporaryDir], { cwd: repoRoot, encoding: "utf8" });
  const generatedHashes = () => ["capacity_training.csv", "capacity_training.parquet"].map((name) => sha256(path.join(temporaryDir, name)));
  const first = build();
  check(first.status === 0, `first deterministic rebuild: ${first.stderr}`);
  const firstHashes = generatedHashes();
  check(JSON.stringify(firstHashes) === JSON.stringify(baselineHashes), "regeneration matches checked-in CSV/Parquet bytes");
  const second = build();
  check(second.status === 0, `second deterministic rebuild: ${second.stderr}`);
  check(JSON.stringify(firstHashes) === JSON.stringify(generatedHashes()), "CSV/Parquet regeneration is byte-deterministic");
} finally {
  fs.rmSync(temporaryDir, { recursive: true, force: true });
}
console.log(sourceRoot ? "Source PDF hashes verified locally (18 primary papers)." : "Source PDFs not verified locally: omitted from public checkout; historical verification is recorded in provenance.");

for (const documentation of ["schema.md", "extraction_notes.md", "data_quality_report.md", "model_target_assessment.md"]) {
  check(fs.existsSync(path.join(datasetDir, documentation)), `${documentation} exists`);
}
const schemaText = fs.readFileSync(path.join(datasetDir, "schema.md"), "utf8");
check(schemaText.includes("pressure_bar") && schemaText.includes("1 MPa = 10 bar"), "normalized pressure convention documented");
check(schemaText.includes("empty CSV field") && schemaText.includes("null"), "missing-value convention documented");

const modes = Object.groupBy(processed, (row) => row.measurement_mode);
const missingness = Object.fromEntries(["pressure_bar", "catalyst_loading_wt_pct", "support_material", "milling_time_h", "milling_speed_rpm", "mgh2_particle_size_raw", "catalyst_particle_size_raw"].map((field) => [field, processed.filter((row) => row[field] === "").length]));
const extractionCounts = Object.groupBy(processed, (row) => row.extraction_type);
console.log(`PASS: ${checks} assertions`);
console.log(JSON.stringify({
  sources: tables.sources.length,
  core_sources: tables.sources.filter((row) => row.dataset_scope === "core_mgh2").length,
  samples: tables.samples.length,
  canonical_measurements: tables.measurements.length,
  usable_capacity_observations: processed.length,
  absorption: modes.absorption?.length ?? 0,
  desorption: modes.desorption?.length ?? 0,
  activation_energies: tables.activation.length,
  cycling_observations: tables.cycling.length,
  thermal_events: tables.thermal.length,
  author_reported: extractionCounts.author_reported_text?.length ?? 0,
  digitized: processed.filter((row) => row.extraction_type.includes("digitized")).length,
  missingness,
  dimensions: [processed.length, Object.keys(processed[0]).length]
}, null, 2));
