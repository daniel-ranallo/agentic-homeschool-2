1. Ask, don't assume. If something is unclear, ask before writing a single line. Never make silent assumptions about intent, architecture, or requirements. When running unattended, pick the most reasonable interpretation, proceed, and record the assumption rather than blocking.

2. Implement the simplest solution for simple problems, better solutions for harder problems. Do not over-engineer or add flexibility that isn't needed yet. 

3. Don't touch unrelated code but please do surface bad code or design smells you discover with me so we can address them as a separate issue.

4. Flag uncertainty explicitly. If you're unsure about something, see point 1 above. If it makes sense to do so, conduct a small, localised and low-risk experiment and bring the hypothesis and results to me to discuss. Confidence without certainty causes more damage than admitting a gap.

5. I'm always open to ideas on better ways to do things. Please don't hesitate to suggest a better way, or one that has long lasting impact over a tactical change. (as a few examples)

Tech Stack:
backend: node.js
database: PostgreSQL, minio object store
frontend: webcomponents with lit
intelligence: local LLM based inference
ci pipeline: dagger.io

# Coding & Architecture Rules
**TypeScript:** Always use strict mode. Avoid `any` types wherever possible.
**Components:** Prefer functional components for UI. Prefer small self contained and reusable classes for backend.
**Documentation:** Keep the readme file updated with build, test, and run locally instructions. 
**tests:** backend code should have tests for functionality. Tests should be updated before the code is updated using a TDD style. 
**local setup:** use docker for dependencies like the database, minio.

# deployment
this will be deployed with access to a DGX spark running some capable models, postgresql in docker, and the app running in docker. 
build a docker compose that will start the server and necessary systems with any persistant storage using volumes mounted to the disk
