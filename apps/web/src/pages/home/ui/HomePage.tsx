import { ArrowRight, Layers2, Palette, PenTool } from "lucide-react";

import { Button, CalloutCard, Eyebrow, Surface, Tag } from "@/shared/ui";

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <Surface className="overflow-hidden p-6 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,24rem)] lg:items-end">
          <div className="flex max-w-3xl flex-col gap-8">
            <Eyebrow>Feature-Sliced Design + shadcn/ui</Eyebrow>
            <div className="flex flex-col gap-3">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.08em] text-balance text-foreground md:text-7xl">
                Primitive, Semantic and Component layers that stay compatible with Figma.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                `shadcn/ui` is now isolated inside `shared/ui/primitive`, product code consumes
                `semantic` and `component` APIs, and page composition stays in the FSD layers where
                it belongs.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg">
                Explore semantic UI
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button size="lg" tone="ghost">
                Figma token-driven workflow
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Tag>shared/ui/primitive</Tag>
              <Tag>shared/ui/semantic</Tag>
              <Tag>shared/ui/component</Tag>
              <Tag>pages first</Tag>
            </div>
          </div>
          <Surface className="relative p-5 md:p-6">
            <div className="flex flex-col gap-3">
              <Eyebrow>Adoption Rules</Eyebrow>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                  <p className="text-sm font-medium text-foreground">Primitive</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Vendor-backed building blocks and layout primitives.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                  <p className="text-sm font-medium text-foreground">Semantic</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Stable product contracts such as Button, Surface and Tag.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                  <p className="text-sm font-medium text-foreground">Component</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Reusable non-business compositions for pages and widgets.
                  </p>
                </div>
              </div>
            </div>
          </Surface>
        </div>
      </Surface>

      <section className="grid gap-5 lg:grid-cols-3">
        <CalloutCard
          label="Primitive"
          title="shadcn is infrastructure, not the app API"
          description="The generated button lives under shared/ui/primitive/shadcn. Future shadcn additions will land there through components.json aliases."
          action={
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Layers2 className="size-4" />
              Direct imports stay out of pages and features
            </div>
          }
        />
        <CalloutCard
          label="Semantic"
          title="Figma variants map to stable component props"
          description="Design tokens and component properties should align with intent-based props like tone, size and state instead of leaking low-level class combinations."
          action={
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Palette className="size-4" />
              Tokens live in app/styles as the shared theme contract
            </div>
          }
        />
        <CalloutCard
          label="Component"
          title="Page-level composition stays in FSD"
          description="Large sections still belong to pages or widgets until real reuse appears. Shared components remain non-business and broadly composable."
          action={
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <PenTool className="size-4" />
              Figma screens become recipes, not one-shot shared components
            </div>
          }
        />
      </section>
    </main>
  );
}
