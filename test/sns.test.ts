import { expect } from "chai";
import { ethers } from "hardhat";
import { SNSRegistry, PublicResolver, BaseRegistrar, PriceOracle, SELRegistrarController } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SNS Registry", function () {
  let registry: SNSRegistry;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  
  const ZERO_HASH = ethers.ZeroHash;
  const ZERO_ADDRESS = ethers.ZeroAddress;
  
  function namehash(name: string): string {
    if (!name) return ZERO_HASH;
    const labels = name.split(".");
    let node = ZERO_HASH;
    for (let i = labels.length - 1; i >= 0; i--) {
      const labelHash = ethers.keccak256(ethers.toUtf8Bytes(labels[i]));
      node = ethers.keccak256(ethers.concat([node, labelHash]));
    }
    return node;
  }
  
  function labelhash(label: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(label));
  }
  
  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const SNSRegistry = await ethers.getContractFactory("SNSRegistry");
    registry = await SNSRegistry.deploy();
    await registry.waitForDeployment();
  });
  
  describe("Deployment", function () {
    it("Should set the deployer as owner of root node", async function () {
      expect(await registry.owner(ZERO_HASH)).to.equal(owner.address);
    });
    
    it("Should have no resolver for root node initially", async function () {
      expect(await registry.resolver(ZERO_HASH)).to.equal(ZERO_ADDRESS);
    });
  });
  
  describe("Subnode Operations", function () {
    it("Should allow owner to create subnodes", async function () {
      const selLabel = labelhash("sel");
      await registry.setSubnodeOwner(ZERO_HASH, selLabel, addr1.address);
      
      const selNode = namehash("sel");
      expect(await registry.owner(selNode)).to.equal(addr1.address);
    });
    
    it("Should emit NewOwner event when creating subnodes", async function () {
      const selLabel = labelhash("sel");
      await expect(registry.setSubnodeOwner(ZERO_HASH, selLabel, addr1.address))
        .to.emit(registry, "NewOwner")
        .withArgs(ZERO_HASH, selLabel, addr1.address);
    });
    
    it("Should not allow non-owner to create subnodes", async function () {
      const selLabel = labelhash("sel");
      await expect(
        registry.connect(addr1).setSubnodeOwner(ZERO_HASH, selLabel, addr1.address)
      ).to.be.revertedWith("Not authorized");
    });
  });
  
  describe("Record Operations", function () {
    it("Should allow setting full record", async function () {
      const resolver = addr1.address;
      const ttl = 3600;
      
      await registry.setRecord(ZERO_HASH, addr2.address, resolver, ttl);
      
      expect(await registry.owner(ZERO_HASH)).to.equal(addr2.address);
      expect(await registry.resolver(ZERO_HASH)).to.equal(resolver);
      expect(await registry.ttl(ZERO_HASH)).to.equal(ttl);
    });
    
    it("Should return true for existing records", async function () {
      expect(await registry.recordExists(ZERO_HASH)).to.equal(true);
    });
    
    it("Should return false for non-existing records", async function () {
      const nonExistingNode = namehash("nonexistent.sel");
      expect(await registry.recordExists(nonExistingNode)).to.equal(false);
    });
  });
  
  describe("Operator Approval", function () {
    it("Should allow setting operator approval", async function () {
      await registry.setApprovalForAll(addr1.address, true);
      expect(await registry.isApprovedForAll(owner.address, addr1.address)).to.equal(true);
    });
    
    it("Should allow approved operators to manage records", async function () {
      await registry.setApprovalForAll(addr1.address, true);
      
      const selLabel = labelhash("sel");
      await registry.connect(addr1).setSubnodeOwner(ZERO_HASH, selLabel, addr2.address);
      
      expect(await registry.owner(namehash("sel"))).to.equal(addr2.address);
    });
  });
});

describe("Public Resolver", function () {
  let registry: SNSRegistry;
  let resolver: PublicResolver;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  
  const ZERO_HASH = ethers.ZeroHash;
  
  function namehash(name: string): string {
    if (!name) return ZERO_HASH;
    const labels = name.split(".");
    let node = ZERO_HASH;
    for (let i = labels.length - 1; i >= 0; i--) {
      const labelHash = ethers.keccak256(ethers.toUtf8Bytes(labels[i]));
      node = ethers.keccak256(ethers.concat([node, labelHash]));
    }
    return node;
  }
  
  function labelhash(label: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(label));
  }
  
  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    const SNSRegistry = await ethers.getContractFactory("SNSRegistry");
    registry = await SNSRegistry.deploy();
    await registry.waitForDeployment();
    
    const PublicResolver = await ethers.getContractFactory("PublicResolver");
    resolver = await PublicResolver.deploy(await registry.getAddress());
    await resolver.waitForDeployment();
    
    // Set up .sel TLD
    await registry.setSubnodeOwner(ZERO_HASH, labelhash("sel"), owner.address);
    await registry.setResolver(namehash("sel"), await resolver.getAddress());
  });
  
  describe("Address Records", function () {
    it("Should allow owner to set address", async function () {
      const node = namehash("sel");
      await resolver.setAddr(node, addr1.address);
      expect(await resolver.addr(node)).to.equal(addr1.address);
    });
    
    it("Should emit AddrChanged event", async function () {
      const node = namehash("sel");
      await expect(resolver.setAddr(node, addr1.address))
        .to.emit(resolver, "AddrChanged")
        .withArgs(node, addr1.address);
    });
  });
  
  describe("Text Records", function () {
    it("Should allow setting text records", async function () {
      const node = namehash("sel");
      await resolver.setText(node, "email", "admin@selendra.org");
      expect(await resolver.text(node, "email")).to.equal("admin@selendra.org");
    });
    
    it("Should allow multiple text records", async function () {
      const node = namehash("sel");
      await resolver.setText(node, "url", "https://selendra.org");
      await resolver.setText(node, "avatar", "https://selendra.org/logo.png");
      
      expect(await resolver.text(node, "url")).to.equal("https://selendra.org");
      expect(await resolver.text(node, "avatar")).to.equal("https://selendra.org/logo.png");
    });
  });
  
  describe("Content Hash", function () {
    it("Should allow setting content hash", async function () {
      const node = namehash("sel");
      const contentHash = ethers.toUtf8Bytes("ipfs://QmTest");
      await resolver.setContenthash(node, contentHash);
      expect(await resolver.contenthash(node)).to.equal(ethers.hexlify(contentHash));
    });
  });
  
  describe("Interface Detection", function () {
    it("Should support EIP-165", async function () {
      // EIP-165 interface ID
      expect(await resolver.supportsInterface("0x01ffc9a7")).to.equal(true);
    });
    
    it("Should support addr interface", async function () {
      // addr(bytes32) interface ID
      expect(await resolver.supportsInterface("0x3b3b57de")).to.equal(true);
    });
  });
});

describe("Price Oracle", function () {
  let priceOracle: PriceOracle;
  let owner: SignerWithAddress;
  
  const ONE_YEAR = 365 * 24 * 60 * 60;
  
  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy();
    await priceOracle.waitForDeployment();
  });
  
  describe("Pricing", function () {
    it("Should return correct price for 3-character names", async function () {
      const [base, premium] = await priceOracle.price("abc", ONE_YEAR);
      // 500 SEL per year
      expect(base).to.be.closeTo(ethers.parseEther("500"), ethers.parseEther("1"));
    });
    
    it("Should return correct price for 4-character names", async function () {
      const [base, premium] = await priceOracle.price("test", ONE_YEAR);
      // 100 SEL per year
      expect(base).to.be.closeTo(ethers.parseEther("100"), ethers.parseEther("1"));
    });
    
    it("Should return correct price for 5+ character names", async function () {
      const [base, premium] = await priceOracle.price("alice", ONE_YEAR);
      // 5 SEL per year
      expect(base).to.be.closeTo(ethers.parseEther("5"), ethers.parseEther("0.1"));
    });
    
    it("Should apply multi-year discount", async function () {
      const twoYears = 2 * ONE_YEAR;
      const [baseNoDiscount] = await priceOracle.price("alice", ONE_YEAR);
      const [baseWithDiscount] = await priceOracle.price("alice", twoYears);
      
      // 10% discount for 2+ years
      const expectedWithDiscount = (baseNoDiscount * 2n * 90n) / 100n;
      expect(baseWithDiscount).to.be.closeTo(expectedWithDiscount, ethers.parseEther("0.1"));
    });
  });
  
  describe("Price Updates", function () {
    it("Should allow owner to update prices", async function () {
      await priceOracle.setPrices(
        ethers.parseEther("1000"), // 3-char
        ethers.parseEther("200"),  // 4-char
        ethers.parseEther("10")    // 5+-char
      );
      
      const [prices] = await priceOracle.getPrices();
      // Verify 3-char price updated
      const [base] = await priceOracle.price("abc", ONE_YEAR);
      expect(base).to.be.closeTo(ethers.parseEther("1000"), ethers.parseEther("1"));
    });
  });
});
