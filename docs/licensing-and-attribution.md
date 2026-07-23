# Licensing and attribution policy

This is an engineering policy for this repository, not legal advice.

## Files that must remain

- Keep the root `LICENSE` as the unmodified Apache License 2.0 text.
- Keep the upstream Open Party Lab notice inside `NOTICE.md`; append derivative notices instead of replacing upstream attribution.
- Keep original copyright, patent, trademark, attribution, and license headers that still relate to distributed code or assets.
- Keep every bundled game's `LICENSE` and its exact source repository and revision in `THIRD_PARTY_SOURCES.md` and `config/known-games.json`.
- Do not present LAN Party Hub as an official or endorsed Open Party Lab release.

## Modifying an upstream-derived file

For a comment-capable file, retain existing notices and add this near the top:

```text
Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
```

Use the file's normal comment syntax. `npm run legal:mark -- --base origin/main` can add the standard notice mechanically to changed files that belong to the recorded Open Party Lab baseline. Files created natively for LAN Party Hub do not need an upstream modification notice.

The exact file set inherited from the original fork is frozen in `config/upstream-derived-files.json`. CI applies the modification-notice rule only to that baseline and to explicitly recorded third-party files; LAN Party Hub-native files are not mislabeled as upstream modifications.

JSON, generated lockfiles, images, and other formats that cannot safely carry comments must be recorded in `config/upstream-modified-files.json` with a reason. Do not add fake JSON keys solely as legal comments.

Update `CHANGES.md` when a release materially changes product behavior, architecture, bundled content, licensing, or attribution. Git history supplements this record but does not replace required distributed license and NOTICE files.

## Adding code, assets, data, or a game

Before adding third-party material, record:

- source URL and exact revision or version;
- license and retained license file;
- whether files were modified;
- asset, font, audio, word-list, model, or dataset rights separately from code rights;
- the modification summary and whether public/commercial redistribution is allowed.

Content without a clear license or contributor-owned provenance must not enter a public release. AI-generated media must have its tool/source and rights assessment documented.

## Contributor and agent checklist

1. Preserve existing license and attribution notices.
2. Add or retain the modification notice on changed upstream-derived files.
3. Update source provenance for imported or upgraded third-party code.
4. Run `npm run legal:check -- --base <target-branch>`.
5. Describe rights-sensitive changes in the pull request.
