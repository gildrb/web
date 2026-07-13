# Making privacy and obscurity visible through design

> Filen is a zero-knowledge cloud storage product I use daily, which is why I ended up turning my idea into a design. Genuinely love the team and product and hopeful, that my design will be used officially by the team in the future. 

- **Contribution:** Everything 
- **Scope:** Brandmark, Wordmark, Lockup, Typography, Icons, Brand colors, Copy
- **Context:** Zero-knowledge encrypted cloud storage

![The final lockup. The mark carries the recognition; the restrained wordmark keeps the system usable across product and communication surfaces.](media:filen-wordmark)

## The problem was larger than a logo

Filen is built around zero-knowledge, client-side encrypted storage. That creates a visual problem: security has to feel fundamental, but an identity made from the usual shields, locks, and circuit lines can quickly become interchangeable with every other security product.

I treated the logo as the smallest part of a larger system. The mark needed to remain identifiable as an application icon, hold together beside a wordmark, survive at small sizes, and provide enough visual material for campaigns and product communication.

## Start broad enough to learn something

The first exploration was deliberately expansive. I drew literal folders, constructed letterforms, layered security metaphors, shields, containers, and folded planes. Several directions were clean enough to become logos. That was not the same as being right for Filen.

Keeping the attempts on one board made comparison more useful than polishing them in isolation. Repeated forms became visible. So did the dead ends: marks that depended on interior detail, symbols that read primarily as shields, and letter constructions that lost their character when reduced.

![The working board, not a reconstructed process graphic. Early studies cluster at the lower left; mark-and-word combinations expand through the center; later candidates occupy the right and upper areas.](media:filen-exploration-board)

## Converging on one useful structure

The selected mark combines an open container with a folded, crossing top plane. It can suggest a file, a protected space, or an abstract **F** without requiring any one reading to work. That ambiguity is useful: the symbol belongs to the product without becoming an illustration of encryption.

The geometry is deliberately sparse. Large filled areas preserve the silhouette when the mark is small, while the split top creates the distinctive moment. The same construction can be flat for interfaces or given depth when an application needs a more tactile expression.

![Scale is a system requirement, not a presentation afterthought.](media:filen-logo-scale)
![The app icon adds depth while preserving the same underlying silhouette.](media:filen-app-icon)

## Translate architecture into language

Encryption is a technical mechanism; people experience its consequences as privacy and control. The campaign layer moves between those two levels. “Zero knowledge. Total control.” names the architecture and the user benefit in one line. “Storage that earns nothing from knowing you” turns the business model into a concrete position.

The visual language stays monochrome so that scale, contrast, rhythm, and the mark’s geometry do the work. Repeated vertical forms and controlled light give the flat identity a spatial vocabulary without introducing a separate decorative system.

![](media:filen-zero-knowledge-campaign)
![](media:filen-storage-message)

![The mark remains the anchor even when the system becomes more atmospheric.](media:filen-logo-texture)

## Implementation continues the design work

A case study about a scalable identity should also be delivered as a scalable interface. This page is static HTML and CSS, with responsive sources selected by the browser. The original exploration board is never enlarged beyond its 1280-pixel source, and smaller devices avoid downloading the largest file.

```text title="The responsive exploration image used on this page"
<img
  src="/images/optimized/gil-rodrigues-filen-exploration-board-960.webp"
  srcset="
    /images/optimized/gil-rodrigues-filen-exploration-board-480.webp 480w,
    /images/optimized/gil-rodrigues-filen-exploration-board-720.webp 720w,
    /images/optimized/gil-rodrigues-filen-exploration-board-960.webp 960w,
    /images/optimized/gil-rodrigues-filen-exploration-board-1280.webp 1280w
  "
  sizes="(max-width: 768px) calc(100vw - 24px), (max-width: 1100px) calc(100vw - 336px), 760px"
  width="1280"
  height="956"
  loading="lazy"
  decoding="async"
/>
```

## What the process changed

The strongest decision was not a single drawing. It was keeping enough alternatives visible to understand what the identity needed to stop doing. The final mark emerged after the literal security symbols, complex constructions, and fragile details had been tested against the broader system.

Looking back, the next useful extension is not another mockup. It is documentation: spacing, minimum sizes, icon construction, motion behavior, and product tokens that let other people apply the identity without reinterpreting it each time. That is how an identity becomes maintainable rather than merely finished.
