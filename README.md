# DeepUnfolding-Agent GitHub Pages Site

This is a static GitHub Pages project page for DeepUnfolding-Agent / DUAgent.

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
