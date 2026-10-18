export function checkRecordingDuration(duration: number, expected: number) {
  // Some locally generated WebM recordings omit their duration metadata.
  if (!Number.isFinite(duration)) return "unknown" as const;
  if (duration <= 0 || Math.abs(duration - expected) > 1)
    throw new Error(
      `Clip duration is ${duration.toFixed(2)}s; the session states ${expected}s. Record a new session with the correct duration before annotating. Nothing was attached.`,
    );
  return "matched" as const;
}

export async function prepareLocalVideo(file: File, expectedDuration: number) {
  if (!/^video\//.test(file.type))
    throw new Error("Choose a supported video file.");
  if (file.size > 2_000_000_000)
    throw new Error("Use a clip smaller than 2 GB for this browser pilot.");
  const url = URL.createObjectURL(file);
  const probe = document.createElement("video");
  probe.preload = "metadata";
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          finish(
            new Error(
              "Recording metadata could not be read within 10 seconds. Nothing was attached.",
            ),
          ),
        10_000,
      );
      const finish = (error?: Error) => {
        clearTimeout(timeout);
        probe.onloadedmetadata = probe.onerror = null;
        if (error) reject(error);
        else resolve(probe.duration);
      };
      probe.onloadedmetadata = () => finish();
      probe.onerror = () =>
        finish(
          new Error(
            "This browser cannot play the recording. Try a supported MP4 or WebM codec. Nothing was attached.",
          ),
        );
      probe.src = url;
    });
    return {
      url,
      durationStatus: checkRecordingDuration(duration, expectedDuration),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  } finally {
    probe.removeAttribute("src");
    probe.load();
  }
}
