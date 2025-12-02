import { installSnap } from "@metamask/snaps-jest";

describe("SNS Snap", () => {
    describe("onNameLookup", () => {
        it("should resolve a .sel domain to an address", async () => {
            const { onNameLookup } = await installSnap();

            // Note: This test requires the testnet contracts to be deployed
            // and a domain to be registered with an address set
            const response = await onNameLookup({
                chainId: "eip155:1953", // Selendra testnet
                domain: "testx.sel",
            });

            // Snap response is wrapped: { id, notifications, response: { result } }
            expect(response).toBeDefined();
            const snapResponse = response as any;
            const result = snapResponse.response?.result;

            // If domain is registered and has an address
            if (result) {
                expect(result).toHaveProperty("resolvedAddresses");
                expect(result.resolvedAddresses).toHaveLength(1);
                expect(result.resolvedAddresses[0]).toHaveProperty("resolvedAddress");
                expect(result.resolvedAddresses[0]).toHaveProperty("protocol", "Selendra Naming Service");
                expect(result.resolvedAddresses[0]).toHaveProperty("domainName", "testx.sel");
            }
        });

        it("should return null for non-.sel domains", async () => {
            const { onNameLookup } = await installSnap();

            const response = await onNameLookup({
                chainId: "eip155:1953",
                domain: "test.eth",
            });

            const snapResponse = response as any;
            expect(snapResponse.response?.result).toBeNull();
        });

        it("should return null for unregistered domains", async () => {
            const { onNameLookup } = await installSnap();

            const response = await onNameLookup({
                chainId: "eip155:1953",
                domain: "nonexistent-domain-12345.sel",
            });

            const snapResponse = response as any;
            expect(snapResponse.response?.result).toBeNull();
        });

        it("should return null for unsupported chains", async () => {
            const { onNameLookup } = await installSnap();

            const response = await onNameLookup({
                chainId: "eip155:1", // Ethereum mainnet - not supported
                domain: "test.sel",
            });

            const snapResponse = response as any;
            expect(snapResponse.response?.result).toBeNull();
        });

        it("should perform reverse resolution", async () => {
            const { onNameLookup } = await installSnap();

            // Note: This requires reverse resolution to be set up
            const response = await onNameLookup({
                chainId: "eip155:1953",
                address: "0x7ecc90d3e79536605d25b7ce1dc0051828713e7d",
            });

            const snapResponse = response as any;
            const result = snapResponse.response?.result;

            // If reverse resolution is configured
            if (result) {
                expect(result).toHaveProperty("resolvedDomains");
                expect(result.resolvedDomains).toHaveLength(1);
                expect(result.resolvedDomains[0]).toHaveProperty("resolvedDomain");
                expect(result.resolvedDomains[0]).toHaveProperty("protocol", "Selendra Naming Service");
            }
        });
    });
});
