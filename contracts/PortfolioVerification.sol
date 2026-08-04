// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PortfolioVerification
 * @notice Immutable anchor for portfolio document + project fingerprints.
 *         Only hashes and small metadata are stored on-chain; the files
 *         themselves live on IPFS. Registrations are append-only and a
 *         given hash can never be registered twice (replay protection).
 */
contract PortfolioVerification is Ownable, Pausable {
    struct Record {
        bytes32 docHash;      // SHA-256 of the original file
        string ipfsCid;       // IPFS content identifier
        string subjectType;   // resume | certificate | project | ...
        string subjectRef;    // stable app-side identifier
        uint64 timestamp;     // block timestamp of registration
        uint32 version;       // document version for this subjectRef
        address issuer;       // signer wallet
        bool exists;
    }

    mapping(bytes32 => Record) private _records;
    mapping(string => uint32) private _versions;
    bytes32[] private _hashes;

    event DocumentRegistered(
        bytes32 indexed docHash,
        string subjectType,
        string subjectRef,
        string ipfsCid,
        uint32 version,
        address indexed issuer,
        uint64 timestamp
    );
    event DocumentRevoked(bytes32 indexed docHash, address indexed issuer);

    error AlreadyRegistered(bytes32 docHash);
    error UnknownRecord(bytes32 docHash);
    error EmptyHash();

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Anchor a document fingerprint on-chain. Owner-only, gas-optimised.
    function registerDocument(
        bytes32 docHash,
        string calldata ipfsCid,
        string calldata subjectType,
        string calldata subjectRef
    ) external onlyOwner whenNotPaused returns (uint32 version) {
        if (docHash == bytes32(0)) revert EmptyHash();
        if (_records[docHash].exists) revert AlreadyRegistered(docHash);

        unchecked {
            version = ++_versions[subjectRef];
        }

        _records[docHash] = Record({
            docHash: docHash,
            ipfsCid: ipfsCid,
            subjectType: subjectType,
            subjectRef: subjectRef,
            timestamp: uint64(block.timestamp),
            version: version,
            issuer: msg.sender,
            exists: true
        });
        _hashes.push(docHash);

        emit DocumentRegistered(
            docHash, subjectType, subjectRef, ipfsCid, version, msg.sender, uint64(block.timestamp)
        );
    }

    /// @notice Public, gas-free authenticity check.
    function verify(bytes32 docHash) external view returns (bool authentic, Record memory record) {
        record = _records[docHash];
        authentic = record.exists;
    }

    function getRecord(bytes32 docHash) external view returns (Record memory) {
        Record memory r = _records[docHash];
        if (!r.exists) revert UnknownRecord(docHash);
        return r;
    }

    function totalRecords() external view returns (uint256) {
        return _hashes.length;
    }

    function hashAt(uint256 index) external view returns (bytes32) {
        return _hashes[index];
    }

    function currentVersion(string calldata subjectRef) external view returns (uint32) {
        return _versions[subjectRef];
    }

    function revoke(bytes32 docHash) external onlyOwner {
        if (!_records[docHash].exists) revert UnknownRecord(docHash);
        _records[docHash].exists = false;
        emit DocumentRevoked(docHash, msg.sender);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
