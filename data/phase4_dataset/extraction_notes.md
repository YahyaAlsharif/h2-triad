# Phase 4A extraction notes

## Method

All 18 locally available primary experimental PDFs were opened, identity-checked against title and DOI, and inspected page by page using their text layers. The extraction prioritized experimental sections, tables, results narratives, captions, and author-labelled values. The two local ACS supplements were also inspected; neither contributed records because its parent article is not locally available and positively linked as verified full text.

Each number was entered only when the paper explicitly tied it to a sample, mode, condition, and time or to a defined non-isothermal/activation/cycling result. Literature values cited only as prior work were ignored. Qualitative phrases such as rapid, high capacity, negligible, and almost complete were not converted to numbers.

No graph was digitized for this release. All 109 ML-ready observations are author-reported in prose, captions, or labelled result summaries. Graph-only curve points were intentionally omitted because the explicit values already support a defensible Model 1 dataset. This avoids false precision and removes any need to visually infer coordinates. Future graph digitization must add a distinct extraction type, tool/method, axis calibration, and precision estimate.

Repeated, explicitly stated time points from the same experimental curve are retained. Duplicate statements of the same point in an abstract and results section are recorded once, normally against the more specific results locator. Controls remain separate samples.

## Scope decisions

- The default processed table includes 16 core MgH2 papers and excludes both extended reactive-hydride sources.
- Cycling observations are canonical only in `cycling.csv`; they are excluded from the default capacity model.
- TPD/DSC onset and peak temperatures are in `thermal_events.csv`, never recast as isothermal measurement temperatures.
- Activation energies remain in their dedicated table and retain method/direction.
- `capacity_basis` is `sample mass` only where the result is reported as a composite/sample wt.% value. No catalyst-free-basis conversion was attempted.
- Room temperature is left textual and null numerically. Those observations remain canonical but are excluded from the default training view.
- A source-reported range of 6-7 wt.% in EXISTING-C is represented by lower/upper bounds with no invented midpoint.
- A greater-than capacity threshold is preserved with its qualifier and excluded from the scalar-target view.

## Unit normalization

Kelvin-to-Celsius, MPa-to-bar, and time-to-seconds conversions are exact arithmetic. Original representations stay in the canonical record. FREE-17's text layer reports a dehydrogenation pressure as `-0.0001 MPa`; because negative absolute pressure is physically ambiguous and the gauge convention is not stated, the raw string is preserved and `pressure_bar` is null.

FREE-17 reports 60 g of milling balls and a 2 g sample. The sample table records the exact arithmetic ratio 30:1 and identifies this normalization in its note. No comparable ratio was derived where the component masses were absent.

## Conflicts and precision

- FREE-14 reports 3.70 wt.% for a 75 C absorption point in the results and 3.86 wt.% in the conclusion. The results-section value is retained once; the disagreement is documented on the record.
- FREE-14's activation-energy prose contains an internally inconsistent ordering for the two Ni/Nb compositions. Only the unambiguous abstract/conclusion value for Ni0.7Nb0.3 and unambiguous hydrogenation values were retained.
- FREE-11 reports 40.73 kJ/mol in the results and rounds it to 40.78 kJ/mol elsewhere. The results value is retained.
- Approximation marks and words such as about are represented by `value_qualifier=approximately`; values are not promoted to exact measurements.

## FREE-17 verification

The canonical file is `data/phase4_data_sources/core_primary/carbon_supported/FREE-17__2024__Ni_at_CNT.pdf`. It is a readable 16-page PDF 1.7 file with SHA-256 `8e693025638d461050a612d77909ad8591a5e815b5ed317b65a867bd51443ee6`. Its embedded/article title and DOI match:

- title: Vermiform Ni@CNT derived from one-pot calcination of Ni-MOF precursor for improving hydrogen storage of MgH2
- DOI: 10.1016/S1003-6326(24)66565-9
- authors: Zi-yin Dai; Bing Zhang; Hideo Kimura; Li-rong Xiao; Rong-han Liu; Cui Ni; Chuan-xin Hou; Xue-qin Sun; Yu-ping Zhang; Xiao-yang Yang; Rong-hai Yu; Wei Du; Xiu-bo Xie

The acquisition provenance still records that the original official TNMSC handler returned HTTP 500 and the ScienceDirect route was blocked. A legitimate local full-text copy was subsequently supplied and verified; the earlier route failure was not erased.
