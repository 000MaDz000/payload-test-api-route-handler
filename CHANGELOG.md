# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-14

### Added

- `createTesterAxios()` — main entry point that creates an in-process Axios test client for Payload CMS
- `createAxiosAdapter()` — lower-level custom Axios adapter for advanced use cases
- `matchEndpoint()` — endpoint resolution across config, collection, and global endpoints
- `matchRoute()` — Express-style `:param` route pattern matching
- `buildPayloadRequest()` — construct a `PayloadRequest` from raw HTTP primitives
- `EndpointNotFoundError` — thrown when no matching endpoint is found
- `HandlerExecutionError` — thrown when a handler throws during execution
- Full authentication support (JWT login, token resolution, `req.user`)
- Database transaction context propagation through hooks
- Request patching via `requestPatcher` option
- Support for built-in Payload CRUD endpoints (create, read, update, delete)
- Comprehensive test suite with 8 integration tests
