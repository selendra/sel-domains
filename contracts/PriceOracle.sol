// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SNS Price Oracle
 * @notice Provides pricing for .sel domain registrations
 * @dev Prices are based on name length and denominated in SEL
 * 
 * Pricing tiers:
 * - 3 characters: 500 SEL/year (premium short names)
 * - 4 characters: 100 SEL/year
 * - 5+ characters: 5 SEL/year (standard names)
 */
contract PriceOracle is Ownable {
    // Price per second for each tier (in wei)
    // These are calculated as: price_per_year / 31536000 (seconds per year)
    uint256 public price3Char;  // 3-character names
    uint256 public price4Char;  // 4-character names
    uint256 public price5PlusChar;  // 5+ character names
    
    // Premium names with custom pricing
    mapping(string => uint256) public premiumPrices;
    
    // Discount for multi-year registrations (percentage off, 0-100)
    uint256 public multiYearDiscount = 10; // 10% off for 2+ years
    
    // Events
    event PricesUpdated(uint256 price3, uint256 price4, uint256 price5Plus);
    event PremiumPriceSet(string indexed name, uint256 price);
    event DiscountUpdated(uint256 discount);
    
    /**
     * @notice Constructor - set initial prices in SEL
     * @dev Prices are per year, stored as wei equivalent
     */
    constructor() Ownable(msg.sender) {
        // Initial prices (in wei, 18 decimals)
        // 1000 SEL per year for 3-char (~$10/year)
        price3Char = uint256(1000 ether) / 31536000;
        
        // 250 SEL per year for 4-char (~$2.50/year)
        price4Char = uint256(250 ether) / 31536000;
        
        // 50 SEL per year for 5+ char (~$0.50/year)
        price5PlusChar = uint256(50 ether) / 31536000;
    }
    
    /**
     * @notice Get the registration price for a name
     * @param name The name to price (without .sel)
     * @param duration Registration duration in seconds
     * @return base The base price in wei
     * @return premium Any premium price addition
     */
    function price(
        string calldata name,
        uint256 duration
    ) external view returns (uint256 base, uint256 premium) {
        uint256 len = bytes(name).length;
        require(len >= 3, "Name too short");
        
        uint256 basePrice;
        if (len == 3) {
            basePrice = price3Char * duration;
        } else if (len == 4) {
            basePrice = price4Char * duration;
        } else {
            basePrice = price5PlusChar * duration;
        }
        
        // Apply multi-year discount for 2+ years
        if (duration >= 2 * 365 days) {
            basePrice = basePrice * (100 - multiYearDiscount) / 100;
        }
        
        // Check for premium pricing
        uint256 premiumPrice = premiumPrices[_toLower(name)];
        
        return (basePrice, premiumPrice);
    }
    
    /**
     * @notice Get renewal price (no premium)
     * @param name The name to price
     * @param duration Renewal duration in seconds
     * @return The renewal price in wei
     */
    function renewalPrice(
        string calldata name,
        uint256 duration
    ) external view returns (uint256) {
        uint256 len = bytes(name).length;
        require(len >= 3, "Name too short");
        
        uint256 basePrice;
        if (len == 3) {
            basePrice = price3Char * duration;
        } else if (len == 4) {
            basePrice = price4Char * duration;
        } else {
            basePrice = price5PlusChar * duration;
        }
        
        // Apply multi-year discount
        if (duration >= 2 * 365 days) {
            basePrice = basePrice * (100 - multiYearDiscount) / 100;
        }
        
        return basePrice;
    }
    
    /**
     * @notice Get prices for each tier (per year)
     */
    function getPrices() external view returns (
        uint256 threeChar,
        uint256 fourChar,
        uint256 fivePlusChar
    ) {
        return (
            price3Char * 31536000,  // Convert back to per-year
            price4Char * 31536000,
            price5PlusChar * 31536000
        );
    }
    
    /**
     * @notice Update base prices
     * @param _price3Char Price for 3-char names (per year, in wei)
     * @param _price4Char Price for 4-char names (per year, in wei)
     * @param _price5PlusChar Price for 5+ char names (per year, in wei)
     */
    function setPrices(
        uint256 _price3Char,
        uint256 _price4Char,
        uint256 _price5PlusChar
    ) external onlyOwner {
        price3Char = _price3Char / 31536000;
        price4Char = _price4Char / 31536000;
        price5PlusChar = _price5PlusChar / 31536000;
        
        emit PricesUpdated(_price3Char, _price4Char, _price5PlusChar);
    }
    
    /**
     * @notice Set premium price for a specific name
     * @param name The premium name
     * @param _price The premium price (one-time addition)
     */
    function setPremiumPrice(string calldata name, uint256 _price) external onlyOwner {
        premiumPrices[_toLower(name)] = _price;
        emit PremiumPriceSet(name, _price);
    }
    
    /**
     * @notice Batch set premium prices
     * @param names Array of names
     * @param prices Array of prices
     */
    function setPremiumPrices(
        string[] calldata names,
        uint256[] calldata prices
    ) external onlyOwner {
        require(names.length == prices.length, "Length mismatch");
        
        for (uint256 i = 0; i < names.length; i++) {
            premiumPrices[_toLower(names[i])] = prices[i];
            emit PremiumPriceSet(names[i], prices[i]);
        }
    }
    
    /**
     * @notice Update multi-year discount
     * @param _discount Discount percentage (0-50)
     */
    function setMultiYearDiscount(uint256 _discount) external onlyOwner {
        require(_discount <= 50, "Discount too high");
        multiYearDiscount = _discount;
        emit DiscountUpdated(_discount);
    }
    
    /**
     * @notice Convert string to lowercase
     */
    function _toLower(string calldata str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        
        for (uint256 i = 0; i < bStr.length; i++) {
            if (bStr[i] >= 0x41 && bStr[i] <= 0x5A) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        
        return string(bLower);
    }
}
