.PHONY: test lint typecheck check format conform

test:
	npm test

lint:
	npm run lint

typecheck:
	npm run typecheck

check:
	npm run typecheck && npm run lint && npm test

format:
	npm run format

conform: build
	node ../tests/conformance/run.js

build:
	npm run build
