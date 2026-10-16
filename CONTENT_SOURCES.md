# Content provenance / 资料核对记录

**v4 note (2026-10-15):** Historical provenance retained from the prior package. The current revision changes presentation and adds an opt-in visitor service; it does not independently repeat the publication verification below.

Prepared on **2026-10-06**. This is a maintainer document; it is not copied into the deployed `dist/` folder.

## Author-provided material

The main source is Yuteng Zhang's CV text in the current request. Education, employment, GPAs, roles, dates, ICDM/SIGSPATIAL acceptance, and the corresponding-author designation were treated as author-provided facts. The four current research themes come directly from the request: **LLM Mobility, Agent, Interpretability, IEOR**.

Current-request details supersede older profile memory: HKUST(GZ) Ph.D. begins September 1, 2026; expected completion June 1, 2029; advisor Prof. Jiawei Wang; UW M.S. September 2024–June 2026; Jilin B.E. Software Engineering GPA 3.67/4.00; THINKLab March 2025–August 2026; CET 512 TA September–December 2025; IIGF January–June 2024. Public-facing dates are simplified to months, while the supplied exact doctoral dates remain in `data/profile.json`.

The current email `yzhang219@connect.hkust-gz.edu.cn` and existing public GitHub account `nickjames21119` were recovered from previously supplied personal profile information. This package does not expose older/private emails, student ID, residence, API keys, or unpublished project implementation details. The name is presented as Yuteng Zhang in both language versions, matching the current author-supplied CV.

## Public sources checked

### Google Scholar

Author-supplied profile:

https://scholar.google.com/citations?user=wu8mlCQAAAAJ&hl=zh-CN

Direct retrieval returned a rate-limit error, but a search-indexed version of the same profile was accessible. It showed the HKUST(GZ) affiliation and the three journal papers listed below. Citation counts and h-index were intentionally not imported because they change. The site links to the same profile with an English UI parameter; this does not change the profile ID.

### LinkedIn

https://www.linkedin.com/in/yuteng-zhang-57961627a/

Direct automated access was blocked (HTTP 999). The supplied URL is retained with `isSelfProfile=true` removed. No unobserved LinkedIn content was used as evidence.

### Advisor

https://wangjw6.github.io/

Jiawei Wang's own academic page described his HKUST(Guangzhou) Intelligent Transportation position and research in generative transportation. This page is the advisor hyperlink. The student's advisor relationship itself comes from the supplied CV, not an inferred lab-membership claim.

A university faculty-profile endpoint also appeared in search:

https://facultyprofiles.hkust-gz.edu.cn/faculty-personal-page/WANG-Jiawei/

It exposed little substantive text, so it was not used to invent further biographical detail.

### Heatwave paper — important update

Publisher record:

https://www.sciencedirect.com/science/article/abs/pii/S1361920926001562

TRID record:

https://trid.trb.org/View/2692634

Publisher/record DOI:

https://doi.org/10.1016/j.trd.2026.105363

These sources agree on: **Yuteng Zhang, Lyra Chen, Cynthia Chen; Transportation Research Part D: Transport and Environment; volume 156; July 2026; article 105363.** The title matches the supplied heatwave paper. Therefore the website and generated CV use **Published / TRD 2026**, not the older “under review” status. The author's supplied TRB 2026 presentation and SSRN DOI are retained as notes/links on the same entry, not counted as two separate publications.

Supplied preprint link:

https://doi.org/10.2139/ssrn.5577058

No abstract or full-text passages are copied. The one-sentence description is a short paraphrase of the study subject.

### LBS paper

Publisher:

https://www.sciencedirect.com/science/article/pii/S0968090X25004206

TRID:

https://trid.trb.org/View/2622401

DOI:

https://doi.org/10.1016/j.trc.2025.105416

Verified journal issue: **Transportation Research Part C: Emerging Technologies, volume 182, January 2026, article 105416.** The website uses the 2026 issue year, not the 2025 year embedded in the DOI / online publication record. The author's initial R. Wang is expanded as **Ryan Wang**, matching publisher metadata. Ekin Uğurel's spelling is preserved consistently with the user's CV.

### GANSamples-ac4C

PubMed:

https://pubmed.ncbi.nlm.nih.gov/38431142/

DOI:

https://doi.org/10.1016/j.ab.2024.115495

Verified: **Analytical Biochemistry, volume 689, June 2024, article 115495**; first online February 29, 2024. Full author names were taken from this record, preserving author order. No claim is made that Yuteng Zhang is the first/corresponding author of this paper. It is categorized as earlier machine-learning work rather than artificially presented as transportation research.

### FREIGHT-MNet / ICDM 2026

The title, authors Y. Zhang and A. Banerjee, ICDM 2026 acceptance, and corresponding-authorship note are supplied directly by the author. Exact-title public searches did not retrieve a matching indexed record. **This is not evidence that the acceptance is incorrect.** The record remains “Accepted.” No expanded given name for A. Banerjee, DOI, page range, benchmark statistics, GitHub repository, or PDF URL is fabricated.

Because there is no verified public paper link, the website displays a working **Request paper** mailto link instead of a dead placeholder.

### Causal-Flow SCM / SIGSPATIAL 2026

Title, author order, acceptance, Riverside location, November 3–6, 2026 dates, and DOI are author-supplied. E. Uğurel's full name is consistent with the other public publication records. Exact-title searches did not independently retrieve this accepted paper, and the DOI could not be resolved by the available browsing tool during this session.

The supplied DOI is retained without pretending that the publisher landing page was independently verified:

https://doi.org/10.1145/3841645.3842948

No conference proceedings pages, performance improvements, code links, or abstract claims are added. Recheck metadata after proceedings publication.

## Editorial safeguards

- Research directions are interests, not invented completed projects or publication claims.
- The city/agent artwork is explicitly labeled conceptual; it contains no real trajectory or experimental measurements.
- No fake impact metrics, awards, citation counters, SOTA percentages, paper downloads, or job titles are displayed.
- The profile uses “Ph.D. student,” not “Professor” or “Ph.D. candidate.”
- The CV is printable HTML; there is no nonexistent PDF download.
- Summaries are brief subject descriptions; no full copyrighted abstract is reproduced.
- There is no fake contact-form submission. The contact action opens the visitor's mail application.
- The site is a static snapshot. Updates to publications must be made in `data/profile.json` and rebuilt.

## Deployment references

GitHub's official Pages quickstart and publishing-source instructions were consulted:

https://docs.github.com/en/pages/quickstart

https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

No GitHub repository was created, modified, or deployed in this task.
