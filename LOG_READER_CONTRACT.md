# Log Reader Contract

The dashboard, agent, and TUI exchange raw NGINX log lines with byte offsets. All readers must preserve these rules so local and remote deployments produce the same data.

- Read active `.log` files and numeric rotations such as `access.log.1`. Read gzip archives only during the initial request when `includeCompressed=true`.
- Track offsets for every uncompressed file, including rotations. Gzip files are immutable snapshots and do not receive offsets.
- When a tracked offset is greater than a file's current size, treat the file as truncated or replaced and restart at byte `0`.
- An offset equal to file size returns no entries.
- Emit only newline-terminated records. Retain the offset before an unterminated trailing record so it can be emitted after NGINX finishes writing it.
- Support lines up to 10 MiB in the agent reader.
- Return files and their records in lexical filename order.

Changes to a reader must include regression coverage for the relevant rule in both the Go agent and TypeScript dashboard readers when that rule applies to both implementations.
