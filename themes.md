kinetic:
<prompt>
<task>
Apply this visual style to the user's existing project. Inspect and preserve its stack, copy, routes, and behavior. Follow existing component and styling conventions. Treat framework, library, and page examples in these design instructions as illustrations; they do not require a stack change or new sections. Scope changes to the user's requested work.

Keep controls keyboard accessible, focus visible, and text legible. Preserve reading order, responsive behavior, and reduced-motion preferences. Verify actual states at the rendered width. The user's stack and content take precedence over illustrative implementation details.
</task>

<design-system>
# Kinetic

## Identity

Make typography occupy the page at poster scale. White type, a near-black ground, orange fields, hard rules, and oversized arrows create a direct, energetic composition. Most content stays still; a few text treatments supply the motion.

## Layout

Open with tightly stacked uppercase lines that nearly fill the available width. Alternate the alignment of selected lines, and place one line on an orange band. Put smaller supporting copy and rectangular actions below this display. A narrow repeated-text band can separate the opening from the next group.

Use very large section titles above dense ruled rows. Feature rows can combine a small index, a large heading, a quiet oversized numeral behind it, and an opaque reading panel. Editorial items work as horizontal image, story, and metadata rows. Steps can progress across the page, while a broad orange benefit field interrupts the dark ground. Quotations and comparisons can occupy wide horizontal listings. A closing statement can return to the opening's scale beside an oversized directional arrow.

Let the brief determine the content and sequence. Use actual text that can sustain the large scale; do not invent statistics or short claims just to fill a band.

## Typography

Use Host Grotesk, bound to "Kinetic Host Grotesk". Display lines are heavy, uppercase, tightly tracked, and close-set. Their size responds to the container width, with different line sizes chosen to balance the available words. Smaller headings keep the same compact force. Reading panels use normal sentence case, a moderate weight, and enough leading to remain comfortable beside the display.

## Color and surfaces

Near-black is the main ground, white is the reading color, and orange carries major emphasis. Dark grey supplies decorative numerals; a lighter grey supplies rules. Keep long reading on opaque grounds when large numerals or orange hover fields sit behind it.

Use square edges and visible horizontal rules. The page is built from type and continuous fields, with little need for rounded cards, shadows, gradients, or layered glass.

## Components

Use rectangular actions with large arrows and immediate fill changes. A small press scale can give feedback. Keep the full label visible and focus clearly outlined.

Feature rows can turn orange on hover while their reading panels retain contrast. Comparisons use separated identity, details, and action columns. A selected control can change its fill and arrow direction, with an explicit pressed state. Disclosures use simple plus/minus markers and ruled rows. Avoid treating decorative arrows as unlabeled controls.

## Images

Use grayscale editorial photographs in simple rectangular frames. On wide layouts, keep the image beside its story and metadata; choose crops around the real subject. Preserve meaningful alternative text. The display typography should remain the dominant element even when photography appears.

## Motion

Use a slow linear marquee for short repeated text, with a second band optionally moving in the opposite direction. Hide duplicate copies from assistive technology. Keep essential reading available without waiting for a loop and provide a way to pause continuous motion.

During scroll, opening lines can drift slightly in opposing directions and compress horizontally by a few percent. Section titles can reveal a narrow clipped edge as they arrive. Keep these movements small; paragraphs and controls stay stable. Reduced motion must stop marquees and show headings fully without scroll transforms.

## Responsive behavior

At 850px, simplify the support columns, move editorial metadata beneath its story, and reduce comparison columns. At 560px, stack supporting prose, editorial items, steps, quotes, and comparison contents. Facts and footer groups can remain in two columns. Use wide mobile image crops and scale display lines to fit the actual words. Keep reading panels opaque and prevent large arrows or numerals from covering content.

## Design limits

Avoid scroll locking, full-screen loading sequences, constantly moving paragraphs, and text that becomes readable only after animation. Large type may approach an edge, but essential words and controls must remain complete at every width.

## Authoritative tokens

| CSS variable | Value |
| --- | --- |
| --dp-color-ground | #101010 |
| --dp-color-ink | #ffffff |
| --dp-color-accent | #ff6b00 |
| --dp-color-decorative | #343434 |
| --dp-color-rule | #5c5c5c |
| --dp-typography-face | "Kinetic Host Grotesk", sans-serif |
| --dp-typography-body | 18px |
| --dp-typography-reading | 16px |
| --dp-typography-small | 14px |
| --dp-typography-label | 12px |
| --dp-typography-display-weight | 800 |
| --dp-typography-heading-weight | 700 |
| --dp-typography-label-weight | 600 |
| --dp-typography-solid-leading | 1 |
| --dp-typography-display-tracking | -0.045em |
| --dp-spacing-gutter | max(14px, 2.2cqw) |
| --dp-spacing-column-gap | 4cqw |
| --dp-spacing-reading-inset | 14px 18px |
| --dp-radius-control | 0 |
| --dp-border-rule | 2px |
| --dp-motion-marquee-easing | linear |
</design-system>
</prompt>

terminal:
<prompt>
<task>
Apply this visual style to the user's existing project. Inspect and preserve its stack, copy, routes, and behavior. Follow existing component and styling conventions. Treat framework, library, and page examples in these design instructions as illustrations; they do not require a stack change or new sections. Scope changes to the user's requested work.

Keep controls keyboard accessible, focus visible, and text legible. Preserve reading order, responsive behavior, and reduced-motion preferences. Verify actual states at the rendered width. The user's stack and content take precedence over illustrative implementation details.
</task>

<design-system>
# Terminal

## Identity

Build a continuous black page in green IBM Plex Mono. Arrange content as commands and their output, with a numbered command gutter, character-based alignment, and thin green rules. White is reserved for strong emphasis. The page should read like a useful session manual.

## Layout

Use a narrow command gutter beside a wider output column. Measure horizontal spacing in character units so numbers, labels, and text share a consistent rhythm. A compact session bar can introduce the page. The opening may pair a large title and actions with a narrow list of supporting facts.

Carry the command/output relationship through the page. Available output patterns include a compact capability listing, numbered steps, quoted statements with attribution, broad comparison rows, and a directory-style footer. Keep related information in rows with fine separators. Use a larger gap between commands than between lines of output.

A character-rendered wordmark or image can be part of the identity, but derive it from the customer's name or actual imagery. Do not invent shell commands, logs, file paths, statuses, or metrics that imply functionality the product lacks.

## Typography

Use IBM Plex Mono regular and medium, bound to the "TerminalPlex" alias. All text, controls, and numbers stay monospaced. Use the body, label, heading, and display tokens to preserve the restrained scale. Keep ordinary reading at the body-leading value and lists aligned to the row spacing. Prefer weight, white emphasis, punctuation, and indentation to another font or oversized display typography.

## Color and surfaces

Use ground for black, ink for primary green, ink-muted for supporting text, and rule for quiet separators. Emphasis is white. Keep every field flat and square. Do not add glow around reading text, simulated screen curvature, texture, or shaded cards. A filled green control with black text can identify an action or selected state.

## Components

Present actions as clearly labeled rectangular controls or bracketed links. Use inversion or an underline for hover and a visible outline for keyboard focus. A comparison can use one row per option, with identity at the left, features in the output column, and the action beneath. Keep a featured label separate from the current selection and expose selection through the control's semantics.

Native disclosures can use a compact question row and plus/minus at the right. Keep the answer indented into the output column. Every visual command that acts must remain a real link or button; decorative syntax must not obscure its name.

## Images

The distinctive image treatment is a fixed-width character rendition of a real photograph. Preserve enough tonal structure to recognize the subject, and keep accessible image text describing the source image. Mark the decorative character rendition as hidden from assistive technology to avoid reading a wall of symbols. Reserve its dimensions and keep character alignment intact. Use this pattern only where an image helps; portraits and decorative graphics are not required.

## Motion

A single cursor can blink at the motion token's interval using discrete steps. Stop the blink under reduced motion. Other content and state changes remain still and immediate. Do not animate typing, stream invented logs, or make the reader wait for text to appear.

## Responsive behavior

At 1100px, narrow the command gutter and comparison identity column. At 800px, stack the hero and prose, simplify capability rows, and move comparisons to a vertical layout. Editorial entries can temporarily pair a character image with text beside it. At 540px, stack those entries, shorten indentation, and use single-column feature lists. Preserve the command/output relationship without horizontal scrolling. Footer groups can remain in two columns where their labels fit.

## Design limits

Keep the interface green, black, and white, with character-aligned structure and no rounded cards. Use actual customer content and meaningful command wording. A terminal appearance does not justify fake output, inaccessible preformatted prose, or decorative progress indicators.

## Authoritative tokens

| CSS variable | Value |
| --- | --- |
| --dp-color-ground | #000000 |
| --dp-color-ink | #66ff66 |
| --dp-color-ink-muted | #58ca58 |
| --dp-color-rule | #255325 |
| --dp-color-emphasis | #ffffff |
| --dp-typography-face | "TerminalPlex", monospace |
| --dp-typography-body | 18px |
| --dp-typography-label | 16px |
| --dp-typography-heading | 24px |
| --dp-typography-display | 40px |
| --dp-typography-display-narrow | 32px |
| --dp-typography-body-leading | 1.5 |
| --dp-typography-display-leading | 1.2 |
| --dp-typography-display-leading-narrow | 1.25 |
| --dp-typography-list-leading | 27px |
| --dp-spacing-cell | 1ch |
| --dp-spacing-gutter | 2ch |
| --dp-spacing-column-gap | 3ch |
| --dp-spacing-column-gap-wide | 4ch |
| --dp-spacing-inset | 9px |
| --dp-spacing-row-compact | 18px |
| --dp-spacing-row | 27px |
| --dp-spacing-section-compact | 36px |
| --dp-spacing-section | 54px |
| --dp-radius-control | 0 |
| --dp-border-hairline | 1px |
| --dp-motion-cursor | 1.2s |
</design-system>
</prompt>

playfull geometric:
<prompt>
<task>
Apply this visual style to the user's existing project. Inspect and preserve its stack, copy, routes, and behavior. Follow existing component and styling conventions. Treat framework, library, and page examples in these design instructions as illustrations; they do not require a stack change or new sections. Scope changes to the user's requested work.

Keep controls keyboard accessible, focus visible, and text legible. Preserve reading order, responsive behavior, and reduced-motion preferences. Verify actual states at the rendered width. The user's stack and content take precedence over illustrative implementation details.
</task>

<design-system>
# Playful Geometric

## Identity

Use an activity-book composition with outlined geometric pieces, warm paper, white reading areas, and violet, pink, amber, and mint accents. Broad rounded containers, visible hard offsets, and bold friendly type give the page its character.

## Layout

Open with a slightly wider text column beside a static assembly of colorful shapes. Give the opening statement substantial scale and leave clear space around the actions. A fact strip can sit across layered mint and outlined bases.

Group related explanation, features, and editorial images inside a shared white book shape with violet offset backing and a small colored tab. Use a numbered process strip with a connecting line when sequence matters. Benefits can share a pale-mint panel, while quotations use speech-like panels. Broad comparison tickets are available for choices. A mint back-cover shape can hold the closing statement with sparse geometric confetti around its edges. Inset a dark slate footer into that cover, using pale text and a broad curved top.

Choose these patterns according to the brief. The design does not require educational content, a fixed section count, or sample prices and quotes.

## Typography

Use Host Grotesk for heavy statements and headings, bound to "PlayfulGeometricDisplay". Use Instrument Sans for reading, labels, and controls, bound to "PlayfulGeometricReading". Wide opening headings scale from 62px to 102px, with compact leading and tight tracking. Keep paragraphs relaxed and substantially smaller. Large numbered shapes can mark a sequence without making every label oversized.

## Color and surfaces

Use warm pale paper as ground and white for the main book's reading area. Deep blue-grey supplies both ink and outlines. Violet is the main action color; pink, amber, and mint divide decorative pieces and selected supporting regions.

Use clearly visible outlines and hard offset shadows. Main panels have broad rounded silhouettes; small geometric pieces can be circles, triangles, arches, or blocks. Keep enough open ground between pieces to read their shapes. Avoid spreading every accent equally across every section.

## Components

Actions are rounded outlined controls with a colored fill and a firm offset shadow. Hover lifts slightly; press reduces the offset. Keep focus visible beyond the shadow.

Feature entries belong to the shared book grid. Numbered steps can sit on differently shaped badges along a connecting strip. Optional comparison tickets separate the choice, details, and action horizontally. Selection can add a pale-violet fill and violet shadow; keep any featured marker independent. Disclosures use open/close marks and readable outlined rows.

## Images

Use natural-color photographs with varied arched or rounded silhouettes and colored hard shadows. Stagger the group rather than making every image identical. Preserve the subject inside the crop and avoid layering shapes over meaningful details. Reserve image dimensions and provide useful alternative text. Decorative geometric pieces should not be announced as content.

## Motion

Use brief hover lifts and pressed feedback for controls. Keep the shape assembly, book layers, connecting strip, and confetti still. Remove transitions and transforms for reduced motion.

## Responsive behavior

At 1100px, tighten wide grids and geometric spacing. At 760px, stack the opening, book contents, editorial images, steps, quotes, and comparison internals. Preserve the book silhouette with narrower insets and smaller offsets. Facts and footer groups can remain in two columns. At very narrow widths, reduce control and heading sizes without shrinking readable labels or losing the outlined edge.

## Design limits

Keep geometry sparse enough to explain the composition. Avoid childish clip art, animated confetti, blurred shadows, glass, and a different card shape for every sentence. The customer's content supplies the tone; color and shapes should not introduce invented claims or a compulsory playful voice.

## Authoritative tokens

| CSS variable | Value |
| --- | --- |
| --dp-color-ground | #fffdf5 |
| --dp-color-panel | #ffffff |
| --dp-color-ink | #253044 |
| --dp-color-outline | #252b3a |
| --dp-color-accent | #6434df |
| --dp-color-accent-secondary | #ff78c5 |
| --dp-color-accent-warm | #ffd05b |
| --dp-color-accent-fresh | #9bf1cd |
| --dp-color-field-soft | #e9fff5 |
| --dp-color-selection | #f1ebff |
| --dp-color-rule-muted | #b8b6c5 |
| --dp-typography-display | "PlayfulGeometricDisplay", sans-serif |
| --dp-typography-reading | "PlayfulGeometricReading", sans-serif |
| --dp-typography-reading-compact | 16px |
| --dp-typography-label | 14px |
| --dp-typography-metadata | 13px |
| --dp-typography-reading-leading | 1.65 |
| --dp-spacing-gap-compact | 12px |
| --dp-radius-corner | 17px |
| --dp-border-outline-width | 3px |
| --dp-border-detail-width | 2px |
| --dp-motion-interaction | 180ms |
</design-system>
</prompt>

professional:
<prompt>
<task>
Apply this visual style to the user's existing project. Inspect and preserve its stack, copy, routes, and behavior. Follow existing component and styling conventions. Treat framework, library, and page examples in these design instructions as illustrations; they do not require a stack change or new sections. Scope changes to the user's requested work.

Keep controls keyboard accessible, focus visible, and text legible. Preserve reading order, responsive behavior, and reduced-motion preferences. Verify actual states at the rendered width. The user's stack and content take precedence over illustrative implementation details.
</task>

<design-system>
# Professional

## Identity

Use long serif statements, narrow explanatory copy, ivory grounds, and fine gold rules. The page is spacious and precise, with most emphasis coming from type scale and the relationship between broad headings and smaller text.

## Layout

Open with a large text-led statement across most of the page. An italic line can begin farther inward, creating a second alignment. Put supporting prose and the main actions beneath it in separate columns. The opening does not need an image.

For longer sections, place a heading in the left portion and entries in the wider right portion. Alternate open ivory areas with quiet pale bands. Feature and benefit lists can share these bands; editorial images, numbered steps, quotations, and comparisons stay within the same broad measure. Use a centered closing statement that continues into a light footer.

Let the brief determine which sections and content types appear. Maintain the broad-to-narrow relationship without requiring a business landing page, prices, or endorsements.

## Typography

Use EB Garamond regular and italic for headings, numbers, and quotations, bound to "Professional Garamond". Use Instrument Sans for paragraphs, navigation, metadata, and controls, bound to "Professional Instrument". The large opening scales from 68px to 128px with close leading and tight tracking. Keep the serif's regular weight; extra boldness would change its character. Sans labels can be small, uppercase, and widely tracked. Reading copy has generous leading and a controlled line length.

## Color and surfaces

Use ivory as ground and a slightly lighter tone for the few panel areas. Dark warm ink carries headings and reading; muted ink supports secondary information. Gold marks rules and small accents, with a darker gold role for readable emphasis.

Keep corners barely rounded and edges thin. Most content rests directly on the page. A featured comparison may use a pale raised surface and a restrained shadow, but this should remain a local emphasis.

## Components

Actions are compact rectangles with a dark primary fill and an outlined secondary treatment. Keep labels in the reading face and leave room for a small directional mark. Hover changes color without moving the layout; keyboard focus remains explicit.

Use fine dividers for feature lists, numbered steps, and disclosures. If the content calls for comparisons, use equal columns and one modestly raised featured option. Keep the featured label separate from the selected state. Quotes can use larger serif text with plain sans attribution.

## Images

Use natural-color editorial photography with quiet backgrounds and visible materials or architecture. Keep frames simple and crops deliberate. Isolated objects can use containment, while scenes can fill their frame with the important structure kept in view. Images support the reading sequence rather than dominating every section. Reserve their dimensions and describe meaningful subjects in alternative text.

## Motion

Use brief linear color and border transitions. Keep statements, images, and section boundaries still. Remove transitions when reduced motion is requested.

## Responsive behavior

At 1050px, narrow gaps and simplify the larger splits. At 760px, stack hero prose and actions, section headings and entries, editorial items, steps, quotes, and comparison columns. Facts and footer links can remain in two columns. At 480px, place feature and benefit entries in a single column. Reduce the headline scale and indentation while keeping the italic line distinct and the reading measure comfortable.

## Design limits

Avoid oversized gold ornament, marble textures, dark luxury fields, pill-shaped controls, and a card around every paragraph. Keep the palette warm and the page light. Authority should come from the customer's actual content and the clarity of its presentation.

## Authoritative tokens

| CSS variable | Value |
| --- | --- |
| --dp-color-ground | #f7f4ec |
| --dp-color-surface | #fcfaf5 |
| --dp-color-ink | #29271f |
| --dp-color-ink-muted | #514d44 |
| --dp-color-accent | #8b713a |
| --dp-color-accent-ink | #68501f |
| --dp-color-line | #d4ccbd |
| --dp-color-band-edge | #e7e0d3 |
| --dp-color-action-hover | #454034 |
| --dp-typography-display | "Professional Garamond", Georgia, serif |
| --dp-typography-reading | "Professional Instrument", Arial, sans-serif |
| --dp-typography-supporting | 15px |
| --dp-typography-metadata | 12px |
| --dp-typography-body-leading | 1.65 |
| --dp-spacing-control-gap | 24px |
| --dp-radius-corner | 3px |
| --dp-border-hairline | 1px |
| --dp-motion-interaction | 160ms linear |
</design-system>
</prompt>

industrial:
<prompt>
<task>
Apply this visual style to the user's existing project. Inspect and preserve its stack, copy, routes, and behavior. Follow existing component and styling conventions. Treat framework, library, and page examples in these design instructions as illustrations; they do not require a stack change or new sections. Scope changes to the user's requested work.

Keep controls keyboard accessible, focus visible, and text legible. Preserve reading order, responsive behavior, and reduced-motion preferences. Verify actual states at the rendered width. The user's stack and content take precedence over illustrative implementation details.
</task>

<design-system>
# Industrial

## Identity

Build one continuous instrument chassis in cool grey, with recessed dark screens, raised keys, engraved-style labels, and small orange indicators. The physical depth comes from consistent highlights and shadows, while the content remains ordinary readable text and recognizable controls.

## Layout

Contain the page in a broad rounded housing with a narrow vertical seam and numbered bays. Open with a large heading beside a compact control assembly: vent slots, a circular dial-shaped action, and a secondary key. A recessed facts display can sit below the opening.

Give related content shared hardware-like panels. Features can occupy an inset matrix within a raised deck; editorial images sit in recessed wells. Numbered steps can connect across the chassis. Benefits and quotations can share a dark output deck, while optional comparisons use removable-looking horizontal modules inside a recessed tray. A pale closing bay and the footer remain part of the same housing.

Choose the content groups the brief needs. The treatment does not require fabricated live readings, machine specifications, prices, or operational status.

## Typography

Use Host Grotesk for headings and reading, bound to "Industrial Host". Use IBM Plex Mono for small labels and technical-looking metadata, bound to "Industrial Plex". Headings are bold with tight tracking; the opening scales from 54px to 106px on wider layouts and uses compact leading. Reading text stays much smaller with clear spacing. Keep small monospaced labels brief and readable.

## Color and surfaces

Chassis is the main cool-grey ground. Raised is the lighter key and panel material; well is the darker recessed material. Use dark ink and slate labels on these areas. Field is the deep screen color, with distinct light roles for primary and secondary text. Orange identifies a few indicators and action details.

Light falls from the upper left. Raised parts have a pale top edge and a darker lower edge; recesses reverse that depth. Mild grey gradients can describe the housing and dial. Use small key corners within the larger rounded case. Screws, vents, and grooves should explain its construction without covering reading.

## Components

Navigation uses a bank of raised keys. Main actions can be rectangular keys or one circular dial-shaped button with a clear label and symbol. Hover lifts slightly; press sinks into the housing and changes the shadow. Keep focus visible outside the physical edge. A dial shape remains a button unless the project actually needs a rotary input.

Optional comparison modules use an inset pressed key and orange selection lamp, alongside a textual selected state. Featured emphasis is separate. Disclosures have raised plus/minus keys; open content stays in the reading bay. Decorative indicators must not imply a real system state.

## Images

Use grayscale photographs placed inside recessed rectangular wells with a small inset rim. Preserve complete subjects with containment where needed, including visible margins around objects or artwork. Reserve image dimensions and describe meaningful subjects in alternative text. Vents and screws are decorative.

## Motion

Use short key and dial transitions with a slight settling ease. Keep the chassis, meters, vents, and indicators still. Respect reduced motion by removing movement from hover and press while retaining clear depth and color changes.

## Responsive behavior

At 1100px, narrow the opening's control column and simplify comparison modules. At 760px, stack the large content areas and turn the control assembly into a horizontal unit beneath the heading. Facts remain in two columns; features, stories, steps, benefits, quotes, and comparisons become vertical. Keep the housing edge and bay numbering at a smaller scale, with two-column footer groups. At 370px, reduce the dial assembly and stack comparison details further.

## Design limits

Keep physical decoration subordinate to content and interaction. Avoid glossy chrome, rust, hazard stripes everywhere, animated fake telemetry, and unlabeled switches. Recessed reading areas need strong contrast; texture and shadows must not muddy the text.

## Authoritative tokens

| CSS variable | Value |
| --- | --- |
| --dp-color-chassis | #cbd0d2 |
| --dp-color-raised | #e7eaeb |
| --dp-color-well | #b6bec2 |
| --dp-color-ink | #181e22 |
| --dp-color-label | #414b52 |
| --dp-color-field | #20272b |
| --dp-color-on-field | #f2f4f4 |
| --dp-color-on-field-muted | #d8dee1 |
| --dp-color-accent | #f15b22 |
| --dp-typography-sans | "Industrial Host", sans-serif |
| --dp-typography-mono | "Industrial Plex", monospace |
| --dp-typography-body | 17px |
| --dp-typography-reading | 16px |
| --dp-typography-metadata | 13px |
| --dp-typography-label | 11px |
| --dp-spacing-column-gap | 25px |
| --dp-spacing-compact-gap | 12px |
| --dp-radius-key | 4px |
| --dp-radius-circular | 50% |
| --dp-border-hairline | 1px |
| --dp-motion-navigation | 130ms |
| --dp-motion-key | 140ms |
| --dp-motion-dial | 150ms |
| --dp-motion-settle | cubic-bezier(0.3, 0.7, 0.4, 1.25) |
</design-system>
</prompt>

retro:
<prompt>
<task>
Apply this visual style to the user's existing project. Inspect and preserve its stack, copy, routes, and behavior. Follow existing component and styling conventions. Treat framework, library, and page examples in these design instructions as illustrations; they do not require a stack change or new sections. Scope changes to the user's requested work.

Keep controls keyboard accessible, focus visible, and text legible. Preserve reading order, responsive behavior, and reduced-motion preferences. Verify actual states at the rendered width. The user's stack and content take precedence over illustrative implementation details.
</task>

<design-system>
# Retro

## Identity

Use an overcrowded desktop of offset windows, hard bevels, grey frames, white reading wells, and bright yellow, navy, pink, and teal fields. The familiar window furniture gives the page structure. Large contemporary sans headings keep the main message readable within it.

## Layout

Arrange the wide page on a twelve-column grid with windows that begin and end on different columns. Open with a broad yellow launch window beside a compact monitor-like facts panel. A bright pink strip can span beneath them.

Continue with overlapping readme-like text, a capability window with its own side panel, and a teal field of smaller editorial windows. A setup sequence can use numbered steps and a segmented progress motif. Benefits can occupy yellow; genuine quotations can appear as guestbook entries inside a pink patterned region. Optional comparisons use horizontal rows within a shared window. Close with a smaller dialog above a broad footer with folder-like link headings.

Keep the reading order clear through the offset composition. The brief decides which windows and content types exist; decorative application names, sample interface values, prices, and quotes are optional.

## Typography

Use Host Grotesk for heavy display headings, bound to "Retro Display". Use IBM Plex Sans for reading and interface labels, bound to "Retro Interface", and IBM Plex Mono for compact metadata, bound to "Retro Mono". The opening is uppercase, tightly tracked, and close-set, scaling from 62px to 94px on wider layouts. Keep paragraphs at a comfortable reading size. Do not turn all text into a tiny pixel font.

## Color and surfaces

Grey forms the window frame. Use white for inset reading areas, black for ink, navy for title bars, and teal for selected desktop regions. Yellow, purple, and pink carry strong local emphasis. Links can use a saturated blue hover state.

A fine tiled grey desktop can show between the windows. Use square corners, hard black offsets, and white top-left bevels opposed by dark bottom-right edges. Inset wells reverse the edge treatment. Keep large color fields flat and avoid soft shadows or blurred overlays.

## Components

Buttons resemble raised keys with clear labels and squared bevels. Pressing moves the key slightly and reverses its depth. Preserve a visible keyboard focus treatment.

Window title bars can name real content groups. Any close, minimize, folder, or navigation symbol presented as a control must have a real action and accessible label; otherwise make the ornament clearly decorative. Optional comparison selections use a purple pressed key, with a featured marker kept separate. Disclosures retain recognizable open/close behavior inside their window.

## Images

Use natural-color photographs in small inset picture windows. Keep crops direct and subjects recognizable. If genuine author or customer portraits exist, use compact square avatars beside their attribution and reuse each person's image consistently. Portraits and guestbook entries are not required. Reserve dimensions and supply meaningful alternative text.

## Motion

Controls use immediate pressed feedback. A decorative ticker arrow can shift in two small steps at a slow repeating cadence; keep the text beside it still. Disable that repetition for reduced motion. Do not simulate loading, error dialogs, or system alerts unless they describe a real state.

## Responsive behavior

At 1050px, tighten side panels and move comparison details beneath their main row. At 760px, stack the opening, readme, and major windows while retaining small horizontal offsets. Editorial windows can become image-and-text rows; steps and guestbook entries stack. At 480px, stack editorial contents, features, and benefits, and reduce decorative offsets. Facts and footer groups can remain in two columns. Keep bevels crisp and labels comfortably tappable.

## Design limits

Avoid distressed vintage textures, sepia filters, rounded modern cards, and fake operating-system behavior. Preserve the desktop's compact density without forcing tiny type, overlapping essential content, or horizontal page overflow.

## Authoritative tokens

| CSS variable | Value |
| --- | --- |
| --dp-color-window | #d4d4d4 |
| --dp-color-ink | #000000 |
| --dp-color-bevel-dark | #808080 |
| --dp-color-bevel-light | #ffffff |
| --dp-color-accent | #6600ff |
| --dp-color-highlight | #ffff00 |
| --dp-color-link-hover | #0000ff |
| --dp-color-desktop | #008080 |
| --dp-color-emphasis | #ff00b8 |
| --dp-color-titlebar | #000080 |
| --dp-typography-interface | "Retro Interface", sans-serif |
| --dp-typography-display | "Retro Display", sans-serif |
| --dp-typography-mono | "Retro Mono", monospace |
| --dp-typography-body | 16px |
| --dp-typography-supporting | 15px |
| --dp-typography-label | 12px |
| --dp-typography-body-leading | 1.4 |
| --dp-spacing-pane-inset | 5px |
| --dp-spacing-item-gap | 10px |
| --dp-radius-control | 0 |
| --dp-border-frame | 2px |
| --dp-border-rule | 1px |
| --dp-motion-ticker-cycle | 1s |
</design-system>
</prompt>

cyberpunk:
<prompt>
<task>
Apply this visual style to the user's existing project. Inspect and preserve its stack, copy, routes, and behavior. Follow existing component and styling conventions. Treat framework, library, and page examples in these design instructions as illustrations; they do not require a stack change or new sections. Scope changes to the user's requested work.

Keep controls keyboard accessible, focus visible, and text legible. Preserve reading order, responsive behavior, and reduced-motion preferences. Verify actual states at the rendered width. The user's stack and content take precedence over illustrative implementation details.
</task>

<design-system>
# Cyberpunk

## Identity

Use a near-black field, electric green signals, hard white headings, and dense monospaced records. Small cyan and magenta offsets suggest interference. Keep that interference static and local so the reading remains clear.

## Layout

Run a thin green signal rail along the main content with small section markers. Open with a large uppercase title and a compact geometric signal object to its right. Put descriptive copy and actions below, followed by a tightly ruled facts row when facts are available.

Carry the rail into unequal two-column sections: a narrower introduction beside a wider matrix, list, or record. Related process and benefit content can share a continuous track. An editorial group can pair one large image with smaller image-and-text entries beside it. Use horizontal comparison records instead of a row of rounded cards. Finish with another large green statement and a compact directory footer.

Let the brief determine the sections and their order. Barcodes, identifiers, channel labels, and diagram elements are optional decorative marks; they must not masquerade as real security or product status.

## Typography

Use IBM Plex Sans for display and headings, bound to "Cyberpunk Plex Sans", and IBM Plex Mono for reading, metadata, and controls, bound to "Cyberpunk Plex Mono". Set major statements in semibold uppercase with tight tracking and compact leading. The wide opening title scales from 68px to 138px. Keep explanatory paragraphs smaller and regularly spaced. Restrict displaced color copies or cuts to short display elements; body text remains intact.

## Color and surfaces

Ground is nearly black. Ink is hard white; ink-body and ink-muted carry reading and supporting text. Accent is green for rails, primary actions, signals, and selected states. Registration cyan and interference magenta appear sparingly at corners, small icons, or short fractures. Plate is a slightly raised dark field, with line and control-line supplying its boundaries.

Keep square geometry, fine rules, clipped corners, and occasional stepped edges. A faint static scanline overlay or a small green glow can mark a signal, but neither should reduce text contrast. Avoid broad multicolor lighting.

## Components

Use compact uppercase monospaced actions. A green primary button can have diagonally clipped opposing corners; secondary actions are ruled or outlined. Hover responds immediately through inversion or a brighter edge. Press movement is a small direct offset, with no easing. Keep an offset focus outline visible outside clipped shapes.

Feature matrices use open ruled cells. Process rows connect numbered markers along a vertical track. Comparisons use broad rows with separate identity, terms, and feature columns; selection adds a green inset edge and a filled control indicator. Disclosures use thin separators and a clear open/closed marker. Include these patterns only when needed.

## Images

Use grayscale photographs with modest added contrast. Keep image subjects recognizable beneath any fine static scanlines. A lead image may have a clipped corner, while smaller images sit beside concise text records. Reserve dimensions and adjust each crop for its subject. The interface does not need portraits, video, or a photographic hero.

## Motion

Keep the signal objects, fractures, and scanlines still. The interaction token is immediate. Do not add flashing glitches, animated noise, parallax, or timed text reveals. State changes should be readable without motion.

## Responsive behavior

At 1050px, tighten the main split, reduce the signal object, and let comparison details move beneath their identity and terms. At 700px, stack the section introduction above its content, collapse matrices and record groups, and retain a narrow green rail. The opening title scales down and supporting facts can remain in two columns. Small editorial entries can keep a thumbnail beside text. Stack comparison rows internally and use two-column footer groups.

## Design limits

Keep interference away from important copy and controls. Avoid rounded cards, large neon gradients, moving glitches, and fabricated terminal output. Use only the customer's actual claims, features, and states; the signal vocabulary does not require a fictional hacking narrative.

## Authoritative tokens

| CSS variable | Value |
| --- | --- |
| --dp-color-ground | #020303 |
| --dp-color-accent | #38ff8e |
| --dp-color-interference | #ff65d8 |
| --dp-color-registration | #65f8ff |
| --dp-color-ink | #f8fffa |
| --dp-color-ink-body | #d3dbd5 |
| --dp-color-ink-muted | #c2cbc5 |
| --dp-color-plate | #090e0b |
| --dp-color-line | #304c3b |
| --dp-color-control-line | #659579 |
| --dp-typography-display | "Cyberpunk Plex Sans", sans-serif |
| --dp-typography-mono | "Cyberpunk Plex Mono", monospace |
| --dp-typography-small | 14px |
| --dp-typography-label | 12px |
| --dp-typography-metadata | 11px |
| --dp-spacing-gutter | clamp(22px, 4.5cqi, 72px) |
| --dp-spacing-column-gap | 50px |
| --dp-radius-control | 0 |
| --dp-border-hairline | 1px |
| --dp-motion-interaction | 0s |
</design-system>
</prompt>

newsprint:
<prompt>
<task>
Apply this visual style to the user's existing project. Inspect and preserve its stack, copy, routes, and behavior. Follow existing component and styling conventions. Treat framework, library, and page examples in these design instructions as illustrations; they do not require a stack change or new sections. Scope changes to the user's requested work.

Keep controls keyboard accessible, focus visible, and text legible. Preserve reading order, responsive behavior, and reduced-motion preferences. Verify actual states at the rendered width. The user's stack and content take precedence over illustrative implementation details.
</task>

<design-system>
# Newsprint

## Identity

Build a continuous newspaper sheet on warm paper with black serif type, ruled columns, and small red marks. The page has a large masthead, tightly set headlines, readable editorial paragraphs, and strong differences between the lead story and supporting material.

## Layout

Use a shared column grid with thin vertical dividers and heavier horizontal section rules. Open beneath the masthead with a broad headline and a narrow action or summary column, roughly a 3:1 split at wide widths. A compact factual strip can follow when the customer supplies facts.

Let adjacent content share a spread. A narrow column of short entries can sit beside a larger editorial story, with smaller stories beneath it. Continue the same divisions into steps and supporting lists. Comparisons work as horizontal listings with identity, terms, and details in separate columns. A final spread can place questions beside a closing invitation before the directory footer.

Choose sections from the brief, keeping the continuous sheet and unequal editorial hierarchy. Do not turn every article or feature into a detached card. Dates, bylines, section numbers, and a drop cap are available devices for real editorial content, not mandatory decoration.

## Typography

Use Source Serif 4 for the masthead, headlines, labels, and controls, bound to "Newsprint Display". Use EB Garamond for reading and italic quotations, bound to "Newsprint Reading". The masthead can be very large and heavy, with tight tracking; the lead headline uses a similarly heavy face at a smaller scale. Keep ordinary paragraphs near the body size token, with enough line-height for sustained reading. Use small uppercase labels and bylines sparingly. Let headline size and column width establish story priority.

## Color and surfaces

Ground is warm off-white paper. Ink is near-black; secondary supplies supporting text, and rule supplies quiet divisions. Accent is a restrained red for section markers, editorial emphasis, or a featured label. Keep the page flat and square. Use the hairline for local divisions and the heavier section rule for major boundaries. The paper color is sufficient; do not cover it with decorative grain.

## Components

Use square, clearly labeled actions with a thin black border. Hover and selection invert foreground and background immediately. Focus uses a solid offset outline. A comparison listing can have a red featured label, independent of the currently selected control.

Use native disclosures as ruled question rows, with a clear plus/minus and the answer beneath. Quotes can be italic serif passages with compact uppercase attribution. Keep the content in document flow and the columns aligned, including when text lengths vary.

## Images

Treat editorial images in grayscale. A lead image may retain its full proportions beside a headline and summary; secondary images can use wide crops above their captions. Keep important subjects intact. Use dates and bylines only when supplied, and reserve image space before loading. The layout works without portraits or a photographic hero.

## Motion

Keep everything still. Hover, selection, and disclosure changes are immediate, following the transition token. Do not animate headlines, simulate printing, or add a scrolling ticker merely to suggest news.

## Responsive behavior

At 1100px, narrow the lead split and reduce supporting grids while retaining the newspaper divisions. At 700px, stack the broad spreads, place actions beneath the opening content, and turn supporting facts into compact rows. Keep important headlines large enough to lead. Comparisons can retain identity and terms side by side with details below; footer groups become two columns. Replace vertical dividers with horizontal rules when their columns stack.

## Design limits

Keep the serif hierarchy, warm paper, rules, and small red emphasis. Avoid rounded cards, shadows, large colored bands, decorative aging, and invented reporting. A newspaper form does not require fabricated dates, bylines, publication claims, or extra articles.

## Authoritative tokens

| CSS variable | Value |
| --- | --- |
| --dp-color-ground | #f3efe5 |
| --dp-color-ink | #191916 |
| --dp-color-secondary | #494843 |
| --dp-color-rule | #9b978e |
| --dp-color-accent | #a3231d |
| --dp-typography-display | "Newsprint Display", Georgia, serif |
| --dp-typography-reading | "Newsprint Reading", Georgia, serif |
| --dp-typography-body | 20px |
| --dp-typography-reading-compact | 19px |
| --dp-typography-label | 12px |
| --dp-typography-control | 15px |
| --dp-typography-label-weight | 650 |
| --dp-typography-display-weight | 900 |
| --dp-typography-body-leading | 1.3 |
| --dp-typography-control-leading | 1.2 |
| --dp-typography-label-tracking | 0.09em |
| --dp-spacing-column | 24px |
| --dp-spacing-story | 22px |
| --dp-radius-control | 0 |
| --dp-border-hairline | 1px |
| --dp-border-section | 4px |
| --dp-border-focus | 2px |
| --dp-motion-transition | none |
</design-system>
</prompt>

luxury:
<prompt>
<task>
Apply this visual style to the user's existing project. Inspect and preserve its stack, copy, routes, and behavior. Follow existing component and styling conventions. Treat framework, library, and page examples in these design instructions as illustrations; they do not require a stack change or new sections. Scope changes to the user's requested work.

Keep controls keyboard accessible, focus visible, and text legible. Preserve reading order, responsive behavior, and reduced-motion preferences. Verify actual states at the rendered width. The user's stack and content take precedence over illustrative implementation details.
</task>

<design-system>
# Luxury

## Identity

Build an architectural page with EB Garamond statements, Instrument Sans reading text, warm alabaster, pale taupe, and charcoal fields. A fine gold spine and small roman numerals organize the main sections. Large photographs, unequal column widths, and open space give the page its scale. Gold stays in fine marks and text details.

## Layout

Use a twelve-column grid with the pad and gap tokens. Reserve the first two columns as a margin, with a vertical gold rule at their far edge. Begin most reading content in column three. Place small roman numerals in the margin to mark the sections that need them; keep the numbering consistent with the actual page. At wide widths they may stay near the top of the viewport while their section passes.

Let major titles span across the margin. In the opening, place a large serif title above a body column and a narrower portrait image on the right. The image crosses into the next pale taupe field. A wide-layout starting point is body in columns three through seven and image in nine through twelve. Keep the overlap clear of text and actions. The next field can hold concise supporting facts from the brief.

Continue the shared grid through different arrangements. Available patterns include a broad statement above two reading columns; a section heading beside ruled rows; one large editorial image beside smaller stacked entries; a large framed image beside a list; and staggered quotations on charcoal. Use the patterns your content needs. Shared alignments and a recurring spine connect them without boxing every section separately.

Use the tonal sequence to mark changes of pace: alabaster for extended reading, taupe for a compact supporting passage, and charcoal for a major emphasis. A charcoal field can continue into one emphasized comparison column below it. Keep this continuity when adjacent content supports it, rather than forcing a particular business section to occupy it.

For a long page, finish with a charcoal field containing a large title on the left, a narrow vertical image near the center, and supporting copy with actions on the right. Repeat a detail from an earlier image to connect the opening and close. End the gold spine before this field. Continue the charcoal ground into the footer, separated by a fine gold rule. Adapt the page length and section order to the brief.

## Typography

Use EB Garamond for display, headings, large numerical values, prices, roman numerals, and italic quotations. Use Instrument Sans for paragraphs, navigation, metadata, and controls. The token aliases "Luxury Garamond" and "Luxury Sans" refer to these two fonts; load the named fonts and bind those aliases.

Keep major serif statements at regular weight, with tight tracking and line-height near one. The opening title scales from 3rem to 7.75rem with container width, uses 0.96 leading, and has a measure near 8.6em. Italicize a selected word when the wording earns emphasis. Smaller item titles can use medium weight. Use oldstyle proportional figures in serif number roles.

Use the body and leading tokens for sustained reading, with slightly larger introductory copy. Keep most paragraphs within roughly 28 to 40em. Small navigation, metadata, and action labels use uppercase Instrument Sans with the label tracking token. Preserve their distinction from both serif statements and ordinary sentence-case prose.

## Color and surfaces

Use `ground` for the alabaster page, `ink` for charcoal text, and `ink-2` for supporting text on pale surfaces. `ground-2` and `panel` share the taupe tone for secondary fields. Use `field` for charcoal areas, `on-field` for their main text, and `on-field-2` for supporting text. `field-deep` supplies the slightly lighter charcoal control response. Match `rule`, `panel-line`, and `field-line` to their pale, taupe, and charcoal backgrounds.

Use `accent` for gold rules and fine edges. Use the darker `accent-text` for small gold text on pale backgrounds and `accent-light` for gold text on charcoal. Keep those text roles distinct from the decorative gold. Borders and changes of background create separation; corners remain square. Give a selected image a thin gold frame with a small inset when the frame helps distinguish it from unframed editorial images.

## Components

Use rectangular buttons at least 3rem high, with tracked uppercase sans labels. Primary buttons are charcoal on pale ground and alabaster on charcoal. Secondary actions can be text links with a fine gold underline. Hover adjusts fill or border color; pressing a button moves it down by 1px. Focus uses a visible solid outline with an offset on every field.

For a list of capabilities or services, a ruled row can combine a small number, a serif title, and a separate explanation. For comparisons, use aligned open columns and a charcoal featured column. Preserve the featured column when selection changes; indicate selection separately through the control's fill and the column's top rule. Use real control semantics and announce a selection change without moving focus or scroll when the action requires feedback.

Use native disclosures for expandable answers, with serif summaries, fine dividers, and a gold plus/minus. A nearby section heading can remain sticky on a wide layout. Use square portraits for named people when available, keeping the same portrait if a person appears in more than one role. Include these components only when the brief needs them.

## Images

Use photographs with readable material, light, and depth. Give a lead image more space than supporting images; keep article and object photographs at their natural proportions where the composition allows it. A portrait crop suits the opening image. Preserve the important subject in every crop, and reserve dimensions before loading.

The narrow closing image repeats a recognizable detail from an earlier photograph. Choose and position that crop for the actual image; a doorway is one suitable subject, not a required business theme. Give a decorative repeat empty alternative text. Describe informative images by their content. Keep natural image color; the interface palette does not require grayscale photography.

## Motion

Use the interaction token for brief color and border changes. One optional reveal belongs to the closing field at widths above 720px: open the charcoal field horizontally from a narrow central strip over 900ms with the door easing token. Its title and supporting copy fade in and rise 20px using the content duration and delay tokens.

Keep the entire closing field visible by default. Arm the reveal only after the first user scroll if the closing image is still below view and reduced motion is off; play it once as the field enters. Leave it open on narrow layouts, without script, or with reduced motion. Remove button press movement and control transitions under reduced motion. Do not add other entrance sequences or moving photographs.

## Responsive behavior

Respond to the containing block. From 721px to 1100px, use the mid-width padding and compact gap tokens. Keep the grid and spine, but move section headings above their lists, stop sticky headings, and let paired prose span the content area. Reduce the hero image overlap while retaining it.

At 720px and below, move the gold spine to the left edge and place each numeral near the start of its section. Stack content in reading order with room between the spine and the text. Keep the opening image below the introductory copy and overlapping the following taupe field. Ruled list rows keep a small number beside the title, with the description below the title. Stack steps, quotations, and comparison options. Keep the featured option charcoal.

Stack the closing title, narrow image, and actions, leaving the field fully visible. Footer groups can use two columns. Let navigation and actions wrap, and keep all required information and controls available.

## Design limits

Keep gold to rules, labels, and small details; do not fill large areas with it. Avoid gradients, glows, drop shadows, rounded card grids, decorative seals, and repeated animation. Preserve the grid, type roles, image relationships, and tonal rhythm without copying a sample business, its claims, section count, prices, or endorsements.

## Authoritative tokens

| CSS variable | Value |
| --- | --- |
| --dp-color-ground | #f3eee4 |
| --dp-color-ground-2 | #e4dbcc |
| --dp-color-ink | #262321 |
| --dp-color-ink-2 | #5f5750 |
| --dp-color-field | #262321 |
| --dp-color-field-deep | #302c29 |
| --dp-color-field-line | #46403a |
| --dp-color-on-field | #f3eee4 |
| --dp-color-on-field-2 | #c6bdb0 |
| --dp-color-panel | #e4dbcc |
| --dp-color-panel-line | #c6b89f |
| --dp-color-accent | #b69355 |
| --dp-color-accent-text | #76591f |
| --dp-color-accent-light | #d2b071 |
| --dp-color-rule | #d5cab8 |
| --dp-typography-serif | "Luxury Garamond" |
| --dp-typography-sans | "Luxury Sans", "Helvetica Neue", Arial, sans-serif |
| --dp-typography-body | 1rem |
| --dp-typography-leading | 1.55 |
| --dp-typography-serif-fallback | Georgia, "Times New Roman", serif |
| --dp-typography-label | 0.75rem |
| --dp-typography-label-tracking | 0.16em |
| --dp-typography-reading-small | 0.9375rem |
| --dp-typography-caption | 0.875rem |
| --dp-typography-attribution | 0.8125rem |
| --dp-typography-item-title | 1.375rem |
| --dp-typography-item-leading | 1.15 |
| --dp-typography-item-tracking | -0.01em |
| --dp-spacing-pad | 3rem |
| --dp-spacing-gap | 1.5rem |
| --dp-spacing-pad-mid | 2rem |
| --dp-spacing-pad-narrow | 1.25rem |
| --dp-spacing-gap-compact | 1rem |
| --dp-spacing-section-block | 6rem |
| --dp-spacing-section-roomy | 7rem |
| --dp-radius-control | 0 |
| --dp-border-focus-width | 2px |
| --dp-border-hairline | 1px |
| --dp-motion-interaction | 150ms |
| --dp-motion-door-content | 600ms |
| --dp-motion-door-delay | 450ms |
| --dp-motion-door-easing | cubic-bezier(0.2, 0.7, 0.2, 1) |
</design-system>
</prompt>

modern dark:
<prompt>
<task>
Apply this visual style to the user's existing project. Inspect and preserve its stack, copy, routes, and behavior. Follow existing component and styling conventions. Treat framework, library, and page examples in these design instructions as illustrations; they do not require a stack change or new sections. Scope changes to the user's requested work.

Keep controls keyboard accessible, focus visible, and text legible. Preserve reading order, responsive behavior, and reduced-motion preferences. Verify actual states at the rendered width. The user's stack and content take precedence over illustrative implementation details.
</task>

<design-system>
# Modern Dark

## Identity

Use a near-black page, quiet grey reading text, and bright white statements. Broad pools of white light reveal a small number of opaque graphite objects. Keep the typography regular and precise. A tiny mint signal can identify a live or selected state; it is not a general accent color.

## Layout

Work on a twelve-column grid with a shared maximum width and generous gutters. Let a large opening statement occupy most of the left side while a narrower product object sits to the right, partially sharing its space. Keep the object clear of readable copy. A ruled row of facts can anchor the bottom of this opening when the brief supplies useful facts.

Carry the same column edges through the page. Available arrangements include an unequal open feature grid, one large editorial image beside two smaller image-and-text rows, and alternating pairs of explanatory text and framed product views. Give section headings more space than the compact information beneath them. A large closing statement can share its field with a cropped graphite object and a softer pool of white light. Use a ruled footer with clearly grouped links.

Use only the sections and interface views the customer needs. The decorative chart, bars, and nodes are examples of a product object, not required application features or data.

## Typography

Use Geist for display and reading, and Geist Mono for labels, dates, numerical values, and short notes. The aliases "Modern Dark Grotesk" and "Modern Dark Mono" refer to those faces. Keep large type at regular weight with tight tracking: the opening display scales from 44px to 104px with leading near one. Section titles are smaller, while body copy stays relaxed. Distinguish leading phrases with bright text and supporting phrases with a readable grey; do not fade essential information into the background.

## Color and surfaces

The ground token is the darkest field. Panel and hairline roles separate opaque surfaces without bright outlines. Use bright for titles and primary actions, read for paragraphs, and meta for small supporting text. Restrict live to small status marks with an accompanying label or state.

White light may fall across the hero and closing object through soft radial gradients. Product objects can have subtle grey material gradients. Keep ordinary reading areas flat. Use the small panel radius for imagery and frames, and the pill radius for buttons; these serve different roles.

## Components

Use compact pill buttons with a white filled primary action and a dark outlined secondary action. Hover changes fill or border; focus remains a visible offset outline. Frame product views as opaque graphite panels. Keep functional interface content truthful and legible.

When comparisons are needed, use aligned columns with a quiet filled featured column. Show selection separately with a labeled control and a small signal. Disclosures use a numbered gutter, question, and plus/minus within ruled rows. These are available patterns, not required sections.

## Images

Use grayscale editorial photography with restrained contrast and slightly darkened image fields. A lead image can use a tall 4:5 crop, with square supporting images beside summaries. Small round grayscale portraits can identify real people. Preserve recognizable subjects and reserve image dimensions. Product screenshots should communicate the customer's actual product rather than reproduce abstract sample charts.

## Motion

Use the duration and easing tokens for brief control color changes. The white lighting is static. Do not add pointer-following light, staged entrances, floating panels, or animated decorative charts.

## Responsive behavior

Respond to the containing block. At 1180px, reduce gutters and give the opening copy the full grid width. Around 900px, simplify multi-column arrangements, use two-column facts and short-entry grids, and stack comparison options. At 560px, use the narrow gutter, single-column entries and quotations, and images above their text with wider crops. Scale decorative objects without covering copy. Keep the complete footer and all actions available.

## Design limits

Keep large areas neutral and opaque. Avoid colored glows, translucent glass, heavy display weights, and decorative motion. Do not invent metrics, testimonials, application states, or extra sections to fill the available patterns.

## Authoritative tokens

| CSS variable | Value |
| --- | --- |
| --dp-color-ground | #050505 |
| --dp-color-panel | #0e0e0e |
| --dp-color-hairline | #222222 |
| --dp-color-hairline-2 | #303030 |
| --dp-color-bright | #f2f2f2 |
| --dp-color-read | #a6a9ad |
| --dp-color-meta | #8a8d91 |
| --dp-color-live | #3fd6c6 |
| --dp-color-inverse-ink | #0a0a0a |
| --dp-color-dim | #96999d |
| --dp-typography-face | "Modern Dark Grotesk", "Helvetica Neue", Arial, sans-serif |
| --dp-typography-mono | "Modern Dark Mono", "SFMono-Regular", Menlo, monospace |
| --dp-spacing-gutter | 48px |
| --dp-spacing-gap | 24px |
| --dp-spacing-max | 1360px |
| --dp-radius-panel | 6px |
| --dp-radius-pill | 999px |
| --dp-border-hairline | 1px |
| --dp-motion-duration | 120ms |
| --dp-motion-ease | ease-out |
</design-system>
</prompt>

modern light:
<prompt>
<task>
Apply this visual style to the user's existing project. Inspect and preserve its stack, copy, routes, and behavior. Follow existing component and styling conventions. Treat framework, library, and page examples in these design instructions as illustrations; they do not require a stack change or new sections. Scope changes to the user's requested work.

Keep controls keyboard accessible, focus visible, and text legible. Preserve reading order, responsive behavior, and reduced-motion preferences. Verify actual states at the rendered width. The user's stack and content take precedence over illustrative implementation details.
</task>

<design-system>
# Software

## Identity

Build an open light page with dark, tightly set sans-serif headings and a clear electric-blue action color. Pair broad reading areas with compact product diagrams, rounded white cards, and two substantial dark passages. Keep the page practical and easy to scan.

## Layout

Open with a wide text column beside a smaller product illustration. The wide layout uses roughly a 1.45:1 split. Place supporting facts in a ruled strip below when the brief provides them. Align subsequent sections to the same content width.

Let short explanations and editorial cards share a pale-grey field. A process and its supporting benefits can share one continuous dark field. Later, a pale comparison and disclosure area can lead into a dark closing and footer. Use background continuity to connect related content, adapting this sequence to the real page.

Available patterns include a three-column feature grid, equal editorial cards, numbered process steps linked across a row, and a heading beside a two-column list. Use these where the content fits. A hero diagram can show several inputs converging on a central product; use actual concepts from the brief rather than invented product screens.

## Typography

Use Host Grotesk for display, headings, quotations, and large figures. Use Instrument Sans for paragraphs, labels, and controls. Load those fonts directly; the typography fallback token alone does not select them. Keep display type bold with tight tracking and compact line-height, while reading text uses the body size and relaxed leading tokens. Give introductory text a wider measure than card descriptions. Keep labels and metadata smaller without reducing their contrast.

## Color and surfaces

Use ground for the near-white page, ground-muted for shared pale fields, and panel for white cards. Ink and ink-secondary carry primary and supporting text. Accent is the electric blue used for actions, small icons, and selected states. Dark fields use field with on-field and on-field-secondary text.

Cards have the panel radius, fine borders, and soft downward shadows. Product diagrams may use a blue center with a slight material gradient, light orbit lines, and small white tiles. Keep this dimensional treatment local; broad reading fields remain quiet.

## Components

Use blue primary buttons and pale outlined secondary buttons. Buttons have a modest corner radius, readable sans labels, and enough padding for touch. Hover lifts them slightly and changes fill; pressing returns them to their resting position. Preserve a visible focus outline.

Comparison cards can share aligned prices and feature lists. A featured card keeps its border and badge when a different option is selected; the chosen control gets the blue fill and explicit selected semantics. For questions, use native disclosures with ruled rows and a plus that rotates when opened. Include these only when the brief requires them.

## Images

Use grayscale editorial photographs in wide crops at the top of white cards, with text beneath. Reserve dimensions and keep the important subject visible. The product illustration can retain blue accents and soft depth. Avoid substituting generic photography for a useful explanation of the customer's product. Portraits are optional; text attributions work within this layout.

## Motion

Use the interaction and easing tokens for brief hover responses. Keep the hero diagram and its connecting lines still. Honor reduced motion by removing transitions and press movement. Do not add a page entrance sequence or continuous decorative animation.

## Responsive behavior

At widths around 1050px, tighten gaps while preserving the column relationships. At 760px and below, stack the hero, prose pairs, editorial cards, process steps, quotations, plans, and disclosure layout. Facts can stay in two columns, as can short feature entries. At 480px, make feature and benefit lists single-column and footer groups two-column. Keep the diagram beneath the opening copy, sized within the container, and preserve every action.

## Design limits

Keep blue attached to meaningful emphasis. Avoid turning every section into a card, adding unrelated accent colors, or filling empty space with fabricated statistics and endorsements. Choose sections from the customer's brief and retain the existing stack, routes, and behavior.

## Authoritative tokens

| CSS variable | Value |
| --- | --- |
| --dp-color-ground | #fcfcfd |
| --dp-color-ink | #16191f |
| --dp-color-ink-secondary | #454c58 |
| --dp-color-ground-muted | #f3f4f6 |
| --dp-color-rule | #dde0e6 |
| --dp-color-accent | #074ce0 |
| --dp-color-field | #16191f |
| --dp-color-on-field | #fcfcfd |
| --dp-color-on-field-secondary | #d0d4dd |
| --dp-color-panel | #ffffff |
| --dp-color-on-accent | #ffffff |
| --dp-typography-fallback | sans-serif |
| --dp-typography-body | 16px |
| --dp-typography-interface | 15px |
| --dp-typography-small | 14px |
| --dp-typography-metadata | 13px |
| --dp-typography-label | 12px |
| --dp-typography-body-leading | 1.6 |
| --dp-spacing-grid-gap | 24px |
| --dp-radius-panel | 12px |
| --dp-border-hairline | 1px |
| --dp-motion-interaction | 160ms |
| --dp-motion-easing | ease-out |
</design-system>
</prompt>

monochrome:
<prompt>
<task>
Apply this visual style to the user's existing project. Inspect and preserve its stack, copy, routes, and behavior. Follow existing component and styling conventions. Treat framework, library, and page examples in these design instructions as illustrations; they do not require a stack change or new sections. Scope changes to the user's requested work.

Keep controls keyboard accessible, focus visible, and text legible. Preserve reading order, responsive behavior, and reduced-motion preferences. Verify actual states at the rendered width. The user's stack and content take precedence over illustrative implementation details.
</task>

<design-system>
# Monochrome

## Identity

Build a white page with black serif statements, a narrow heading rail, and a continuous ruled spine. Let the contrast between large type, small metadata, open space, and black fields carry the hierarchy. Keep the page flat, square, and still.

## Layout

Use full-width sections on a shared alignment. At wide widths, reserve roughly a fifth of the container for section headings and supporting notes. A thin vertical rule separates this rail from the larger content column. Align the rule through adjoining sections; use horizontal rules to mark their boundaries. Leave the rail empty when a broad statement needs the full content column.

Open with a large, left-aligned title. Set its description and actions below, offset to the content column; short supporting information can occupy the rail beside them. Keep the title's measure short enough for deliberate line breaks. On a long page, echo this arrangement at the close, with a heavier rule above it. Align the footer to the same rail and divide its links into labeled groups.

Within the content column, choose arrangements that fit the supplied content: open ruled grids for short entries, numbered rows for a sequence, image-and-caption groups for articles or projects, or an inverted comparison area. Keep those as available patterns. The brief determines the sections, their order, and the number of entries.

Use the spacing tokens for gutters, the rail, column gaps, and section padding. Vary section padding with content density while keeping the spine and shared edges aligned. Container-relative values measure the page's containing block.

## Typography

Use EB Garamond for titles, headings, large numbers, and italic quotations. Use Source Serif 4 for reading text and controls, and IBM Plex Mono for dates, metadata, and short notes. The token aliases "Monochrome Display", "Monochrome Text", and "Monochrome Mono" refer to these three fonts respectively; load the named fonts and bind those aliases.

Set display type at medium weight with tight tracking and leading near one. The opening title scales from 52px to 150px with container width and has a measure near 9.2em; section headings are much smaller. Keep paragraphs at a comfortable reading measure, usually 30 to 38em. Use small capitals with open tracking for navigation and buttons. Use upright monospace for supporting facts, and italic serif for quotations. The body-size token serves compact section prose; the page's base reading size is 17px. Preserve the size contrast when content changes.

## Color and surfaces

Use `ink` and `paper` for pure black and white. `secondary` is supporting text on white. `quiet` is a subtle rule on white and secondary text on black; `quiet-inverted` is a subtle rule on black. Give primary text and essential controls the stronger black/white pairing.

Use black fields with white type to emphasize selected parts of the page. A white featured item can interrupt a black comparison field. Keep the surrounding grid and rail aligned through the inversion. Use thin rules for divisions and heavy rules for a major closing boundary. All surfaces remain flat and untextured.

## Components

Buttons are square rectangles with a thin border, small-cap serif labels, generous horizontal padding, and a minimum height of 52px. A primary action is filled; a secondary action is outlined. Hover swaps foreground and background immediately. Links use underlines or a visible rule change. Focus uses a solid outline in the current field's ink color, so it remains visible on both white and black.

For comparisons, separate options with rules. A featured option may extend above and below the surrounding row as a white plate within a black field. Keep this editorial emphasis independent of the user's current selection. If selection is part of the brief, show the selected state on the control and expose it to assistive technology.

Use native disclosures when expandable answers are needed: a serif question, a plus that becomes a minus, and a quiet divider between rows. Quotations may use small square grayscale portraits beside their attribution. Neither comparisons, disclosures, nor quotations require a section when the brief has no such content.

## Images

Treat editorial images and portraits in grayscale, with a slight contrast increase. Use recognizable subjects and reserve image dimensions before loading. Image groups use square crops on wide layouts; narrow layouts can use a 4:3 crop above their captions and text. Keep dates and attribution in a small ruled caption row. Use portraits only for people the content actually identifies. The page does not need a hero photograph.

## Motion

Keep the composition still. Hover, selection, and disclosure state changes are immediate. Do not add entrances, parallax, animated counters, or decorative movement.

## Responsive behavior

Respond to the containing block. From 681px to 1040px, reduce short-entry grids to two columns, place image groups in rows with the image beside the text, and stack comparison options. Retain the heading rail at this width.

At 680px and below, move each section heading above its content and remove the vertical spine. Keep horizontal rules and the large-to-small type contrast. Stack the hero description before its supporting note, collapse short-entry grids to one column, and place each editorial image above its text. Small fact groups and footer link groups can remain in two columns. Let a featured comparison plate span the content width, with its action below the details. Preserve reading order and every required action.

## Design limits

Keep color out of the interface and imagery. Do not add gradients, glows, shadows, rounded cards, decorative texture, or a sans-serif display face. Do not turn the heading rail into an extra navigation system or fill it with invented section numbers. Use the customer's real content, routes, and behavior; a layout pattern does not require sample statistics, plans, endorsements, or articles.

## Authoritative tokens

| CSS variable | Value |
| --- | --- |
| --dp-color-ink | #000 |
| --dp-color-paper | #fff |
| --dp-color-secondary | #4d4d4d |
| --dp-color-quiet | #cfcfcf |
| --dp-color-quiet-inverted | #3d3d3d |
| --dp-typography-display | "Monochrome Display", "EB Garamond", Garamond, Georgia, serif |
| --dp-typography-text | "Monochrome Text", "Iowan Old Style", Georgia, serif |
| --dp-typography-mono | "Monochrome Mono", "Courier New", monospace |
| --dp-typography-body-size | 16px |
| --dp-typography-small-size | 12.5px |
| --dp-typography-label-tracking | 0.12em |
| --dp-typography-display-leading | 1 |
| --dp-typography-body-leading | 1.55 |
| --dp-typography-display-weight | 500 |
| --dp-typography-label-weight | 500 |
| --dp-spacing-gutter | clamp(20px, 4.4cqw, 64px) |
| --dp-spacing-rail | 22cqw |
| --dp-spacing-column-gap | clamp(24px, 3.4cqw, 48px) |
| --dp-spacing-band-small | clamp(40px, 5cqw, 72px) |
| --dp-spacing-band-medium | clamp(56px, 6.5cqw, 96px) |
| --dp-spacing-band-large | clamp(72px, 8.5cqw, 128px) |
| --dp-radius-square | 0 |
| --dp-border-rule-thin | 1px |
| --dp-border-rule-heavy | 3px |
| --dp-motion-transition | none |
</design-system>
</prompt>

botanical:
<prompt>
<task>
Apply this visual style to the user's existing project. Inspect and preserve its stack, copy, routes, and behavior. Follow existing component and styling conventions. Treat framework, library, and page examples in these design instructions as illustrations; they do not require a stack change or new sections. Scope changes to the user's requested work.

Keep controls keyboard accessible, focus visible, and text legible. Preserve reading order, responsive behavior, and reduced-motion preferences. Verify actual states at the rendered width. The user's stack and content take precedence over illustrative implementation details.
</task>

<design-system>
# Botanical

## Identity

Use cream paper, forest-green text, expressive Garamond, and softly bounded garden-like spaces. Arched photographs, fine botanical sprigs, sage panels, and clay accents connect the page. A light paper grain can cross the composition without reducing text clarity.

## Layout

Open with large serif copy on the left and a tall arched photograph on the right. A small circular object image can overlap the main photograph near its base, with a fine arch line and a sparse sprig around it. Keep the text and actions clear of the imagery.

Group related explanations inside a rounded sage panel. Let a numbered process and its benefits share a continuous forest-green field with cream text. Editorial images can form an uneven row with different widths, vertical offsets, and arch, rectangle, and circle crops. Use open quotations on cream, and broad comparison rows inside a pale clay field when needed.

For the close, use a forest-green area with a broad curved top, a centered serif invitation, and the footer on the same ground. Let the content determine which of these patterns appears. The page does not require a plant shop, product collection, testimonials, or pricing.

## Typography

Use EB Garamond regular and italic for statements, headings, and quotations, bound to "Botanical Garamond". Use Instrument Sans for paragraphs, metadata, and controls, bound to "Botanical Instrument". Main headings are large, regular-weight, tightly tracked, and close-set; the wide opening scales from 78px to 142px. A selected italic word or line can take the clay accent. Keep reading text smaller with relaxed leading, and use tracked uppercase sans labels sparingly.

## Color and surfaces

Ground is cream and ink is forest green. Panel is sage; warm-field is pale clay, and accent is the darker terracotta used for small emphasis. Rule and ornament-line supply quiet paper and botanical edges; field-line divides content on green. Use cream text on forest fields with enough contrast for supporting copy.

Large panels have broad rounded corners, while the closing uses a curved silhouette. Photos can be arched or circular, but controls remain easy to recognize. Keep grain faint and sprigs thin. Do not cover the page with leaf patterns or heavy shadow.

## Components

Use soft rounded primary actions with forest or sage treatment, paired with quieter underlined text actions. Hover changes color and lifts a button slightly; focus must remain visible. Feature entries use small line drawings beside concise explanations.

Comparison rows separate identity, feature list, and action. A selected row can become cream with a forest outline and pressed control, while a featured label stays independent. Native disclosures use ruled rows and plus/minus marks. Use genuine labels and states; the visual treatment does not require these components on every page.

## Images

Use natural-color photographs with visible materials, objects, or places. Preserve recognizable subjects in arches and circles. Let the image group vary in size and vertical position rather than forcing identical cards. An object portrait can retain more surrounding space than a scene crop. Reserve dimensions, supply meaningful alternative text, and keep decorative sprigs hidden from assistive technology.

## Motion

Use the interaction token for button color and lift. Editorial images can enlarge very slightly on hover within their fixed crop. Keep sprigs, grain, and the overall composition still. Remove transitions and transforms for reduced motion; do not animate growth, drifting leaves, or entrances.

## Responsive behavior

At 1120px, tighten splits and move comparison actions below their identity. At 760px, move the hero image below the copy, stack prose and broad sections, and retain the large arched silhouette. Editorial entries can use image-and-text rows; steps become a vertical list. At 480px, stack feature entries, editorial contents, and benefit lists. Keep the sage, clay, and forest fields distinct, with smaller rounded insets and two-column footer groups.

## Design limits

Keep the page grounded in real content and photography. Avoid dense foliage, bright synthetic greens, generic leaf icons on every entry, glass, or exaggerated organic blobs. Botanical ornament supports the layout; it does not require fabricated sustainability or wellness claims.

## Authoritative tokens

| CSS variable | Value |
| --- | --- |
| --dp-color-ground | #f5efdf |
| --dp-color-ink | #1e382c |
| --dp-color-panel | #e0e5d3 |
| --dp-color-warm-field | #e6cbb8 |
| --dp-color-accent | #895440 |
| --dp-color-rule | #d4d0bd |
| --dp-color-ornament-line | #b5baa4 |
| --dp-color-field-line | #697961 |
| --dp-typography-display | "Botanical Garamond", Georgia, serif |
| --dp-typography-reading | "Botanical Instrument", sans-serif |
| --dp-typography-body | 16px |
| --dp-typography-metadata | 13px |
| --dp-typography-label | 12px |
| --dp-typography-compact-leading | 1.5 |
| --dp-typography-label-tracking | 0.12em |
| --dp-spacing-panel-inline | max(30px, 4.2cqw) |
| --dp-radius-panel | 34px |
| --dp-radius-panel-narrow | 27px |
| --dp-radius-round | 50% |
| --dp-border-hairline | 1px |
| --dp-motion-interaction | 0.35s |
| --dp-motion-easing | ease |
</design-system>
</prompt>