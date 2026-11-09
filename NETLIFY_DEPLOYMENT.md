# Deploy to Netlify

No backend, environment secrets, paid API or database is needed. `netlify.toml` specifies Node 22, `npm run build`, publish directory `dist`, and the SPA fallback.

## GitHub-connected deployment

1. Review the implementation commit locally. Push the current branch to `Arjun123365/pharmasetu-ai` with `git push -u origin HEAD` using an authorised GitHub identity. If it is a feature branch, open a pull request and merge after review. Do not force-push.
2. In Netlify, select **Add new project / Import an existing project**, choose GitHub and authorise access to `Arjun123365/pharmasetu-ai`.
3. Select the branch containing this implementation. Leave base directory empty (repository root). Confirm build command `npm run build`, publish directory `dist`, Node 22. No environment variables are required.
4. Deploy, wait for the build to succeed, and open the assigned HTTPS site URL. You can choose an available site name in Netlify settings.
5. Verify all seven modules, a stock movement followed by reload, reset, CSV download and mobile navigation on the deployed site. Each visitor has their own browser-local dataset.

## Manual static deployment

Run `npm ci --cache .npm-cache` and `npm run build` locally. Upload the generated `dist` directory through Netlify's manual deployment flow. Since navigation uses React state rather than URL routes, the app works without additional routing assets on manual upload. For future URL-based routing, retain the fallback configuration in Git-connected deployment.

## Status and caveats

The production build and local production browser checks are recorded in `NESFIC_PROOF_OF_WORK.md`. This task does not establish a Netlify account connection, deploy the public site, change DNS, or verify a public URL. Review Netlify's current free-plan usage limits before choosing an account. Browser data is specific to each origin: development data does not transfer to the Netlify site. Never enter real patient, distributor or commercial data into this prototype.
