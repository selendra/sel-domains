import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: "🏠",
    title: "Human-Readable",
    description:
      "Replace complex addresses like 0x742d35Cc... with simple names like alice.sel",
  },
  {
    icon: "🔗",
    title: "Multi-Chain Ready",
    description:
      "Single name resolves to both EVM (0x...) and Substrate (5G...) addresses",
  },
  {
    icon: "🎨",
    title: "NFT Ownership",
    description:
      "Your domain is an ERC-721 NFT — trade it, transfer it, or hold it forever",
  },
  {
    icon: "📝",
    title: "Rich Profiles",
    description:
      "Store avatar, website, social links, and more in your domain records",
  },
  {
    icon: "🔒",
    title: "Decentralized",
    description:
      "Fully on-chain, censorship-resistant, and controlled only by you",
  },
  {
    icon: "🇰🇭",
    title: "Cambodia First",
    description:
      "Built for Cambodia's digital economy, supporting local identity infrastructure",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-white px-4 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Why .sel Domains?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            More than just a name — your decentralized identity on Selendra
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-gray-100 bg-gray-50 transition-shadow hover:shadow-md"
            >
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#b3f0ea] text-2xl">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
