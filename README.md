# DeepUnfolding-Agent GitHub Pages Site

This is a static GitHub Pages project page for DeepUnfolding-Agent / DUAgent.

## How to use

1. Copy all files into the root of your GitHub Pages repository, for example `shanikairoshi.github.io`.
2. Replace placeholder names in the People section.
3. Replace the placeholder SVG figures in `assets/figures/` and `assets/plots/` with your real paper figures and results.
4. Update the GitHub button and citation block if your final repository URL or paper details change.
5. Commit and push:

```bash
git add .
git commit -m "Update DUAgent project website"
git push origin main
```

## Recommended figure names

- `assets/figures/duagent_pipeline.svg`
- `assets/figures/api_workflow.svg`
- `assets/figures/quantum_workflow.svg`
- `assets/figures/external_benchmark.svg`
- `assets/plots/classical_fixed_vs_adaptive.svg`
- `assets/plots/qfl_noise_controls.svg`
- `assets/plots/ibm_qpu_summary.svg`

You can use `.png` or `.pdf` for downloadable links, but `.svg` or `.png` is best for direct display on GitHub Pages.


## Interactive Demo

The `index.html` file includes a browser-side DUAgent interactive demo. It does not call a live FastAPI server; instead, it simulates the control loop in JavaScript so that GitHub Pages can host it as a static site.

Visitors can change:

- workflow type: Quantum QFL or Classical FedProx
- previous validation loss
- gradient or quantum-gradient norm
- shot-noise level
- circuit depth or local epochs
- maximum allowed shots
- target validation loss

The page recomputes the suggested controls, projected validation loss, safety clipping, request JSON, and response JSON immediately.
