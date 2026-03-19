import { renderToStaticMarkup } from "react-dom/server";

import { expect, test } from "vite-plus/test";

import { HomePage } from "./HomePage";

test("renders the semantic UI landing page content", () => {
  const markup = renderToStaticMarkup(<HomePage />);

  expect(markup).toContain("Primitive, Semantic and Component layers");
  expect(markup).toContain("shared/ui/semantic");
  expect(markup).toContain("Figma token-driven workflow");
});
