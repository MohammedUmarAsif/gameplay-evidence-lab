# Your first personal gameplay pilot

Purpose: check whether this instrument can preserve usable observations and review decisions. It is not a participant study, a population survey, or a test of the proposed predictor.

## Prepare one small observation

Choose a game you can record and use appropriately. Keep other people, chat, account names, voices and identifying overlays out of the clip where possible. Use a private device/browser profile.

Start with one ordinary interaction, such as an attack that completes or is interrupted. Do not start by measuring hidden invulnerability frames, proving a balance claim, or comparing all weapons. Write what counts as completion before viewing the outcome.

Record a short 30–120 second clip using your preferred capture tool. This is a convenient starting range, not an experimentally justified sample size or required duration. Trim it outside the app if necessary. The app accepts browser-supported MP4/WebM/Ogg/QuickTime containers, but actual codec support depends on the browser; MP4/H.264 or WebM is usually practical. No recording is made automatically.

## Record the context

Use **Plan a Wilds pilot** on the workspace to prepare an editable personal protocol draft in **Private local pilot**. This does not save a study or select consent for you; the session game title is prefilled but editable. Alternatively switch modes and define a study yourself. Save a study with your question, intended measures, retention and permitted media use. The template is draft personal-pilot information, not university-approved wording. Keep it unchanged for a session once its information version has been recorded. Create a new protocol if you need a new version.

Create a session. Enter the game version if known; otherwise use `unknown`. Record the configuration, encounter, conditions and exact recording duration in seconds. Use a random player pseudonym, not your real name or account ID. Keep the same pseudonym for your later sessions if they belong to the same player. Use the same source-group ID for sessions from the same recording/episode.

Read and actively select the required adult/information choices. Media reuse and ML processing are separate, optional and initially unchecked. Do not select those permissions unless you intend their stated use. No hosted model is called; the optional Baseline lab fits a small local classifier only on eligible permissioned records. Review your study's permitted processing before using it.

## Annotate and review

Choose the local file on **Annotate evidence**. Its bytes stay on your device; only an opaque reference is retained. Reattach it after a reload.

The app checks readable metadata and finite duration before saving the attachment. If duration differs by more than one second, create a new session with the correct duration. If the container has no finite duration metadata, verify the duration yourself. Always reattach the original clip; file identity is not verified.

Seek with the video controls. Press `[` for start and `]` for end outside form fields, or use the labelled buttons. Describe the action, involved components, visible outcome and source. Use units for any known configuration property. Keep invisible engine state unknown.

Record what you intended and what occurred on **Player feedback**. The 1–5 items may be left unanswered. An optional suggestion is a raw report, not a validated design recommendation.

On **Researcher review**, inspect the clip again. Verify, mark uncertain, or exclude the event. If changing the label, explain why. The original annotation remains visible. For an initial pilot, you can be the reviewer, but this is not independent inter-rater agreement. A later authorised study needs a separately planned second-annotator protocol.

## Inspect and back up

Use **Dataset & exports** to inspect missingness, explicit denominators and warnings. Filter summaries by configuration; the export still includes the whole workspace. Do not interpret two sessions as two independent participants.

Inspect **Human review status**, **Annotation coverage**, and **Feedback response distributions**. Overlapping event intervals count once per session; unanswered ratings remain missing. The ZIP includes reproducible descriptive summaries with definitions and a source dataset checksum. See [summary definitions](DESCRIPTIVE_SUMMARIES.md).

Use one editing tab. If another tab changes the records, export this tab’s snapshot if needed and choose **Reload saved local records** before continuing. An unreadable saved entry can be downloaded privately using **Download raw storage for recovery** before deliberate erasure. This recovery file is not a validated export.

Download JSON and the dataset ZIP to a private folder outside the Git repository. Reimport `dataset.json` to check relationships and the checksum. CSVs are analysis views, not the reimport format. Video files stay separate; preserve your own secure mapping from opaque media IDs to recordings if needed. Do not put that mapping in a public repository.

To test deletion, back up first, then delete a disposable local session. Linked events, feedback, reviews, suggestions and comparisons are removed. Original recordings and exported copies are unaffected. The app has no recycle bin.

## What to note after the pilot

In your private research diary record the time spent, ambiguous labels, missing context, replay problems, export issues and changes needed to the protocol. These are instrument-quality observations. They do not establish model accuracy, a causal mechanic effect or player-population preferences.

For a first concrete success, aim to produce one fully traced record: configuration → session → event interval → raw feedback → reviewed label → validated export. Expand only after that works reliably.

Use **Interaction atlas** to search components and return to the raw evidence. The **Baseline lab** intentionally refuses a one-player pilot as independent train/test evidence. To inspect its engineering workflow now, switch to synthetic mode and load its separate benchmark. Scores on that constructed fixture are not Monster Hunter results. See [baseline methods and local SQL commands](BASELINE_LAB.md).

Central collection is optional and disabled until configured. Do not recruit or submit other people's gameplay merely because the public demo is online.
