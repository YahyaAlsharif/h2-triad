> Historical project context, not current application behavior or independent scientific validation. See [current documentation](../README.md).

# H2-Triad Phase 4 — Dataset Acquisition and Extraction Guide

> Acquisition status: completed on 2026-09-13 for the currently identified public source pool; some full articles remain unavailable.
> This file is the original acquisition plan, not the current download queue.
> Current source-of-truth acquisition status is recorded in
> `data/phase4_data_sources/acquisition/acquisition_log.csv` and
> `data/phase4_data_sources/acquisition/acquisition_report.md`.

**Prepared:** 2026-09-12  
**Purpose:** Build a high-quality literature source pool for a Phase 4 machine-learning dataset on Mg/MgH2 hydrogen-storage catalysts.  
**Current stage:** Source acquisition and triage only. **Do not extract, merge, impute, or train yet.**

---

## 1. Executive decision

The project now has enough strong literature to begin a serious Phase 4 dataset build, but the source pool must be separated by scientific scope before extraction.

The recommended **core dataset** is:

> **Primary experimental papers on Mg or MgH2 in which a catalyst/additive is deliberately introduced and quantitative hydrogen-storage performance is measured under stated conditions.**

The core dataset should focus on records that can provide combinations of:

- catalyst/additive identity and loading;
- Mg vs MgH2 starting state;
- preparation conditions such as ball milling;
- absorption/desorption temperature;
- hydrogen pressure;
- elapsed time;
- hydrogen capacity in wt.%;
- onset/peak dehydrogenation temperature;
- activation energy;
- cycle count and retention;
- particle/catalyst structural information when available.

The source pool should also retain an **extended dataset** for reactive hydride composites such as MgH2-NaAlH4 or CaH2/MgB2/CaF2, but these systems must not be silently mixed into an MgH2-only model. Their chemistry and reaction pathways are different.

Reviews and project summaries are valuable for finding papers and checking coverage, but **must not become training rows when the same value can be traced to a primary experiment**.

---

## 2. Important discovery: a published project already demonstrates this data strategy

A 2025/2026 open-access Journal of Magnesium and Alloys paper is highly relevant to H2-Triad:

**Tongao Yao et al., "From LLM to Agent: A large-language-model-driven machine learning framework for catalyst design of MgH2 dehydrogenation"**  
DOI: `10.1016/j.jma.2025.08.021`  
Open article/PDF:  
https://www.sciopen.com/article/10.1016/j.jma.2025.08.021

The authors report automatically constructing a database of **809 MgH2 catalysts and 6,555 data rows**, followed by ML models with average R² above 0.91 for dehydrogenation temperature and activation energy.

Public code:
https://github.com/Weijie-Yang/cat_advisor

The public code is useful as a **schema benchmark**. Its extraction workflow asks for fields including:

- alloy/material name;
- catalyst component;
- catalyst mass fraction;
- catalyst particle size;
- ball-to-powder ratio;
- ball-milling speed and time;
- PCT pressure and temperature;
- enthalpy and entropy;
- onset/initial dehydrogenation temperature;
- TPD/TG capacity;
- activation energy;
- kinetics pressure/temperature;
- cycling information.

Their code also augments catalyst formulas with Materials Project descriptors such as density, formation energy, band gap, Fermi energy, and lattice parameters.

### How H2-Triad should improve on that schema

Do **not** simply copy their data structure. H2-Triad should additionally preserve:

1. exact paper/DOI provenance for every value;
2. page/table/figure provenance;
3. explicit `absorption` vs `desorption` measurement mode;
4. pressure, temperature, and elapsed time tied to each capacity value;
5. experiment/curve grouping to prevent train-test leakage;
6. raw units in addition to normalized units;
7. primary-table/text values vs digitized-figure values;
8. controls as explicit samples;
9. starting state (`Mg`, `MgH2`, reactive composite, alloy);
10. source-quality and verification status.

The published Cat-Advisor work proves that literature-scale MgH2 ML is feasible, while H2-Triad can be more careful about provenance and experimental comparability.

---

# 3. Triage of the files already available

## 3.1 KEEP — Core primary training source

### A. `1-s2.0-S2213956722000160-main.pdf`
**Yaokun Fu et al. — "Effect of ternary transition metal sulfide FeNi2S4 on hydrogen storage performance of MgH2"**  
DOI: `10.1016/j.jma.2021.11.033`

**Decision:** KEEP in `core_primary/`.

**Why it is excellent:**
- direct MgH2 catalyst study;
- catalyst composition and loading are stated;
- preparation conditions are detailed;
- several absorption temperatures are tested;
- absorption/desorption curves are available;
- pure/as-milled MgH2 controls are available;
- activation energy is reported;
- cycling and structural phases are reported.

**Extraction value:** Very high. This paper can generate several independent experimental conditions and many curve points later, as long as curve points are grouped under the same experiment.

---

## 3.2 KEEP — Extended-domain primary source, separate from core model

### B. `1-s2.0-S2213956724000896-main.pdf`
**N.A. Ali et al. — "Inclusion of CoTiO3 to ameliorate the re/dehydrogenation properties of the Mg–Na–Al system"**  
DOI: `10.1016/j.jma.2024.03.004`

**Decision:** KEEP, but place in `extended_primary/reactive_hydride_composites/`.

**Reason:** This is a primary experimental paper with useful controlled variation, including milling time, doped/undoped samples, capacity, kinetics, activation energy, and particle size. However, the working material is **MgH2-NaAlH4**, not simple MgH2. Do not combine these rows with MgH2-only records unless the model explicitly includes `base_material_system`.

---

### C. `suarezalcantara-journsolstatchem.pdf`
**K. Suarez Alcantara et al. — "Sorption and desorption properties of a CaH2/MgB2/CaF2 reactive hydride composite as potential hydrogen storage material"**  
DOI: `10.1016/j.jssc.2011.09.019`

**Decision:** KEEP, but place in `extended_primary/reactive_hydride_composites/`.

**Reason:** It contains clean quantitative tables for temperature, pressure, uptake, activation energy, cycling, and kinetics. It is especially useful as fluoride-mechanism evidence. But the base chemistry is a CaH2/MgB2 reactive hydride composite, not direct MgH2 + CaF2.

**Important:** Do not use this paper as proof that an arbitrary `MgH2 + CaF2` formulation will have the same values.

---

## 3.3 KEEP — Literature index only, not direct training data

### D. `1-s2.0-S2213956725003639-main.pdf`
**Yuan et al. — "Research advances of magnesium and magnesium alloys globally in 2024"**  
DOI: `10.1016/j.jma.2025.09.034`

**Decision:** KEEP in `reviews_indexes/`.

**Why:** Table 9 is an excellent acquisition map containing many Mg/MgH2 hydrogen-storage systems and their cited primary papers.

**Rule:** Values from this review are **secondary evidence**. Use them to:
- identify papers;
- cross-check extracted values;
- find missing primary papers.

Do not create a training row from the review if the cited primary paper can be obtained.

---

## 3.4 EXCLUDE FROM TRAINING — project synthesis, not primary evidence

### E. `الهاكثون (البيانات).pdf`
**Scientific Data Summary: Catalytic Enhancement of Hydrogen Storage in MgH2**

**Decision:** Keep only in `notes_nontraining/`; do not extract training rows.

**Reason:** This is a project-level synthesis of multiple sources. Its proposed final system:

`MgH2 + Fe/Ni + N-C + CaF2`

is a **hypothesis/design combination**, not an experimentally tested formulation in the supplied evidence. Treating its combined performance numbers as one measured sample would create synthetic scientific data.

---

## 3.5 Clean up `papers_no_pdf.txt`

Current file:
`papers_no_pdf.txt`

### Remove

`https://www.sciencedirect.com/science/article/abs/pii/S0966979506001178`

This resolves to **"Critical evaluation of the Fe-Ni, Fe-Ti and Fe-Ni-Ti alloy systems"**. It concerns alloy-system thermodynamic/phase evaluation, not MgH2 catalyst hydrogen-storage experiments. It is not suitable for the current supervised dataset.

### Deduplicate

These are the same paper:

`https://www.sciencedirect.com/science/article/abs/pii/S0360319924036310`

`https://www.sciencedirect.com/science/article/abs/pii/S0360319924036310?via%3Dihub`

Keep only one. It is the very relevant 2024 Fe/Ni/MOF-carbon MgH2 paper listed below.

### Keep, but mark unresolved until manually identified

`https://core.ac.uk/outputs/668738614/?source=oai`

The CORE output could not be reliably resolved to a title during this review. Do not delete it yet, but do not assume it belongs in the dataset until title/DOI are confirmed.

`https://www.sciencedirect.com/science/article/abs/pii/S0360319924000661`

This PII could not be reliably identified through the available search/indexing routes. Keep it in an `UNRESOLVED` section until title/DOI are confirmed.

### Keep

`https://www.sciencedirect.com/science/article/abs/pii/S0016236125013602`

This is the 2025 Fuel paper on Fe nanoparticles/hollow silica spheres catalyzing MgH2. It is strongly relevant.

---

# 4. Priority papers that are easy/free to obtain

The following are the papers I would download first. These are either open-access publisher copies, official open manuscripts, or publisher pages exposing a direct PDF route.

**Priority scale**
- **P1:** directly aligned with H2-Triad and high data density;
- **P2:** strong direct MgH2 catalyst data, useful for model breadth;
- **P3:** mainly methodology/reference value.

---

## FREE-1 — Ni nanoparticles on mesoporous carbon
**P1 — CORE**

**Title:** Catalytic mechanisms of nickel nanoparticles for the improved dehydriding kinetics of magnesium hydride  
**DOI:** `10.1016/j.jma.2023.07.002`  
**Free official article/PDF:**  
https://www.sciopen.com/article/10.1016/j.jma.2023.07.002

**Why useful:** Direct MgH2 + Ni@C. Contains strong catalyst/carbon evidence, activation-energy change, dehydrogenation temperature, mechanistic phases and controls.

---

## FREE-2 — Ni3ZnC0.7/Ni on CNT, multiple catalyst loadings
**P1 — VERY HIGH DATA DENSITY**

**Title:** In situ formation of multiple catalysts for enhancing the hydrogen storage of MgH2 by adding porous Ni3ZnC0.7/Ni loaded carbon nanotubes microspheres  
**DOI:** `10.1016/j.jma.2022.07.004`  
**Free official article/PDF:**  
https://www.sciopen.com/article/10.1016/j.jma.2022.07.004

**Why useful:** Tests **2.5, 5.0 and 7.5 wt.%** catalyst loading, making it much more useful for ML than a one-formulation paper. Includes onset temperature, low-temperature absorption, desorption capacity and activation energies.

---

## FREE-3 — Mg2Ni/TiH1.5 with Ni/Ti-ratio variation
**P1 — VERY HIGH DATA DENSITY**

**Title:** Layered double hydroxide-derived Mg2Ni/TiH1.5 composite catalysts for enhancing hydrogen storage performance of MgH2  
**DOI:** `10.1016/j.jma.2023.10.003`  
**Free official article/PDF:**  
https://www.sciopen.com/article/10.1016/j.jma.2023.10.003

**Why useful:** Composition ratio is deliberately varied; therefore it is valuable for learning composition-property relationships rather than only cataloguing isolated catalysts.

---

## FREE-4 — NiCu@C bimetallic carbon catalyst
**P1 — PROJECT-ALIGNED**

**Title:** Improvement effect of reversible solid solutions Mg2Ni(Cu)/Mg2Ni(Cu)H4 on hydrogen storage performance of MgH2  
**DOI:** `10.1016/j.jma.2022.04.006`  
**Free official article/PDF:**  
https://www.sciopen.com/article/10.1016/j.jma.2022.04.006

**Why useful:** Direct MgH2, bimetallic Ni-Cu on carbon, catalyst loading, activation energy, dehydrogenation temperatures and cycling.

---

## FREE-5 — Ni/VN
**P1**

**Title:** Hydrogen storage performance of MgH2 under catalysis by highly dispersed nickel-nanoparticle-doped hollow spherical vanadium nitride  
**DOI:** `10.1016/j.jma.2023.11.010`  
**Free official article/PDF:**  
https://www.sciopen.com/article/10.1016/j.jma.2023.11.010

**Why useful:** Direct MgH2; absorption and desorption under several conditions; activation energy; Ni/Mg2Ni "hydrogen pump" plus nitride support.

---

## FREE-6 — TiFeMnCo catalyst
**P2**

**Title:** Improved hydrogen storage kinetics of MgH2 using TiFe0.92Mn0.04Co0.04 with in-situ generated α-Fe as catalyst  
**DOI:** `10.1016/j.matre.2023.100247`  
**Free official article:**  
https://www.sciencedirect.com/science/article/pii/S2666935823001143

**Why useful:** Direct MgH2 with a multimetal catalyst, quantitative desorption and activation energy. Open access.

---

## FREE-7 — LaVO4
**P2**

**Title:** LaVO4 prepared by a high-yield method for superior catalysis to the hydrogen storage of MgH2  
**DOI:** `10.1016/j.jma.2024.03.025`  
**Free official article/PDF:**  
https://www.sciopen.com/article/10.1016/j.jma.2024.03.025

**Why useful:** Direct MgH2; onset temperature, timed desorption, 50-cycle performance, scalable catalyst preparation.

---

## FREE-8 — V2O5@C / VO-V2O3 interface
**P2**

**Title:** Constructing VO/V2O3 interface to enhance hydrogen storage performance of MgH2  
**DOI:** `10.1016/j.jma.2024.02.012`  
**Free official article/PDF:**  
https://www.sciopen.com/article/10.1016/j.jma.2024.02.012

**Why useful:** Direct MgH2, low-temperature/room-temperature measurements and unusually long cycling data (251 cycles). Useful for cycling target coverage.

---

## FREE-9 — NaH-doped TiO2
**P2 — STRONG CYCLING DATA**

**Title:** NaH doped TiO2 as a high-performance catalyst for Mg/MgH2 cycling stability and room temperature absorption  
**DOI:** `10.1016/j.jma.2021.11.005`  
**Free official article/PDF:**  
https://www.sciopen.com/article/10.1016/j.jma.2021.11.005

**Why useful:** Direct Mg/MgH2; multiple catalyst loadings; room-temperature absorption; activation energy; 100-cycle behavior.

---

## FREE-10 — NiCo-MOF/V-O
**P1 — PROJECT-ALIGNED**

**Title:** Vanadium induces Ni-Co MOF formation from a NiCo LDH to catalytically enhance the MgH2 hydrogen storage performance  
**DOI:** `10.1016/j.jma.2025.01.012`  
**Free official article/PDF:**  
https://www.sciopen.com/article/10.1016/j.jma.2025.01.012

**Why useful:** Direct MgH2; bimetallic catalyst plus MOF-derived structure; strong low-temperature absorption/desorption data.

**Extraction warning:** Search/publisher metadata currently show conflicting numbers for at least one activation-energy/performance summary. During extraction, use the **full PDF's tables, methods, and figures**, not a web snippet.

---

## FREE-11 — Co3O4 + Ni on graphene oxide
**P1 — PROJECT-ALIGNED**

**Title:** Graphene oxide supported oxygen vacancy-rich Co3O4 and Ni nanoparticle for boosting the hydrogen storage properties of MgH2  
**DOI:** `10.1016/j.jma.2024.12.015`  
**Free official article/PDF:**  
https://www.sciopen.com/article/10.1016/j.jma.2024.12.015

**Why useful:** Direct MgH2; Ni + carbon + transition-metal oxide; capacity, activation energy and 30-cycle retention.

---

## FREE-12 — Bi2Ti2O7
**P2**

**Title:** Enhancing hydrogen storage performance of MgH2 with hollow Bi2Ti2O7 catalyst: Synergistic effects of Bi2Mg3 alloy phase and Ti polyvalency  
**DOI:** `10.1016/j.jma.2025.06.014`  
**Free official article/PDF:**  
https://www.sciopen.com/article/10.1016/j.jma.2025.06.014

**Why useful:** Direct MgH2, absorption time/capacity, onset/peak temperatures, activation energy and 50-cycle performance.

---

## FREE-13 — rGO@VS4
**P1 — CARBON + SULFIDE**

**Title:** Reduced graphene oxide/patronite composite as highly active catalyst precursors for enhancing the hydrogen desorption of MgH2  
**DOI:** `10.1016/j.jma.2025.03.014`  
**Open official article:**  
https://www.sciencedirect.com/science/article/pii/S2213956725000994

**Why useful:** Direct MgH2, carbon/sulfide composite, preparation details, catalyst loading, onset/peak temperature and 100-cycle retention.

---

## FREE-14 — Ni-Nb oxide composition series
**P1 — HIGH DATA DENSITY**

**Title:** Cation-induced topical disordered niobium nickel oxide for robust hydrogen storage in magnesium hydride  
**DOI:** `10.1016/j.jma.2024.10.011`  
**Free official article/PDF:**  
https://www.sciopen.com/article/10.1016/j.jma.2024.10.011

**Why useful:** Deliberate Ni/Nb compositional design rather than a single catalyst; direct MgH2; absorption/desorption; activation energy and 50 cycles.

---

## FREE-15 — TMOx@Ti-MgO (Mn and Cu comparison)
**P1 — HIGH DATA DENSITY**

**Title:** Chemically stable TMOx@Ti-MgO (TM = Mn and Cu) catalyst enhanced De/hydrogenation kinetics of Mg/MgH2  
**DOI:** `10.1016/j.jma.2025.02.032`  
**Free official article/PDF:**  
https://www.sciopen.com/article/10.1016/j.jma.2025.02.032

**Why useful:** Explicit catalyst-family comparison (Mn vs Cu), direct Mg/MgH2, timed low-temperature desorption and cycling. Good for avoiding a dataset dominated by one catalyst family.

---

## FREE-16 — FeNi-S coordinated carbon, 2026
**P1 — EXTREMELY PROJECT-ALIGNED**

**Title:** Synthesis of sulfur self-doped FeNi-S coordinated carbon derived from petroleum coke for accelerated Mg/MgH2 hydrogen storage  
**DOI:** `10.1016/j.jma.2026.102033`  
**Free official article:**  
https://doi.org/10.1016/j.jma.2026.102033

**Why useful:** Direct MgH2 with FeNi + carbon + sulfur coordination; controls include sulfur-free/catalyst variants; preparation parameters are explicit; capacity, low-temperature absorption, activation energy and cycling are available.

---

## FREE-17 — Ni@CNT with 2.5/5/7.5 wt.% loading
**P1 — HIGH DATA DENSITY**

**Title:** Vermiform Ni@CNT derived from one-pot calcination of Ni-MOF precursor for improving hydrogen storage of MgH2  
**DOI:** `10.1016/S1003-6326(24)66565-9`  
**Official page with PDF:**  
https://tnmsc.csu.edu.cn/EN/10.1016/S1003-6326%2824%2966565-9

**Why useful:** Tests **2.5, 5.0 and 7.5 wt.%** catalyst; absorption/desorption time series; activation energies. Excellent controlled variation.

---

## FREE-18 — Ce0.6Zr0.4O2 open manuscript
**P2**

**Title:** Effect of Ce0.6Zr0.4O2 nanocrystals on boosting hydrogen storage performance of MgH2  
**DOI:** `10.1016/j.cej.2024.153203`  
**Publisher page — use "View Open Manuscript":**  
https://www.sciencedirect.com/science/article/pii/S1385894724046916

**Why useful:** Direct MgH2, 7 wt.% catalyst, fast absorption, cycling retention.

**File naming:** Mark the downloaded file as `accepted_manuscript` if it is not the final version of record.

---

## FREE-19 — FeS2
**P1 — SULFIDE COMPARISON**

**Title:** Improved hydrogen storage properties of MgH2 by the addition of FeS2 micro-spheres  
**DOI:** `10.1039/C7DT04665K`  
**Publisher PDF endpoint:**  
https://pubs.rsc.org/en/content/articlepdf/2018/dt/c7dt04665k

**Why useful:** Direct MgH2 + FeS2, capacity under fixed conditions, onset behavior, activation energy and kinetic-model information. Closely complements the existing FeNi2S4 paper.

**Access note:** A direct publisher PDF endpoint was reachable during this review. If your browser later prompts for access, move it to the no-PDF list rather than using an unverified mirror.

---

## FREE-20 — porous Ni nanofibers
**P1**

**Title:** Porous Ni nanofibers with enhanced catalytic effect on the hydrogen storage performance of MgH2  
**DOI:** `10.1039/C5TA03721B`  
**Publisher article:**  
https://pubs.rsc.org/en/content/articlelanding/2015/ta/c5ta03721b  
**Direct PDF pattern:**  
https://pubs.rsc.org/en/content/articlepdf/2015/ta/c5ta03721b

**Why useful:** Direct comparison between MgH2, Ni powder and 4% porous Ni nanofibers under related conditions; useful for learning morphology effects.

**Access note:** If the full PDF becomes access-controlled, keep the supplementary information and move the article to `papers_no_pdf.txt`.

---

# 5. High-value papers to add to `papers_no_pdf.txt`

These papers are scientifically useful, but I did not confirm a stable, clean, freely downloadable full-text route from the official/author sources checked. Add the DOI/publisher URL to the no-PDF list and acquire them later through institutional access, author manuscript, library access, or another legitimate route.

---

## NOPDF-1 — Fe/C, Ni/C and Fe-Ni/C comparison
**P1 — TOP PRIORITY**

**Title:** MOF-derived carbon supported transition metal (Fe, Ni) and synergetic catalysis for hydrogen storage kinetics of MgH2  
**DOI:** `10.1016/j.ijhydene.2024.08.449`  
https://doi.org/10.1016/j.ijhydene.2024.08.449

**Why:** One paper contains monometallic and bimetallic carbon-supported systems and is almost perfectly aligned with H2-Triad.

---

## NOPDF-2 — carbon-encapsulated Fe-Ni
**P1 — TOP PRIORITY**

**Title:** Improve hydrogen sorption kinetics of MgH2 by doping carbon-encapsulated iron-nickel nanoparticles  
**DOI:** `10.1016/j.jallcom.2020.156035`  
https://doi.org/10.1016/j.jallcom.2020.156035

**Why:** Direct Fe0.64Ni0.36@C + MgH2; strong quantitative comparison and cycling. Very relevant to the Fe-Ni-carbon design space.

---

## NOPDF-3 — Fe-HSS, multiple Fe loadings
**P1 — VERY HIGH DATA DENSITY**

**Title:** Hydrogen storage in MgH2 catalyzed by Fe nanoparticles and hollow silica spheres  
**DOI:** `10.1016/j.fuel.2025.135635`  
https://doi.org/10.1016/j.fuel.2025.135635

**Why:** Tests 3, 5, 7 and 10 wt.% Fe-HSS, making it extremely valuable for ML. The institutional repository lists the PDF but restricts it to repository staff.

---

## NOPDF-4 — CoNi/C vs FeNi/C
**P1 — TOP PRIORITY**

**Title:** Synergistic effect of MOF-derived carbon-supported CoNi and FeNi bimetallic catalysts on hydrogen storage kinetics of MgH2  
**DOI:** `10.1016/j.est.2025.116824`  
https://doi.org/10.1016/j.est.2025.116824

**Why:** Controlled bimetallic comparison, carbon support, direct MgH2, absorption/desorption, activation energy and cycles. Extremely relevant to H2-Triad.

---

## NOPDF-5 — Mo2Ti2C3 MXene
**P2**

**Title:** Research on the modification of magnesium hydride by two-dimensional layered Mo2Ti2C3 MXene  
**DOI:** `10.1016/j.est.2024.113843`  
https://doi.org/10.1016/j.est.2024.113843

**Why:** Direct MgH2, catalyst loading and broad sorption/cycling metrics.

---

## NOPDF-6 — Pd single atoms on Sc2O3
**P2**

**Title:** Enhanced catalysis of Pd single atoms on Sc2O3 nanoparticles for hydrogen storage of MgH2  
**DOI:** `10.1016/j.cej.2024.149434`  
https://doi.org/10.1016/j.cej.2024.149434

**Why:** Well-controlled single-atom/oxide system. Publisher currently shows purchase/organization access.

---

## NOPDF-7 — SrTiO3
**P2**

**Title:** Nanosized SrTiO3 Catalyzes Hydrogen Sorption of MgH2  
**DOI:** `10.1021/acsaem.4c01892`  
https://doi.org/10.1021/acsaem.4c01892

**Why:** Direct MgH2, room-temperature absorption, timed desorption, Ea and 40-cycle retention.

---

## NOPDF-8 — Ni particle-size series on carbon cloth
**P1 — VERY HIGH DATA DENSITY**

**Title:** Size-dependent activity modulation of supported Ni nanocatalysts for efficient solid-state hydrogen storage in magnesium  
**DOI:** `10.1016/j.cej.2024.155285`  
https://doi.org/10.1016/j.cej.2024.155285

**Why:** Particle size/dispersion is systematically modulated. This is more useful for ML than another single catalyst datapoint.

---

## NOPDF-9 — V2O3-TiO2-rGO
**P1 — CARBON/HETEROSTRUCTURE**

**Title:** Fabrication of V2O3-TiO2-rGO ternary heterojunction composite to enhance the hydrogen storage performance of MgH2  
**DOI:** `10.1016/j.cej.2024.155877`  
https://doi.org/10.1016/j.cej.2024.155877

**Why:** Direct MgH2, multi-component oxide/carbon catalyst, room-temperature uptake and multiple quantitative metrics.

---

## NOPDF-10 — six transition-metal sulfides in one paper
**P1 — EXCEPTIONAL DATA DENSITY**

**Title:** Improved hydrogen storage properties of MgH2 using transition metal sulfides as catalyst  
**DOI:** `10.1016/j.ijhydene.2021.05.172`  
https://doi.org/10.1016/j.ijhydene.2021.05.172

**Why:** Compares **TiS2, NbS2, MoS2, MnS, CoS2 and CuS** under one study. This is among the most valuable missing papers because experimental protocol is more consistent across multiple catalysts.

---

## NOPDF-11 — flowerlike NiS
**P1**

**Title:** Formation of Multiple-Phase Catalysts for the Hydrogen Storage of Mg Nanoparticles by Adding Flowerlike NiS  
**DOI:** `10.1021/acsami.6b13222`  
https://doi.org/10.1021/acsami.6b13222

**Why:** Strong direct NiS/Mg system with absorption/desorption activation energies.

**Important:** The **Supporting Information is free** on ACS. Download the SI now even if the article is inaccessible.

---

## NOPDF-12 — FeMo on g-C3N4
**P1 — Fe + support**

**Title:** Enhancing hydrogen sorption performances of MgH2 by in-situ introduction of molybdate derived FeMo nano catalysts  
**DOI:** `10.1016/j.est.2025.117418`  
https://doi.org/10.1016/j.est.2025.117418

**Why:** Direct FeMo catalyst plus g-C3N4 support, useful to broaden supported Fe-containing systems.

---

## NOPDF-13 — NiMoO4 + rGO
**P1 — BIMETALLIC + CARBON**

**Title:** Improved MgH2 kinetics and cyclic stability by fibrous spherical NiMoO4 and rGO  
**DOI:** `10.1016/j.jtice.2022.104311`  
https://doi.org/10.1016/j.jtice.2022.104311

**Why:** Direct MgH2, bimetallic oxide plus carbon, low-temperature absorption/desorption and cycling.

---

## NOPDF-14 — TiOF2 and NbO2F
**P1 — FLUORIDE / DIRECT MgH2**

**Title:** Multivalent transition metal oxyfluorides as efficient catalysts for improving hydrogen cycling kinetics of MgH2  
**DOI:** `10.1016/j.ijhydene.2024.11.092`  
https://doi.org/10.1016/j.ijhydene.2024.11.092

**Why:** Compares two oxyfluoride catalysts under the same work and provides 50-cycle behavior. Important for a fluoride-containing design space.

---

## NOPDF-15 — K2TaF7
**P1 — FLUORIDE / DIRECT MgH2**

**Title:** Dual-cation K2TaF7 catalyst improves high-capacity hydrogen storage behavior of MgH2  
**DOI:** `10.1016/j.ijhydene.2022.11.191`  
https://doi.org/10.1016/j.ijhydene.2022.11.191

**Why:** Direct MgH2 + fluoride catalyst, low catalyst fraction and quantitative reabsorption behavior.

---

## NOPDF-16 — direct CaF2/NbCl5/Nb2O5 comparison
**P1 — VERY IMPORTANT FOR CaF2**

**Title:** Catalytic activity of oxides and halides on hydrogen storage of MgH2  
**DOI:** `10.1016/j.jpowsour.2006.04.059`  
https://doi.org/10.1016/j.jpowsour.2006.04.059

**Why:** This is much more appropriate for **direct MgH2 + CaF2 evidence** than the currently attached CaH2/MgB2/CaF2 reactive composite paper. It directly compares CaF2, NbCl5 and Nb2O5.

**Access:** Public copies/mirrors appear on the web, but I did not classify those as clean official OA. Prefer a library/author/repository copy.

---

## NOPDF-17 — CaTiO3 loading series
**P2**

**Title:** Catalytic alteration in hydrogen storage properties of MgH2 by adding CaTiO3  
**DOI:** `10.1016/j.est.2025.117958`  
https://doi.org/10.1016/j.est.2025.117958

**Why:** Reports multiple catalyst loadings (5/10/15 wt.%). Useful controlled variation.

---

## NOPDF-18 — VTiMn
**P2**

**Title:** Synchronously upgrading of hydrogen storage thermodynamic, kinetics and cycling properties of MgH2 via VTiMn catalyst  
**DOI:** `10.1016/j.seppur.2024.129760`  
https://doi.org/10.1016/j.seppur.2024.129760

**Why:** Direct MgH2 multimetal catalyst and multi-target performance.

---

## NOPDF-19 — polymeric carbon nitride supported Ni
**P1 — PROJECT-ALIGNED**

**Title:** Polymeric carbon nitride supported single-phase Ni with exceptional catalytic effect on MgH2 for hydrogen storage  
**DOI:** `10.1016/j.jallcom.2025.181259`  
https://doi.org/10.1016/j.jallcom.2025.181259

**Why:** Direct MgH2 + Ni + N-rich carbon support. This is strongly aligned with the project's interest in Ni and nitrogen-doped carbon.

---

## NOPDF-20 — porous NiO
**P2**

**Title:** Effect of porous nanosheet NiO on hydrogen storage performance of MgH2  
**DOI:** `10.1016/j.ijhydene.2025.05.017`  
https://doi.org/10.1016/j.ijhydene.2025.05.017

**Why:** Direct MgH2, Ni oxide morphology, room-temperature absorption, useful Ni-family breadth.

---

## NOPDF-21 — leaf-carbon FeCo
**P1 — PROJECT-ALIGNED**

**Title:** Leaf-carbon-supported FeCo nanocatalysts enable 200 °C desorption and high reversibility in MgH2 hydrogen storage  
**DOI:** `10.1016/j.ijhydene.2025.152589`  
https://doi.org/10.1016/j.ijhydene.2025.152589

**Why:** Direct MgH2 + FeCo + biomass carbon, 10 wt.% catalyst, cycling and low-temperature behavior.

---

## NOPDF-22 — Fe-Ni sulfides on carbon, 2026
**P1 — EXTREMELY PROJECT-ALIGNED**

**Title:** Carbon scaffold supporting Ni and Fe-Ni sulfides for boosting hydrogen storage in MgH2  
**DOI:** `10.1016/j.ijhydene.2026.156007`  
https://doi.org/10.1016/j.ijhydene.2026.156007

**Why:** Directly combines Ni, Fe-Ni sulfides and carbon. It reports rapid absorption, desorption, activation energy and cycling. Excellent match for H2-Triad.

---

## NOPDF-23 — TiO2/C/Ni
**P1 — PROJECT-ALIGNED**

**Title:** Effect of Ti-EG-Ni Dual-Metal Organic Crystal-Derived TiO2/C/Ni on the Hydrogen Storage Performance of MgH2  
**DOI:** `10.1021/acsami.4c18239`  
https://doi.org/10.1021/acsami.4c18239

**Why:** Direct MgH2, Ni + carbon + oxide; catalyst loading, very fast absorption, Ea and 50-cycle retention.

---

## NOPDF-24 — NiS/carbon fibers
**P1 — PROJECT-ALIGNED**

**Title:** Construction of NiS/carbon fibers confined NiS composite: high catalytic activity for enhancing the hydrogen storage performances of MgH2  
**DOI:** `10.1007/s12598-025-03517-2`  
https://doi.org/10.1007/s12598-025-03517-2

**Why:** Direct MgH2, NiS + carbon support. Publisher metadata indicates conventional copyright rather than OA.

---

# 6. Reference/review papers to download, but never treat as primary training rows

These are useful for finding more papers, understanding fields, and checking coverage.

### R1 — AI/data methodology
**From LLM to Agent: A large-language-model-driven machine learning framework for catalyst design of MgH2 dehydrogenation**  
DOI: `10.1016/j.jma.2025.08.021`  
https://www.sciopen.com/article/10.1016/j.jma.2025.08.021

### R2 — MgH2 improvement review
**Hydrogen Storage Performance of Mg/MgH2 and Its Improvement Measures: Research Progress and Trends**  
Free full text:  
https://pmc.ncbi.nlm.nih.gov/articles/PMC9966284/

### R3 — 2026 single-atom catalyst review
**Innovative applications of single-atom catalysts in MgH2/Mg system to build high-efficiency hydrogen storage**  
DOI: `10.1016/j.jma.2025.08.018`  
https://www.sciopen.com/article/10.1016/j.jma.2025.08.018

### R4 — 2026 Fe-focused review
**Fe-Based Catalysts in MgH2 Hydrogen Storage: Mechanistic Insights, Stability Challenges, and a Roadmap for Scalable Design**  
DOI: `10.3390/coatings16010092`  
https://www.mdpi.com/2079-6412/16/1/92

Use reviews as **bibliographic maps and validation aids**, not as substitutes for primary experimental papers.

---

# 7. Copy/paste block for `papers_no_pdf.txt`

After removing the unrelated Fe-Ni/Fe-Ti alloy-system paper and deduplicating the existing Fe/Ni-carbon URL, the following DOI links are recommended additions.

```text
# HIGH PRIORITY — direct Mg/MgH2 catalyst papers

https://doi.org/10.1016/j.ijhydene.2024.08.449
https://doi.org/10.1016/j.jallcom.2020.156035
https://doi.org/10.1016/j.fuel.2025.135635
https://doi.org/10.1016/j.est.2025.116824
https://doi.org/10.1016/j.est.2024.113843
https://doi.org/10.1016/j.cej.2024.149434
https://doi.org/10.1021/acsaem.4c01892
https://doi.org/10.1016/j.cej.2024.155285
https://doi.org/10.1016/j.cej.2024.155877
https://doi.org/10.1016/j.ijhydene.2021.05.172
https://doi.org/10.1021/acsami.6b13222
https://doi.org/10.1016/j.est.2025.117418
https://doi.org/10.1016/j.jtice.2022.104311
https://doi.org/10.1016/j.ijhydene.2024.11.092
https://doi.org/10.1016/j.ijhydene.2022.11.191
https://doi.org/10.1016/j.jpowsour.2006.04.059
https://doi.org/10.1016/j.est.2025.117958
https://doi.org/10.1016/j.seppur.2024.129760
https://doi.org/10.1016/j.jallcom.2025.181259
https://doi.org/10.1016/j.ijhydene.2025.05.017
https://doi.org/10.1016/j.ijhydene.2025.152589
https://doi.org/10.1016/j.ijhydene.2026.156007
https://doi.org/10.1021/acsami.4c18239
https://doi.org/10.1007/s12598-025-03517-2

# UNRESOLVED EXISTING LINKS — identify before extraction

https://core.ac.uk/outputs/668738614/?source=oai
https://www.sciencedirect.com/science/article/abs/pii/S0360319924000661
```

Do not keep the `via=ihub` duplicate for `S0360319924036310`.

---

# 8. Recommended source-folder layout before extraction

Do not place every PDF into one flat directory.

```text
phase4_data_sources/
│
├── core_primary/
│   ├── transition_metals/
│   ├── bimetallic_multimetallic/
│   ├── sulfides/
│   ├── oxides/
│   ├── nitrides_carbides_mxenes/
│   ├── halides_fluorides/
│   └── carbon_supported/
│
├── extended_primary/
│   ├── reactive_hydride_composites/
│   └── magnesium_alloys/
│
├── reviews_indexes/
│
├── supplementary/
│
├── notes_nontraining/
│
├── unresolved/
│
└── acquisition/
    ├── papers_no_pdf.txt
    └── acquisition_log.csv
```

A paper may conceptually fit multiple catalyst categories. Do not duplicate the PDF. Put it in the dominant category and represent all relevant categories later in metadata.

---

# 9. Acquisition log to create before any extraction

Create an `acquisition_log.csv` with one row per paper.

Recommended columns:

```text
paper_id
doi
title
year
journal
url
local_filename
access_type
dataset_scope
priority
primary_experimental
has_supplement
downloaded
full_text_verified
notes
```

Recommended `dataset_scope` values:

- `core_mgh2`
- `extended_reactive_composite`
- `extended_mg_alloy`
- `review_index`
- `methodology_only`
- `exclude`
- `unresolved`

Recommended `access_type` values:

- `open_access_version_of_record`
- `open_accepted_manuscript`
- `publisher_pdf_reachable`
- `institutional_access_required`
- `author_request`
- `unknown`

This makes it impossible to accidentally train on a review or unresolved paper later.

---

# 10. Canonical extraction design — do not start with one giant wide CSV

A single wide CSV is tempting but creates ambiguity because one sample can have many temperatures, pressures, times, curves, cycle numbers, and target values.

The safest workflow is to extract into linked tables first, then generate a model-specific flat CSV.

## 10.1 `papers.csv`

One row per paper.

```text
paper_id
doi
title
journal
year
authors
source_url
local_filename
source_type
dataset_scope
license_or_access
notes
```

`paper_id` should preferably be the DOI normalized into a safe identifier.

---

## 10.2 `samples.csv`

One row per physically distinct sample/formulation/preparation.

Suggested fields:

```text
sample_id
paper_id

base_material
starting_state
material_system_raw

catalyst_raw
catalyst_normalized
catalyst_category
catalyst_components
catalyst_loading_wt_pct

support_material
carbon_type
nitrogen_doped
sulfur_doped
fluoride_present

catalyst_particle_size_raw
catalyst_particle_size_nm

preparation_method
ball_milling_time_min
ball_milling_speed_rpm
ball_to_powder_ratio
milling_atmosphere
milling_medium
heat_treatment_c
heat_treatment_time_min

sample_notes
```

### `starting_state` examples

- `MgH2`
- `Mg`
- `Mg/MgH2_cycle`
- `MgH2-NaAlH4`
- `CaH2-MgB2`
- `Mg_alloy`

Do not collapse these into one category.

---

## 10.3 `measurements.csv`

**One row = one measured observation under one set of conditions.**

Suggested fields:

```text
measurement_id
paper_id
sample_id
experiment_group_id
curve_id

measurement_mode
measurement_method

temperature_raw
temperature_raw_unit
temperature_c

pressure_raw
pressure_raw_unit
pressure_mpa

time_raw
time_raw_unit
time_s

cycle_number
heating_rate_k_min

hydrogen_capacity_wt_pct

onset_dehydrogenation_c
peak_dehydrogenation_c

activation_energy_kj_mol
activation_energy_process

enthalpy_kj_mol_h2
entropy_j_mol_k

capacity_retention_pct

source_page
source_table
source_figure
source_quote_or_cell
extraction_method
digitized
quality_grade
verification_status
notes
```

### `measurement_mode`

Never use one ambiguous "capacity" column without mode.

Use values such as:

- `absorption`
- `desorption`
- `tpd`
- `dsc`
- `pct_equilibrium`
- `cycling_absorption`
- `cycling_desorption`

### `measurement_method`

Examples:
- `Sieverts`
- `PCT`
- `TPD`
- `DSC`
- `TG`
- `manometric`
- `unknown`

---

## 10.4 `phases_mechanisms.csv` — optional but recommended

Do not squeeze qualitative mechanisms into numeric target columns.

```text
paper_id
sample_id
state
phase_or_species
evidence_method
role_claim
source_page
notes
```

Examples:
- Mg2Ni / Mg2NiH4
- MgS
- Fe
- CoMg2
- AlTi3
- VO / V2O3
- oxygen vacancy
- "hydrogen pump"

These can later become engineered categorical features if scientifically justified.

---

# 11. Cleaning rules for the future extraction task

These rules are more important than the choice of ML algorithm.

## Rule 1 — Primary paper beats review

If a value appears in:
- a primary paper;
- a later review;
- the hackathon summary;

keep the primary-paper record as training truth.

The other documents may be used for cross-checking only.

---

## Rule 2 — Never invent missing conditions

If a paper reports:

> "5.8 wt.% H2 was absorbed"

but the relevant temperature, pressure, or time is not stated for that observation, do not infer it from another nearby experiment.

Store missing values as null/NA.

**Do not fill missing scientific inputs with averages during extraction.**

Imputation, if any, is a later modeling decision and must be justified separately.

---

## Rule 3 — Keep raw and normalized values

Example:

```text
temperature_raw = 473
temperature_raw_unit = K
temperature_c = 199.85
```

This gives auditability and allows conversion errors to be caught.

Recommended normalized units:

| Variable | Canonical unit |
|---|---|
| Temperature | °C |
| Pressure | MPa |
| Time | s |
| Capacity | wt.% H2 |
| Activation energy | kJ/mol |
| Enthalpy | kJ/mol H2 |
| Entropy | J/mol/K |
| Particle size | nm |
| Milling time | min |

---

## Rule 4 — Do not merge onset and peak temperatures

Keep distinct fields:

- `onset_dehydrogenation_c`
- `peak_dehydrogenation_c`

Likewise, do not automatically equate:
- decomposition temperature;
- onset temperature;
- peak temperature;
- "complete desorption" temperature.

If the paper itself uses a term ambiguously, record its raw label.

---

## Rule 5 — Absorption and desorption are different experiments

Do not put both into one generic row.

Example:

```text
sample X, absorption, 150 °C, 3 MPa, 60 s, 6.2 wt%
```

is a different observation from:

```text
sample X, desorption, 300 °C, 0.01 MPa, 600 s, 5.8 wt%
```

---

## Rule 6 — Controls are valuable data

Pure MgH2, ball-milled MgH2, Mg without catalyst, and alternative catalyst loadings should be extracted as samples when experimental conditions are sufficiently specified.

A catalyst-loading-zero control is particularly useful for learning catalyst effect.

---

## Rule 7 — Figures can be digitized, but must be flagged

Digitized kinetic curves can dramatically increase the number of usable observations.

Every digitized point must contain:

```text
digitized = true
curve_id = ...
experiment_group_id = ...
source_figure = ...
```

Do not claim digitized graph coordinates have the same precision as table values.

---

## Rule 8 — Curve points are not independent experiments

If a single absorption curve contains 100 digitized time points, that is **one experiment with 100 correlated observations**, not 100 independent samples.

Never allow points from the same curve/experiment to be split between training and test sets.

At model time, group by at least:

```text
paper_id
experiment_group_id
```

For stronger leakage protection, hold out entire papers.

---

## Rule 9 — Multiple catalyst loadings must become separate samples

A paper testing 2.5, 5.0 and 7.5 wt.% catalyst should create three distinct sample formulations.

Do not average them.

The same applies to:
- catalyst composition ratio;
- particle size;
- milling time;
- cycle number;
- preparation route.

---

## Rule 10 — Do not create rows for hypothetical combinations

The project proposal:

`MgH2 + Fe/Ni + N-C + CaF2`

must **not** receive measured output values unless a primary paper tests that actual formulation.

A future ML prediction for such a combination is allowed, but it must be labeled `predicted`, never `measured`.

---

## Rule 11 — Preserve source precision

If the paper states:
- `~5.8 wt.%`
- `approximately 250 °C`
- `5.8 ± 0.2 wt.%`

preserve that information.

Suggested fields:

```text
value_numeric
value_uncertainty
value_qualifier
```

Qualifiers can include:
- `exact_reported`
- `approximate`
- `range`
- `digitized`

---

## Rule 12 — Avoid silent chemistry normalization

Keep both:

```text
catalyst_raw
catalyst_normalized
```

Example:

```text
catalyst_raw = "Fe0.64Ni0.36@C"
catalyst_normalized = "Fe0.64Ni0.36@C"
```

Do not simplify it to `"FeNi"` unless a separate higher-level descriptor is also retained.

Likewise:
- `Ni@C`
- `Ni/C`
- `Ni nanoparticles on mesoporous carbon`

may be related but are not automatically identical materials.

---

# 12. Source-quality grades

Every extracted numeric measurement should receive a quality grade.

## Grade A — highest confidence
Direct numeric value from a **primary experimental paper's table or explicit text**, with conditions clearly attached.

Use for training.

## Grade B
Value digitized from a **primary paper figure**, with axis/curve identity and conditions verified.

Use for training, but preserve `digitized=true`.

## Grade C
Value reported in a review and cross-checked against enough primary metadata, but the primary full text is not available.

Do not use by default. Keep in staging.

## Grade D
Secondary summary, ambiguous snippet, project document, or value whose experimental conditions cannot be verified.

Do not train.

The initial Phase 4 model should ideally use **A + B only**.

---

# 13. Two-pass extraction workflow for ChatGPT Work / Claude Cowork

When the PDFs are collected, do not ask an agent simply to "make a CSV." Use a controlled two-pass workflow.

## Pass 1 — faithful extraction

For each paper:

1. Read the title, DOI, year and experimental section.
2. Identify every distinct sample/formulation and control.
3. Extract preparation parameters.
4. Locate every quantitative hydrogen-storage measurement.
5. Separate absorption, desorption, TPD, DSC, PCT and cycling measurements.
6. Record every number with exact page/table/figure provenance.
7. Keep original units and normalized units.
8. Extract tables before digitizing figures.
9. Digitize figures only when they add conditions not available in text/tables.
10. Output per-paper staging JSON/CSV.
11. Do **not** infer missing values.

The agent should finish each paper with an audit summary:

```text
Samples found:
Measurements found:
Tables extracted:
Figures digitized:
Missing/ambiguous fields:
Possible duplicate values:
Scientific-scope notes:
```

---

## Pass 2 — independent validation

Then run a second review over the staged extraction:

1. Compare every row against the source.
2. Verify units and conversions.
3. Check absorption/desorption direction.
4. Check temperature/pressure/time are attached to the correct curve.
5. Verify catalyst loading and sample naming.
6. Check controls were not confused with doped samples.
7. Detect values repeated in abstract/conclusion/table and deduplicate them.
8. Verify that review values have not duplicated primary-paper rows.
9. Assign quality grades.
10. Reject unverifiable rows.

Only after Pass 2 should data enter the canonical dataset.

---

# 14. Recommended future agent prompt skeleton

Use this only after the paper acquisition stage is complete.

```text
You are building a provenance-preserving experimental dataset for Mg/MgH2
hydrogen-storage catalysts.

Read every supplied primary paper and its supplementary material completely.

Do not summarize the papers. Extract experimental data.

The canonical rule is:
one physically distinct formulation/preparation = one sample;
one measured observation under one set of conditions = one measurement.

Never infer a missing value.
Never combine values from different experiments.
Never assign review-paper values to a primary sample unless verified in the
primary paper.
Never turn a hypothesis or mechanism claim into a measured numeric value.

For every numeric measurement record:
- DOI/paper ID
- sample ID
- experiment group ID
- measurement mode
- temperature
- pressure
- time
- cycle number if applicable
- reported target/value
- page
- table or figure
- raw units
- normalized units
- extraction method
- quality grade

Preserve controls and every tested catalyst loading/composition as separate
samples.

If a graph is digitized, mark digitized=true and use a curve_id. All points
from the same curve must share the same experiment_group_id.

Output:
1. papers.csv
2. samples.csv
3. measurements.csv
4. phases_mechanisms.csv
5. extraction_audit.md

After extraction, perform an independent verification pass against the source
PDFs and list every corrected or rejected row.
```

---

# 15. Model-preparation rules after extraction

These are not tasks for the current acquisition stage, but the dataset should be built now so they remain possible.

## Train/test split

Never random-split individual curve points.

Preferred hierarchy:

1. **paper-held-out test** — strongest;
2. experiment-group-held-out split;
3. sample-held-out split.

The test set should contain papers/formulations that the model did not see during training.

---

## Candidate prediction targets

Start with targets that have enough complete rows:

### Target A — hydrogen capacity
Conditioned on:
- material/catalyst descriptors;
- absorption vs desorption;
- temperature;
- pressure;
- elapsed time;
- cycle number.

### Target B — onset dehydrogenation temperature
Separate from peak temperature.

### Target C — activation energy
Only after enough comparable values are available.

Avoid building one model that treats capacity, onset temperature, Ea, and cycling as the same target.

---

# 16. Papers that give the best data return per hour

If acquisition time becomes limited, prioritize in this order:

1. `10.1016/j.ijhydene.2024.08.449` — Fe/C, Ni/C, Fe-Ni/C.
2. `10.1016/j.est.2025.116824` — CoNi/C vs FeNi/C.
3. `10.1016/j.ijhydene.2021.05.172` — six sulfides in one protocol.
4. `10.1016/j.fuel.2025.135635` — 3/5/7/10 wt.% Fe-HSS.
5. `10.1016/j.jma.2022.07.004` — 2.5/5/7.5 wt.% NZC/Ni@CNT.
6. `10.1016/S1003-6326(24)66565-9` — 2.5/5/7.5 wt.% Ni@CNT.
7. `10.1016/j.cej.2024.155285` — systematic Ni particle-size effect.
8. `10.1016/j.jma.2024.10.011` — Ni/Nb composition variation.
9. `10.1016/j.ijhydene.2024.11.092` — TiOF2 vs NbO2F.
10. `10.1016/j.jpowsour.2006.04.059` — CaF2 vs NbCl5 vs Nb2O5.
11. `10.1016/j.jallcom.2020.156035` — FeNi@C.
12. `10.1016/j.jma.2026.102033` — FeNi-S/carbon controls.
13. Existing FeNi2S4 paper — multiple temperatures + curves.
14. `10.1016/j.jma.2023.10.003` — Ni/Ti catalyst composition.
15. `10.1016/j.jma.2021.11.005` — loading + room-temperature + cycling.

These give controlled variation, which is usually more informative for a small literature dataset than collecting many single-point "best catalyst" papers.

---

# 17. Final acquisition verdict

### What should be in the future core training source pool?
- Primary Mg/MgH2 catalyst papers.
- Quantitative experiments with recoverable conditions.
- Controls and multiple catalyst formulations/loadings.
- Figure data only when traceable and grouped correctly.

### What should stay separate?
- MgH2-NaAlH4 and other reactive hydride composites.
- Mg-alloy hydrogen-storage studies where composition is the base storage material rather than a catalyst.
- DFT-only studies.
- reactor/system-engineering studies.

### What should never be used as direct training truth?
- Reviews when the primary source is available.
- hackathon/project summaries;
- abstract-only snippets when full experimental context is unknown;
- hypothetical catalyst combinations;
- combined values synthesized from different papers.

The source pool identified here is already sufficient to build a serious curated Phase 4 dataset. The next objective should be **acquiring the P1 papers and their supplementary information**, not training yet.
