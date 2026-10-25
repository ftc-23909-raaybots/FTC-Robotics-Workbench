# Robot Workbench V2 Roadmap and Release Status

This is the persistent, workspace-visible V2/V2.1 checklist. Completed items
are verified; external hardware, SDK, and signing dependencies remain
explicitly blocked rather than being reported as finished.

## Completed

- [x] Ship the V1.5 OnBotJava editor foundation: Java editing, Wi-Fi capability
  check, explicit upload confirmation, and on-robot build output.
- [x] Add a V2 Java project workspace that links the project root, preserves
  source paths and packages, and saves selected files without copying the
  project.
- [x] Validate the OnBotJava integration with protocol tests and document that
  its upload/build endpoints are internal FTC SDK handlers, not a stable public
  API.
- [x] Add persistent named robot profiles, keeping telemetry and Program &
  Manage addresses distinct and restoring profiles on app restart. Profile
  creation, active selection, persistence after reload, and profile deletion
  were browser-checked.
- [x] Make robot management the default home and add direct navigation to code,
  telemetry, and simulator workflows while retaining the existing analytics
  sections. Production build, automated tests, navigation, and the desktop home
  layout were verified.
- [x] Add an explicit read-only Program & Manage capability check to the
  management home. It reports the OnBotJava source-tree endpoint status and
  source-file count without uploading files or starting an OpMode. Browser mode
  clearly reports that this check requires the installed desktop app.
- [x] Improve project editing with a collapsible source tree, visible dirty
  file indicators, explicit reload-from-disk confirmation, and conflict-aware
  saves that require confirmation before overwriting external changes. Build,
  tests, and editor change indicators were checked. The linked-folder desktop
  workflow still needs installed-app validation.
- [x] Make the installed app desktop-PC-only with a 1280 × 760 minimum window.
  Phone/tablet support is deferred beyond V2.
- [x] Report OnBotJava build outcomes conservatively: explicit success/failure
  markers are classified, and unrecognized SDK output remains inconclusive.
  Build, failure, and unknown-output cases are covered by tests.
- [x] Improve desktop code-workspace accessibility with semantic list
  navigation, selected-file state, visible keyboard focus, and live upload/build
  status announcements.
- [x] Complete the local deployment workflow safety pass: inspect supported
  remote source paths, recheck overwrite conflicts immediately before upload,
  preserve package destinations, show per-file progress, and classify explicit
  build results. All 19 automated tests pass.

## Blocked on documented FTC APIs

- [x] Add a read-only robot health summary from the existing telemetry API
  heartbeat, current signal snapshot, bounded error-log records, and last-update
  state. The summary provides a direct path to system logs and does not invoke
  undocumented Robot Controller configuration endpoints. Browser validation
  confirmed the summary renders offline and its System Logs action navigates.
- [ ] Add FTC Robot Controller configuration views only after identifying and
  validating documented, read-only APIs for the supported SDK versions. No
  suitable documented API has been established; do not substitute internal
  endpoints or enable configuration writes.

## Blocked on FTC hardware and SDK access

- [x] Add a loopback-only OnBotJava protocol mock to exercise connection,
  source-tree, upload, and build UI flows offline. Its build output is canned;
  it does not compile Java or emulate an FTC SDK.
- [ ] Validate OnBotJava protocol behavior against the latest 10 official FTC
  Robot Controller releases; do not claim universal compatibility based only
  on a mock or live endpoint probe. Hardware-dependent validation is blocked
  until a Robot Controller and target SDKs are available.
  - [ ] v12.0
  - [ ] v11.2.1
  - [ ] v11.2
  - [ ] v11.1
  - [ ] v11.0
  - [ ] v10.3
  - [ ] v10.2
  - [ ] v10.1.1
  - [ ] v10.1
  - [ ] v10.0
- [ ] Test end-to-end upload/build against a physical Control Hub and verify
  no OpMode is started automatically. No Control Hub is available.
- [ ] Verify SDK-specific build-log result markers against real FTC versions;
  current recognition patterns remain provisional.

## Completed V2 implementation and packaging

- [x] Rename the product and desktop package to Robot Workbench, including
  visible app copy, executable, installer, and npm project name. Preserve the
  existing application identifier and user-data directory for installation
  and settings continuity. The previous release installers remain archived
  under their original filenames.
- [x] Add a dedicated Settings page with application-wide theme selection and
  active robot telemetry connection access.
- [x] Implement all 13 theme palettes, typography directions, and surface
  treatments described in `themes.md`; persist the user's choice locally.
- [x] Add a keyboard-accessible theme filter, exposed selected state, and
  responsive theme cards. Browser-checked all themes at 1440px, including
  persisted selection and page-width overflow.
- [x] Bundle the theme font families locally so appearance does not depend on
  external font services or internet access.
- [x] Complete desktop-PC keyboard navigation and live code upload/build
  announcements. The wider screen-reader audit remains unverified.
- [x] Document unsupported SDK/API behavior, provisional build markers,
  simulator limitations, install steps, and unsigned-installer warning.
- [x] Run the production build and automated test suite.
- [x] Set the package version to 2.1.0, create `Robot Workbench.exe` and the
  Windows x64 per-user installer, and verify package metadata and resources.
- [x] Smoke-test a temporary per-user 2.1.0 installation, launch it, and
  uninstall it again. This does not count as FTC hardware validation.
- [ ] Obtain a trusted Windows code-signing certificate and sign the installer.
- [ ] Complete broader keyboard/screen-reader testing in the installed app.
  Code-workspace keyboard semantics and live status announcements are covered,
  but the full accessibility audit is not.

## Notes

- The V2.1.0 Windows installer was install-tested; it is unsigned and not
  certified for FTC hardware compatibility.
- The requested GitHub repository has not been provided yet. Keep the workspace
  changes local until the user shares the repository URL.
- No physical robot is connected for this session, so hardware deployment
  remains unverified.
- The local OnBotJava mock is a protocol/UI test fixture, not an SDK emulator;
  none of the ten listed FTC releases has been certified by it.
- The app is intentionally desktop-PC-only; mobile and tablet layouts are not
  a V2 requirement.
- Full production sign-off depends on access to FTC SDK releases, a physical
  Control Hub, a trusted Windows signing certificate, and manual installed-app
  accessibility checks.
