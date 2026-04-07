# Components

Component code is split by responsibility:

- `src/components/ui/` contains reusable primitives and shadcn-style building blocks.
- `src/components/app/`, `src/components/navigation/`, and `src/components/providers/` contain app shell concerns.
- Feature folders like `src/components/ai-chat`, `src/components/billing`, `src/components/credits`, `src/components/admin`, and `src/components/scenarios` hold domain-specific UI.

## Editing Guidance
- If a component is only used by one feature, keep it inside that feature folder.
- If a pattern becomes broadly reused, promote it into `src/components/ui` or a shared folder with a clear name.
- Favor props and small helpers over deep inheritance or generic component factories.
- Preserve accessibility behavior provided by Radix components when restyling.
