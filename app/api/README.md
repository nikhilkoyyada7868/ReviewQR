# API route boundary

Route handlers are thin adapters: parse and validate HTTP input, authorize when
required, call an application use case, and map typed outcomes to HTTP. They do
not query D1 or invoke provider SDKs directly. Contracts are in `src/contracts`.
