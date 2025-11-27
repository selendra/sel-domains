const steps = [
  {
    number: 1,
    title: "Search",
    description: "Enter your desired name and check if it's available",
  },
  {
    number: 2,
    title: "Commit",
    description:
      "Submit a commitment to prevent front-running (wait 60 seconds)",
  },
  {
    number: 3,
    title: "Register",
    description: "Complete registration and pay with SEL",
  },
  {
    number: 4,
    title: "Configure",
    description: "Set your addresses, profile, and other records",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-white px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="text-lg text-gray-600">
            Get your .sel domain in minutes
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#0db0a4] text-xl font-bold text-white">
                {step.number}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {step.title}
              </h3>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
