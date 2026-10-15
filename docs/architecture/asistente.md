# Referencia técnica: asistente

### Assistant

`src/components/assistant/assistant-widget.tsx` is a draggable operator chat (position persisted in
localStorage; conversations are not). It posts to `src/app/api/assistant/chat/route.ts`, a thin proxy that adds
`getAuthHeaders()` and streams the backend's SSE response straight through — the browser never holds the session
token or any Gemini key. `screen-context.ts` sends only labels from a fixed allowlist of visible UI controls,
never input values or table rows; keep it that way when adding screens.
