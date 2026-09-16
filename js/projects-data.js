// ============================================================
// PROJECTS
// Add a new project by adding an object to this array — nothing
// else needs to change, the projects page renders from this list.
// ============================================================
window.PROJECTS = [
  {
    title: "VEX Robotics AI Object Detection",
    image: "images/AI_Triball_Detection.png",
    tags: ["Computer Vision", "Jetson Nano", "Robotics"],
    description:
      "Designed a system to capture images from a camera mounted on a competition robot, running object detection on a Jetson Nano to identify game pieces in real time. The Jetson then drove the robot toward the detected object to score it in the goal. Involved gathering and labeling training data, training a detection model, and compressing it to run in real time on limited hardware.",
    link: "pdfs/AI_Vision_Report.pdf",
    linkLabel: "Read the report",
    featured: true,
  },
  {
    title: "Multi-Sense Rescue Machine Learning System",
    image: "images/Sound_Navigation.gif",
    tags: ["Machine Learning", "Audio", "Robotics"],
    description:
      "Worked in a team to replicate sound-source navigation research using a binaural microphone and onboard cameras. Simulated a multi-noise environment and had the robot plan a path and navigate toward a target sound source after training.",
    link: "pdfs/AI_Audio_Navigation_Report.pdf",
    linkLabel: "Read the report",
    featured: true,
  },
  {
    title: "VEX Drivetrain CAD & Fabrication",
    image: "",
    tags: ["CAD", "Fabrication", "VEX"],
    description:
      "Designed and fabricated a custom drivetrain for a VEX competition robot, iterating on CAD models before machining and assembling the final build.",
    link: "",
    linkLabel: "",
    featured: false,
  },
];
