// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SNS Utilities
 * @notice Helper functions for working with SNS names
 */
library SNSUtils {
    /**
     * @notice Calculate the namehash of a name
     * @dev Recursive algorithm: namehash("alice.sel") = keccak256(namehash("sel"), keccak256("alice"))
     * @param name The name to hash (e.g., "alice.sel")
     * @return The namehash
     */
    function namehash(string memory name) internal pure returns (bytes32) {
        bytes memory nameBytes = bytes(name);
        if (nameBytes.length == 0) {
            return bytes32(0);
        }
        
        // Find labels from right to left
        bytes32 node = bytes32(0);
        uint256 labelStart = nameBytes.length;
        
        for (uint256 i = nameBytes.length; i > 0; i--) {
            if (nameBytes[i - 1] == 0x2e || i == 1) { // '.' or start
                uint256 start = (nameBytes[i - 1] == 0x2e) ? i : i - 1;
                uint256 length = labelStart - start;
                
                if (nameBytes[i - 1] != 0x2e) {
                    start = i - 1;
                    length = labelStart - start;
                }
                
                bytes memory label = new bytes(length);
                for (uint256 j = 0; j < length; j++) {
                    label[j] = nameBytes[start + j];
                }
                
                node = keccak256(abi.encodePacked(node, keccak256(label)));
                labelStart = start - 1;
            }
        }
        
        return node;
    }

    /**
     * @notice Calculate the labelhash of a single label
     * @param label The label (e.g., "alice")
     * @return The keccak256 hash of the label
     */
    function labelhash(string memory label) internal pure returns (bytes32) {
        return keccak256(bytes(label));
    }

    /**
     * @notice Normalize a name to lowercase
     * @param name The name to normalize
     * @return The normalized name
     */
    function normalize(string memory name) internal pure returns (string memory) {
        bytes memory nameBytes = bytes(name);
        bytes memory result = new bytes(nameBytes.length);
        
        for (uint256 i = 0; i < nameBytes.length; i++) {
            bytes1 char = nameBytes[i];
            // Convert uppercase to lowercase (A-Z → a-z)
            if (char >= 0x41 && char <= 0x5A) {
                result[i] = bytes1(uint8(char) + 32);
            } else {
                result[i] = char;
            }
        }
        
        return string(result);
    }

    /**
     * @notice Check if a name is valid according to SNS rules
     * @param name The name to validate (without .sel suffix)
     * @return True if valid
     */
    function isValidLabel(string memory name) internal pure returns (bool) {
        bytes memory nameBytes = bytes(name);
        
        // Length check: 3-63 characters
        if (nameBytes.length < 3 || nameBytes.length > 63) {
            return false;
        }
        
        for (uint256 i = 0; i < nameBytes.length; i++) {
            bytes1 char = nameBytes[i];
            
            // Allow: a-z, 0-9, hyphen (-)
            bool isLowerAlpha = (char >= 0x61 && char <= 0x7A);
            bool isDigit = (char >= 0x30 && char <= 0x39);
            bool isHyphen = (char == 0x2D);
            
            if (!isLowerAlpha && !isDigit && !isHyphen) {
                return false;
            }
            
            // No leading or trailing hyphens
            if (isHyphen && (i == 0 || i == nameBytes.length - 1)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * @notice Split a name into labels
     * @param name The full name (e.g., "sub.alice.sel")
     * @return labels Array of labels
     */
    function splitName(string memory name) internal pure returns (string[] memory) {
        bytes memory nameBytes = bytes(name);
        
        // Count dots to determine array size
        uint256 dotCount = 0;
        for (uint256 i = 0; i < nameBytes.length; i++) {
            if (nameBytes[i] == 0x2e) dotCount++;
        }
        
        string[] memory labels = new string[](dotCount + 1);
        uint256 labelIndex = 0;
        uint256 labelStart = 0;
        
        for (uint256 i = 0; i <= nameBytes.length; i++) {
            if (i == nameBytes.length || nameBytes[i] == 0x2e) {
                uint256 labelLength = i - labelStart;
                bytes memory label = new bytes(labelLength);
                for (uint256 j = 0; j < labelLength; j++) {
                    label[j] = nameBytes[labelStart + j];
                }
                labels[labelIndex] = string(label);
                labelIndex++;
                labelStart = i + 1;
            }
        }
        
        return labels;
    }

    /**
     * @notice Get the parent of a name
     * @param name The name (e.g., "sub.alice.sel")
     * @return The parent name (e.g., "alice.sel")
     */
    function parent(string memory name) internal pure returns (string memory) {
        bytes memory nameBytes = bytes(name);
        
        // Find first dot
        for (uint256 i = 0; i < nameBytes.length; i++) {
            if (nameBytes[i] == 0x2e) {
                uint256 parentLength = nameBytes.length - i - 1;
                bytes memory parentName = new bytes(parentLength);
                for (uint256 j = 0; j < parentLength; j++) {
                    parentName[j] = nameBytes[i + 1 + j];
                }
                return string(parentName);
            }
        }
        
        return ""; // No parent (root)
    }
}
