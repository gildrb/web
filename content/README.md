# Writing Case Studies

Each case study is authored in one Markdown file:

- `filen.md`
- `heph.md`
- `ml7.md`
- `n0thing.md`
- `site.md`

Edit these files instead of the generated `<project>/index.html` pages or the HTML templates.

## Format

Begin with one page title. A deck paragraph and the complete three-row metadata group are optional:

```markdown
# Your case-study title

> A short introduction to the project.

- **Contribution:** What you did
- **Scope:** What the work covered
- **Context:** Where the work belongs
```

For an unfinished image-led draft, omit all three metadata rows and end the file with `## MORE SOON`.

Write the article with ordinary Markdown:

```markdown
## Section heading

Write paragraphs normally. Use **bold text**, `inline code`, and
[external links](https://example.com) when needed.

### Optional smaller heading

- Lists work too.
- Keep each item on one line.
```

Use `###` for short signposts inside a continuous story. Reserve `##` for a
major section that should have the full chapter-sized gap above it.

Existing responsive images use a `media:` reference. The text in square brackets is the visible caption:

```markdown
![Your image caption.](media:filen-wordmark)
```

Every media reference needs a visible caption of no more than five words.

Keep consecutive media lines together to render a two-column image grid. Do not rename the media identifier unless its matching file in `src/case-media/<project>/` is renamed too.

Fenced code blocks can carry a visible label:

````markdown
```text title="A short label"
command --example
```
````

## Build

After writing, run:

```sh
node scripts/build-page.mjs
node scripts/verify-page.mjs
```

The build converts Markdown into the existing static HTML and preserves the current layout, responsive images, typography, navigation, and accessibility behavior.
