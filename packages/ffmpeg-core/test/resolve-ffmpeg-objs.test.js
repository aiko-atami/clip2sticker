import test from "node:test";
import assert from "node:assert/strict";
import { parseFfmpegObjects } from "../scripts/resolve-ffmpeg-objs.mjs";

test("parseFfmpegObjects expands fftools ffmpeg link inputs from Makefile", () => {
  const objects = parseFfmpegObjects([`
OBJS-ffmpeg +=                  \\
    fftools/ffmpeg_dec.o        \\
    fftools/ffmpeg_demux.o      \\
    fftools/ffmpeg_enc.o        \\

define DOFFTOOL
endef
`]);

  assert.deepEqual(objects, [
    "fftools/cmdutils.o",
    "fftools/ffmpeg.o",
    "fftools/opt_common.o",
    "fftools/ffmpeg_dec.o",
    "fftools/ffmpeg_demux.o",
    "fftools/ffmpeg_enc.o",
  ]);
});

test("parseFfmpegObjects resolves nested OBJS references from included makefiles", () => {
  const objects = parseFfmpegObjects([
    `
include $(SRC_PATH)/fftools/resources/Makefile

OBJS-ffmpeg +=                  \\
    fftools/ffmpeg_dec.o        \\
    $(OBJS-resman)              \\
`,
    `
OBJS-resman +=                     \\
    fftools/resources/resman.o     \\
    fftools/resources/graph.html.o \\
    fftools/resources/graph.css.o  \\
`,
  ]);

  assert.deepEqual(objects, [
    "fftools/cmdutils.o",
    "fftools/ffmpeg.o",
    "fftools/opt_common.o",
    "fftools/ffmpeg_dec.o",
    "fftools/resources/resman.o",
    "fftools/resources/graph.html.o",
    "fftools/resources/graph.css.o",
  ]);
});

test("parseFfmpegObjects tolerates missing optional OBJS-ffmpeg-yes", () => {
  const objects = parseFfmpegObjects([
    "OBJS-ffmpeg += fftools/ffmpeg_dec.o\n",
  ]);

  assert.equal(objects.includes("fftools/ffmpeg_dec.o"), true);
});
