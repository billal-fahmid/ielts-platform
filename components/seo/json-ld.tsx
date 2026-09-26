/** Written without a literal unicode escape so tooling can't fold it back into "<". */
const ESCAPED_LT = String.fromCharCode(92) + "u003c";

/** Structured data for search engines. "<" is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, ESCAPED_LT) }} />;
}
