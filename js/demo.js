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
      title: "Bracket vibration test log",
      type: "Work Log",
      createdAt: daysAgo(now, 0, 17),
      durationSeconds: 46,
      tags: ["Test"],
      summary: "Ran the sine sweep on the demo payload bracket; first resonance at 412 Hz, above the 300 Hz requirement. One accelerometer channel dropped out.",
      keyPoints: [
        "The first resonance came in at 412 hertz, which is above our 300 hertz requirement.",
        "One accelerometer cable came loose at the connector, so channel three has no data after the first minute.",
        "The fixture plate has its own mode near 1,800 hertz, so that peak is not the bracket.",
      ],
      actionItems: [{ text: "Add strain relief to the cable and rerun the Y axis tomorrow at 9 AM", done: false }],
      transcript: "Ran the sine sweep on the demo payload bracket this morning, from 5 to 2,000 hertz at half a g. The first resonance came in at 412 hertz, which is above our 300 hertz requirement. I torqued all four fasteners to 25 inch-pounds before the run and wrote the torque wrench number in the traveler. One accelerometer cable came loose at the connector, so channel three has no data after the first minute. I learned that the fixture plate has its own mode near 1,800 hertz, so that peak is not the bracket. Next step is to add strain relief to the cable and rerun the Y axis tomorrow at 9 AM.",
    }),
    base({
      title: "CubeSat thermal team meeting",
      type: "Meeting",
      createdAt: daysAgo(now, 0, 16),
      durationSeconds: 38,
      tags: ["CubeSat"],
      summary: "Kept the passive thermal design and dropped the heater from the baseline to save 4 watts; the heater stays as a backup option.",
      keyPoints: [
        "We decided to keep the passive thermal design and drop the heater from the baseline to save 4 watts.",
        "The battery still has to stay above 0 degrees Celsius in eclipse, so the heater stays as a backup option.",
        "The structures lead is blocked until the updated mass budget comes in.",
      ],
      actionItems: [{ text: "Thermal lead reruns the orbit-average case with the new coating by Friday", done: false }],
      transcript: "This was the weekly CubeSat team meeting with the thermal, power, and structures leads. We decided to keep the passive thermal design and drop the heater from the baseline to save 4 watts. The power lead said the battery still has to stay above 0 degrees Celsius in eclipse, so the heater stays as a backup option. Action item: the thermal lead will rerun the orbit-average case with the new coating by Friday. The structures lead is blocked until the updated mass budget comes in. Next meeting is Thursday at 6 PM.",
    }),
    base({
      title: "STAR story draft: fixture deadline",
      type: "Brain Dump",
      createdAt: daysAgo(now, 0, 15),
      durationSeconds: 40,
      tags: ["Interview"],
      summary: "Situation, task, action, and result for a fixture redesign story, with the caveat that only six trials were timed.",
      keyPoints: [
        "Situation: a fixture redesign for a demo assembly cell with a two-week deadline.",
        "Task: cut the part changeover time. Action: modeled three fixture ideas in CAD and 3D printed the best one.",
        "Result: about 5 minutes per changeover, down from about 12, but only six trials were timed.",
      ],
      actionItems: [{ text: "Turn this into a 90-second answer", done: false }],
      transcript: "This is a brain dump for a behavioral interview story. The situation was a fixture redesign for a demo assembly cell with a two-week deadline. My task was to cut the part changeover time. I timed the old process at about 12 minutes per changeover. I modeled three fixture ideas in CAD and 3D printed the best one. The result was about 5 minutes per changeover, but I only timed six trials, so I should say that. Next step is to turn this into a 90-second answer.",
    }),
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
