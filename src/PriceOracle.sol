// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISNSErrors.sol";

/**
 * @title SNS Price Oracle
 * @author Selendra Team
 * @notice Provides pricing for .sel domain registrations
 * @dev Prices are based on name length and denominated in SEL (native token).
 *      All prices are stored as wei per second and calculated on duration.
 * 
 * @custom:security-contact security@selendra.org
 * 
 * Pricing tiers (per year):
 * - 3 characters: 1000 SEL (premium short names)
 * - 4 characters: 250 SEL
 * - 5+ characters: 50 SEL (standard names)
 * 
 * Features:
 * - Length-based pricing tiers
 * - Premium pricing for specific names
 * - Multi-year discount (default 10%)
 */
contract PriceOracle is Ownable {
    /// @notice Price per second for 3-character names (in wei)
    uint256 public price3Char;
    
    /// @notice Price per second for 4-character names (in wei)
    uint256 public price4Char;
    
    /// @notice Price per second for 5+ character names (in wei)
    uint256 public price5PlusChar;
    
    /// @notice Premium names with custom one-time pricing
    mapping(string => uint256) public premiumPrices;
    
    /// @notice Discount for multi-year registrations (percentage off, 0-50)
    uint256 public multiYearDiscount = 10;
    
    /// @notice Seconds per year constant for price calculations
    uint256 private constant SECONDS_PER_YEAR = 31536000;
    
    // Events
    event PricesUpdated(uint256 price3, uint256 price4, uint256 price5Plus);
    event PremiumPriceSet(string indexed name, uint256 price);
    event DiscountUpdated(uint256 discount);
    
    /**
     * @notice Initialize the price oracle with default prices
     * @dev Prices are stored as wei per second (price_per_year / SECONDS_PER_YEAR)
     */
    constructor() Ownable(msg.sender) {
        // Initial prices (in wei, 18 decimals)
        // 1000 SEL per year for 3-char (~$10/year)
        price3Char = uint256(1000 ether) / SECONDS_PER_YEAR;
        
        // 250 SEL per year for 4-char (~$2.50/year)
        price4Char = uint256(250 ether) / SECONDS_PER_YEAR;
        
        // 50 SEL per year for 5+ char (~$0.50/year)
        price5PlusChar = uint256(50 ether) / SECONDS_PER_YEAR;
    }
    
    /**
     * @notice Get the registration price for a name
     * @dev Returns base price (duration-based) and premium (one-time addition)
     * @param name The name to price (without .sel)
     * @param duration Registration duration in seconds
     * @return base The base price in wei
     * @return premium Any premium price addition (one-time)
     */
    function price(
        string calldata name,
        uint256 duration
    ) external view returns (uint256 base, uint256 premium) {
        uint256 len = bytes(name).length;
        if (len < 3) {
            revert SNS_NameTooShort(name, len, 3);
        }
        
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
     * @dev Renewals don't include premium pricing, only base duration cost
     * @param name The name to price
     * @param duration Renewal duration in seconds
     * @return The renewal price in wei
     */
    function renewalPrice(
        string calldata name,
        uint256 duration
    ) external view returns (uint256) {
        uint256 len = bytes(name).length;
        if (len < 3) {
            revert SNS_NameTooShort(name, len, 3);
        }
        
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
     * @return threeChar Annual price for 3-char names in wei
     * @return fourChar Annual price for 4-char names in wei
     * @return fivePlusChar Annual price for 5+ char names in wei
     */
    function getPrices() external view returns (
        uint256 threeChar,
        uint256 fourChar,
        uint256 fivePlusChar
    ) {
        return (
            price3Char * SECONDS_PER_YEAR,
            price4Char * SECONDS_PER_YEAR,
            price5PlusChar * SECONDS_PER_YEAR
        );
    }
    
    /**
     * @notice Update base prices
     * @dev Prices are converted from per-year to per-second for storage
     * @param _price3Char Price for 3-char names (per year, in wei)
     * @param _price4Char Price for 4-char names (per year, in wei)
     * @param _price5PlusChar Price for 5+ char names (per year, in wei)
     */
    function setPrices(
        uint256 _price3Char,
        uint256 _price4Char,
        uint256 _price5PlusChar
    ) external onlyOwner {
        price3Char = _price3Char / SECONDS_PER_YEAR;
        price4Char = _price4Char / SECONDS_PER_YEAR;
        price5PlusChar = _price5PlusChar / SECONDS_PER_YEAR;
        
        emit PricesUpdated(_price3Char, _price4Char, _price5PlusChar);
    }
    
    /**
     * @notice Set premium price for a specific name
     * @dev Premium is a one-time addition to the base price
     * @param name The premium name
     * @param _price The premium price (one-time addition in wei)
     */
    function setPremiumPrice(string calldata name, uint256 _price) external onlyOwner {
        premiumPrices[_toLower(name)] = _price;
        emit PremiumPriceSet(name, _price);
    }
    
    /**
     * @notice Batch set premium prices
     * @dev Arrays must be same length
     * @param names Array of names
     * @param prices Array of prices (one-time additions in wei)
     */
    function setPremiumPrices(
        string[] calldata names,
        uint256[] calldata prices
    ) external onlyOwner {
        uint256 len = names.length;
        if (len != prices.length) {
            revert SNS_ArrayLengthMismatch(len, prices.length);
        }
        
        for (uint256 i = 0; i < len; ) {
            premiumPrices[_toLower(names[i])] = prices[i];
            emit PremiumPriceSet(names[i], prices[i]);
            unchecked { ++i; }
        }
    }
    
    /**
     * @notice Update multi-year discount
     * @dev Discount is applied for registrations of 2+ years
     * @param _discount Discount percentage (0-50)
     */
    function setMultiYearDiscount(uint256 _discount) external onlyOwner {
        if (_discount > 50) {
            revert SNS_DiscountTooHigh(_discount, 50);
        }
        multiYearDiscount = _discount;
        emit DiscountUpdated(_discount);
    }
    
    /**
     * @notice Convert string to lowercase
     * @dev Used for case-insensitive premium name lookup
     * @param str The string to convert
     * @return The lowercase string
     */
    function _toLower(string calldata str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        uint256 len = bStr.length;
        bytes memory bLower = new bytes(len);
        
        for (uint256 i = 0; i < len; ) {
            if (bStr[i] >= 0x41 && bStr[i] <= 0x5A) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
            unchecked { ++i; }
        }
        
        return string(bLower);
    }
}
