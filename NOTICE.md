# Notice

## Upstream Open Party Lab notice (preserved)

Open Party Lab is an experimental AI-assisted party-game project. It is not affiliated with Valve, Steam, Hasbro, Mattel, Duden, or any other third-party game, platform, publisher, dictionary, or brand owner.

The public source cut intentionally uses generic public-facing names where possible. Some internal legacy identifiers may remain for compatibility and should be renamed gradually when doing so is low-risk.

### Official Releases

The maintainer may publish official builds of the project in the future, including through Steam or other stores, to reach a larger player base. Community contributions are voluntary and unpaid unless a separate written agreement says otherwise.

### Assets

Before commercial or store distribution, review all art, icons, audio, word lists, generated media, and third-party dependencies. Do not assume that source availability means every asset is cleared for every distribution channel.

### Third-Party Dependencies

Runtime and build dependencies are managed through npm. Their own licenses apply. Review dependency licenses before publishing binaries or store builds.

## LAN Party Hub derivative notice

LAN Party Hub（局域网派对中心）is an independently maintained derivative of [Hartwich/Open-Party-Lab](https://github.com/Hartwich/Open-Party-Lab). It is not an official Open Party Lab release and is not endorsed by the upstream maintainer.

The upstream work remains subject to the Apache License 2.0 and its original notices. Modifications and additions made for LAN Party Hub began in 2026 and are maintained by QianQIUlp under the repository's Apache-2.0 terms. Internal `@open-party-lab/*` package names remain only for compatibility.

Four bundled games originate from Apache-2.0 upstream repositories. Their exact repositories, fixed revisions, retained licenses, and modification scope are recorded in [THIRD_PARTY_SOURCES.md](THIRD_PARTY_SOURCES.md). The bundled `bullshit` game is an original LAN Party Hub implementation and uses no imported card art or media.

Modified upstream files carry an inline LAN Party Hub modification notice where their format permits comments. Comment-free and generated formats are recorded in [config/upstream-modified-files.json](config/upstream-modified-files.json). The project-wide change summary is in [CHANGES.md](CHANGES.md).

Chinese word lists and questions are distributed locally and are not fetched from source websites at runtime. Commercial or store distribution still requires a separate review of art, icons, audio, fonts, word lists, generated media, and third-party dependency licenses.
