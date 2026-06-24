# DeepUnfolding Agent website files

These files are for the GitHub Pages website repository:

```text
deepunfolding-agent.github.io/
├── index.html
├── style.css
└── assets/
    ├── architecture.svg
    ├── favicon.svg
    └── logo.svg
```

## Recommended repository setup

Create the GitHub organization:

```text
deepunfolding-agent
```

Then create the website repository inside that organization:

```text
deepunfolding-agent.github.io
```

Copy these files into that repository root and push to `main`.

The website should become:

```text
https://deepunfolding-agent.github.io/
```

## Important edits before final release

In `index.html`, replace these placeholders if needed:

1. Paper link:

```html
href="assets/deepunfolding_agent_paper.pdf"
```

Add the final PDF file into `assets/`, or replace the link with an arXiv/IEEE/Zenodo URL later.

2. GitHub link:

```html
https://github.com/deepunfolding-agent/DeepUnfolding-Agent
```

If the code repository is still under your personal account, replace it with:

```html
https://github.com/shanikairoshi/DeepUnfolding-Agent
```

3. Dataset link:

The current Dataset button points to the Dataset section. Replace it with your final Hugging Face, Zenodo, or institutional repository URL when ready.
