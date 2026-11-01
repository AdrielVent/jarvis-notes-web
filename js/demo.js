// DEMO FIXTURE: synthetic notes for presentations. They are marked `demo: true` and can be removed in one step.

import { DEFAULT_SECTION, newId } from "./store.js";

function daysAgo(now, days, hour) {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
}

export function demoNotes(now = new Date()) {
  const base = (fields) => ({
    id: newId(),
    section: DEFAULT_SECTION,
    manualNotes: "",
    tags: [],
    keyPoints: [],
    actionItems: [],
    status: "ready",
    error: null,
    demo: true,
    engine: "Demo fixture (synthetic)",
    ...fields,
    updatedAt: fields.createdAt,
  });

  return [
    base({
      title: "Engineering mixer planning",
      type: "Meeting",
      createdAt: daysAgo(now, 0, 9),
      durationSeconds: 312,
      tags: ["SHPE"],
      summary: "Planned the Tuesday mixer for about 30 people and split the budget into food, merch, and an emergency reserve.",
      keyPoints: [
        "Food takes 60% of the $400 budget, merch 30%, and 10% stays in reserve.",
        "The lounge holds 40, so RSVPs close at 35.",
      ],
      actionItems: [
        { text: "Send the RSVP form to the chapter list by Friday", done: false },
        { text: "Confirm the pizza order two days ahead", done: true },
      ],
      transcript: "So we planned the Tuesday mixer for about 30 people. We split the budget into food, merch, and an emergency reserve. Food takes 60% of the $400 budget, merch 30%, and 10% stays in reserve. The lounge holds 40, so RSVPs close at 35. I need to send the RSVP form to the chapter list by Friday. We should confirm the pizza order two days ahead.",
    }),
    base({
      title: "CAD bracket revision and FEA check",
      type: "Work Log",
      createdAt: daysAgo(now, 1, 14),
      durationSeconds: 545,
      tags: ["CAD", "FEA"],
      summary: "Thickened the bracket web after the FEA run showed stress near the bolt hole, then reran the mesh at a finer size.",
      keyPoints: [
        "Peak stress dropped from 182 MPa to 121 MPa after adding 1.5 mm to the web.",
        "Mesh size went from 2 mm to 0.8 mm around the hole.",
      ],
      actionItems: [{ text: "Ask my mentor whether the 1.5 safety factor is enough for the fatigue case", done: false }],
      transcript: "Thickened the bracket web after the FEA run showed stress near the bolt hole. Then I reran the mesh at a finer size. Peak stress dropped from 182 MPa to 121 MPa after adding 1.5 mm to the web. Mesh size went from 2 mm to 0.8 mm around the hole. I need to ask my mentor whether the 1.5 safety factor is enough for the fatigue case.",
    }),
    base({
      title: "Sensor calibration reading notes",
      type: "Research",
      createdAt: daysAgo(now, 2, 11),
      durationSeconds: 402,
      tags: ["Lab"],
      summary: "Read the thermocouple calibration guide and compared two-point and three-point calibration for the test rig.",
      keyPoints: ["Three-point calibration cut the error at 80 °C from 1.9 °C to 0.4 °C in the guide's example."],
      actionItems: [{ text: "Book the ice bath and the boiling-point setup for Thursday", done: false }],
      transcript: "I read the thermocouple calibration guide. I compared two-point and three-point calibration for the test rig. Three-point calibration cut the error at 80 degrees from 1.9 degrees to 0.4 degrees in the guide's example. I'll book the ice bath and the boiling-point setup for Thursday.",
    }),
    base({
      title: "Lab walkthrough with mentor",
      type: "Work Log",
      createdAt: daysAgo(now, 4, 16),
      durationSeconds: 1260,
      summary: "Walked through the lab safety checklist and the shared equipment calendar with my mentor.",
      keyPoints: ["The laser cutter needs a trained second person in the room."],
      actionItems: [{ text: "Finish the online safety module before Monday", done: false }],
      transcript: "Walked through the lab safety checklist and the shared equipment calendar with my mentor. The laser cutter needs a trained second person in the room. I have to finish the online safety module before Monday.",
    }),
    base({
      title: "Budget split ideas",
      type: "Brain Dump",
      createdAt: daysAgo(now, 6, 20),
      durationSeconds: 180,
      tags: ["SHPE"],
      status: "failed",
      error: "Transcription was interrupted. Record it again or add notes by hand.",
      transcript: "",
    }),
  ];
}
